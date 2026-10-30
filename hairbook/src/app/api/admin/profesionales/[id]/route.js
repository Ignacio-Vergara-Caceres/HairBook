import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";
import { crearHashContrasena } from "@/lib/auth";
import { idValido } from "@/lib/profesionales";

export async function PATCH(request, { params }) {
  try {
    if (!await obtenerUsuarioAdmin()) return Response.json({ ok: false, mensaje: "Acceso no autorizado." }, { status: 403 });
    const { id } = await params;
    if (!idValido(id)) return Response.json({ ok: false, mensaje: "ID inválido." }, { status: 400 });
    const body = await request.json();
    const campos = {};
    if (Object.hasOwn(body, "nombre")) {
      if (typeof body.nombre !== "string" || body.nombre.trim().length < 3 || body.nombre.trim().length > 120) return Response.json({ ok: false, mensaje: "Nombre inválido." }, { status: 400 });
      campos.nombre = body.nombre.trim();
    }
    if (Object.hasOwn(body, "especialidad")) {
      if (typeof body.especialidad !== "string" || body.especialidad.length > 120) return Response.json({ ok: false, mensaje: "Especialidad inválida." }, { status: 400 });
      campos.especialidad = body.especialidad.trim();
    }
    if (Object.hasOwn(body, "activo")) {
      if (typeof body.activo !== "boolean") return Response.json({ ok: false, mensaje: "Estado inválido." }, { status: 400 });
      campos.activo = body.activo;
    }
    if (Object.hasOwn(body, "contrasena")) {
      if (typeof body.contrasena !== "string" || body.contrasena.length < 8 || body.contrasena.length > 128) return Response.json({ ok: false, mensaje: "La nueva contraseña debe tener entre 8 y 128 caracteres." }, { status: 400 });
      const { salt, hash } = crearHashContrasena(body.contrasena);
      campos.passwordSalt = salt;
      campos.passwordHash = hash;
    }
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    if (Object.hasOwn(body, "serviciosIds")) {
      if (!Array.isArray(body.serviciosIds) || body.serviciosIds.some(id => !idValido(id)) || new Set(body.serviciosIds).size !== body.serviciosIds.length) return Response.json({ ok: false, mensaje: "Servicios inválidos." }, { status: 400 });
      const validos = await db.collection("servicios").countDocuments({ _id: { $in: body.serviciosIds.map(id => new ObjectId(id)) }, activo: { $ne: false } });
      if (validos !== body.serviciosIds.length) return Response.json({ ok: false, mensaje: "Servicios no disponibles." }, { status: 400 });
      campos.serviciosIds = body.serviciosIds;
    }
    if (!Object.keys(campos).length) return Response.json({ ok: false, mensaje: "No hay cambios." }, { status: 400 });
    campos.fechaActualizacion = new Date();
    const actualizacion = { $set: campos };
    if (campos.passwordHash) actualizacion.$inc = { authVersion: 1 };
    const resultado = await db.collection("usuarios").updateOne({ _id: new ObjectId(id), $or: [{ roles: "profesional" }, { rol: "profesional" }] }, actualizacion);
    if (!resultado.matchedCount) return Response.json({ ok: false, mensaje: "Profesional no encontrado." }, { status: 404 });
    return Response.json({ ok: true, mensaje: "Profesional actualizado." });
  } catch (error) {
    console.error("Error actualizando profesional:", error);
    return Response.json({ ok: false, mensaje: "No se pudo actualizar." }, { status: 500 });
  }
}
