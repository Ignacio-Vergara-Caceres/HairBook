import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";
import { crearHashContrasena, normalizarRut, obtenerRolesUsuario } from "@/lib/auth";
import { idValido, rutChilenoValido } from "@/lib/profesionales";
import { ObjectId } from "mongodb";

export const dynamic = "force-dynamic";
function respuestaProfesional(p) {
  return { id: String(p._id), nombre: p.nombre, rut: p.rut, especialidad: p.especialidad || "", serviciosIds: p.serviciosIds || [], activo: p.activo !== false, roles: obtenerRolesUsuario(p) };
}
function validarServicios(valor) {
  return Array.isArray(valor) && valor.every(idValido) && valor.length === new Set(valor).size;
}
export async function GET() {
  try {
    if (!await obtenerUsuarioAdmin()) return Response.json({ ok: false, mensaje: "Acceso no autorizado." }, { status: 403 });
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    const datos = await db.collection("usuarios").find({ $or: [{ roles: "profesional" }, { rol: "profesional" }] }).sort({ nombre: 1 }).toArray();
    return Response.json({ ok: true, datos: datos.map(respuestaProfesional) });
  } catch (error) {
    console.error("Error listando profesionales (admin):", error);
    return Response.json({ ok: false, mensaje: "No se pudieron obtener los profesionales." }, { status: 500 });
  }
}
export async function POST(request) {
  try {
    if (!await obtenerUsuarioAdmin()) return Response.json({ ok: false, mensaje: "Acceso no autorizado." }, { status: 403 });
    const body = await request.json();
    const nombre = typeof body.nombre === "string" ? body.nombre.trim() : "";
    const rut = normalizarRut(body.rut || "");
    const especialidad = typeof body.especialidad === "string" ? body.especialidad.trim().slice(0, 120) : "";
    const contrasena = body.contrasena;
    if (nombre.length < 3 || nombre.length > 120 || !rutChilenoValido(rut) || typeof contrasena !== "string" || contrasena.length < 8 || contrasena.length > 128 || !validarServicios(body.serviciosIds)) {
      return Response.json({ ok: false, mensaje: "Revisa nombre, RUT válido, contraseña de al menos 8 caracteres y servicios asignados." }, { status: 400 });
    }
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    if (await db.collection("usuarios").findOne({ rut })) return Response.json({ ok: false, mensaje: "Ya existe una cuenta con ese RUT." }, { status: 409 });
    const cantidadServicios = await db.collection("servicios").countDocuments({ _id: { $in: body.serviciosIds.map(id => new ObjectId(id)) }, activo: { $ne: false } });
    if (cantidadServicios !== body.serviciosIds.length) return Response.json({ ok: false, mensaje: "Algunos servicios no existen o están desactivados." }, { status: 400 });
    const { salt, hash } = crearHashContrasena(contrasena);
    const doc = { nombre, rut, especialidad, serviciosIds: body.serviciosIds, roles: ["profesional"], activo: true, passwordSalt: salt, passwordHash: hash, bloqueos: [], fechaCreacion: new Date() };
    const insertado = await db.collection("usuarios").insertOne(doc);
    return Response.json({ ok: true, profesional: respuestaProfesional({ ...doc, _id: insertado.insertedId }) }, { status: 201 });
  } catch (error) {
    console.error("Error creando profesional:", error);
    return Response.json({ ok: false, mensaje: "No se pudo crear el profesional." }, { status: 500 });
  }
}
