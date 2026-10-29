import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { fechaISOValida } from "@/lib/fechaChile";
import { HORARIOS } from "@/lib/horarios";
import { horariosParaProfesional, idValido } from "@/lib/profesionales";

export const dynamic = "force-dynamic";
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get("fecha");
    const profesionalId = searchParams.get("profesionalId");
    const servicioId = searchParams.get("servicioId");
    const ignorarReservaId = searchParams.get("ignorarReservaId");
    if (!fechaISOValida(fecha)) return Response.json({ ok: false, mensaje: "Indica una fecha válida." }, { status: 400 });
    if (!idValido(profesionalId) || !idValido(servicioId)) return Response.json({ ok: false, mensaje: "Selecciona un profesional y servicio." }, { status: 400 });
    // No aceptar exclusiones arbitrarias desde el cliente: se utiliza solo en la API de gestión interna.
    if (ignorarReservaId) return Response.json({ ok: false, mensaje: "Parámetro no admitido." }, { status: 400 });
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    const [profesional, servicio] = await Promise.all([
      db.collection("usuarios").findOne({ _id: new ObjectId(profesionalId), activo: { $ne: false }, $or: [{ roles: "profesional" }, { rol: "profesional" }] }),
      db.collection("servicios").findOne({ _id: new ObjectId(servicioId), activo: { $ne: false } }),
    ]);
    if (!profesional || !servicio) return Response.json({ ok: false, mensaje: "Profesional o servicio no disponible." }, { status: 404 });
    const disponibles = await horariosParaProfesional(db, { profesional, servicio, fecha });
    return Response.json({ ok: true, fecha, horariosDisponibles: disponibles, horasOcupadas: HORARIOS.filter(h => !disponibles.includes(h)), totalDisponibles: disponibles.length });
  } catch (error) {
    console.error("Error obteniendo disponibilidad:", error);
    return Response.json({ ok: false, mensaje: "No fue posible obtener la disponibilidad." }, { status: 500 });
  }
}
