import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioProfesional } from "@/lib/session";
import { fechaISOValida } from "@/lib/fechaChile";
import { HORARIOS } from "@/lib/horarios";
import { seSolapan, horarioSemanalPermite } from "@/lib/profesionales";

export const dynamic = "force-dynamic";
const agendaDefault = () => Object.fromEntries(Array.from({ length: 7 }, (_, dia) => [String(dia), [...HORARIOS]]));
export async function GET() {
  try {
    const usuario = await obtenerUsuarioProfesional();
    if (!usuario) return Response.json({ ok: false, mensaje: "No autorizado." }, { status: 403 });
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    const pro = await db.collection("usuarios").findOne({ _id: new ObjectId(usuario.id) }, { projection: { bloqueos: 1, horariosSemanales: 1 } });
    return Response.json({ ok: true, bloqueos: pro?.bloqueos || [], horarios: HORARIOS, horariosSemanales: pro?.horariosSemanales || agendaDefault() });
  } catch (error) {
    console.error("Error leyendo bloqueos:", error);
    return Response.json({ ok: false, mensaje: "No fue posible cargar disponibilidad." }, { status: 500 });
  }
}
export async function PUT(request) {
  try {
    const usuario = await obtenerUsuarioProfesional();
    if (!usuario) return Response.json({ ok: false, mensaje: "No autorizado." }, { status: 403 });
    const body = await request.json();
    if (!body.horariosSemanales || typeof body.horariosSemanales !== "object" || Array.isArray(body.horariosSemanales) || Object.keys(body.horariosSemanales).sort().join(",") !== "0,1,2,3,4,5,6" ||
      Object.values(body.horariosSemanales).some(horas => !Array.isArray(horas) || horas.some(h => !HORARIOS.includes(h)) || new Set(horas).size !== horas.length)) {
      return Response.json({ ok: false, mensaje: "Los días y horas semanales no son válidos." }, { status: 400 });
    }
    if (!Array.isArray(body.bloqueos) || body.bloqueos.length > 120 || body.bloqueos.some(b => !b || !fechaISOValida(b.fecha) || !Array.isArray(b.horas) || b.horas.some(h => !HORARIOS.includes(h)))) {
      return Response.json({ ok: false, mensaje: "Los bloqueos enviados no son válidos." }, { status: 400 });
    }
    const fechas = body.bloqueos.map(b => b.fecha);
    if (new Set(fechas).size !== fechas.length) return Response.json({ ok: false, mensaje: "Hay fechas repetidas." }, { status: 400 });
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    // No se permite bloquear un horario que ya contiene una reserva activa.
    const hoyChile = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
    const reservas = await db.collection("reservas").find({ profesionalId: new ObjectId(usuario.id), estado: { $nin: ["cancelada", "rechazada"] }, fecha: { $gte: hoyChile } }, { projection: { fecha: 1, hora: 1, duracionMin: 1, servicioId: 1 } }).toArray();
    const idsServicios = [...new Set(reservas.filter(r => !r.duracionMin && r.servicioId).map(r => String(r.servicioId)))];
    const servicios = idsServicios.length ? await db.collection("servicios").find({ _id: { $in: idsServicios.map(id => new ObjectId(id)) } }, { projection: { duracionMin: 1 } }).toArray() : [];
    const duraciones = new Map(servicios.map(s => [String(s._id), s.duracionMin]));
    if (reservas.some(r => !horarioSemanalPermite({ horariosSemanales: body.horariosSemanales }, r.fecha, r.hora, r.duracionMin || duraciones.get(String(r.servicioId)) || 60))) {
      return Response.json({ ok: false, mensaje: "Los horarios semanales nuevos afectan reservas activas. Reprográmalas primero." }, { status: 409 });
    }
    if (reservas.some(r => body.bloqueos.some(b => b.fecha === r.fecha && (!b.horas.length || b.horas.some(h => seSolapan(r.hora, r.duracionMin || duraciones.get(String(r.servicioId)) || 60, h, 60)))))) {
      return Response.json({ ok: false, mensaje: "Hay reservas activas en esos horarios. Reprográmalas antes de bloquearlos." }, { status: 409 });
    }
    await db.collection("usuarios").updateOne({ _id: new ObjectId(usuario.id) }, { $set: { bloqueos: body.bloqueos, horariosSemanales: body.horariosSemanales, fechaActualizacion: new Date() } });
    return Response.json({ ok: true, mensaje: "Disponibilidad actualizada." });
  } catch (error) {
    console.error("Error guardando bloqueos:", error);
    return Response.json({ ok: false, mensaje: "No fue posible actualizar disponibilidad." }, { status: 500 });
  }
}
