import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";
import { validarServicio } from "@/lib/validarServicio";

export async function PATCH(request, { params }) {
  try {
    if (!await obtenerUsuarioAdmin()) return Response.json({ ok: false, mensaje: "Acceso no autorizado." }, { status: 403 });
    const { id } = await params;
    if (!ObjectId.isValid(id) || !/^[a-f\d]{24}$/i.test(id)) return Response.json({ ok: false, mensaje: "ID inválido." }, { status: 400 });
    const { campos, error } = validarServicio(await request.json(), true);
    if (error) return Response.json({ ok: false, mensaje: error }, { status: 400 });
    const col = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria").collection("servicios");
    const actual = await col.findOne({ _id: new ObjectId(id) });
    if (!actual) return Response.json({ ok: false, mensaje: "Servicio no encontrado." }, { status: 404 });
    await col.updateOne({ _id: actual._id }, { $set: { ...campos, fechaActualizacion: new Date() } });
    return Response.json({ ok: true, mensaje: "Servicio actualizado." });
  } catch (error) { console.error("Error actualizando servicio:", error); return Response.json({ ok: false, mensaje: "No se pudo actualizar el servicio." }, { status: 500 }); }
}


// La eliminación definitiva se permite solo para servicios sin reservas históricas.
// Los profesionales pueden tener asignaciones a servicios que ya no ofrecen.
export async function DELETE(_request, { params }) {
  try {
    if (!await obtenerUsuarioAdmin()) {
      return Response.json({ ok: false, mensaje: "Acceso no autorizado." }, { status: 403 });
    }
    const { id } = await params;
    if (!ObjectId.isValid(id) || !/^[a-f\d]{24}$/i.test(id)) {
      return Response.json({ ok: false, mensaje: "ID inválido." }, { status: 400 });
    }

    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    const servicioId = new ObjectId(id);
    const servicio = await db.collection("servicios").findOne({ _id: servicioId });
    if (!servicio) {
      return Response.json({ ok: false, mensaje: "Servicio no encontrado." }, { status: 404 });
    }

    // Se revisan ObjectId y string por compatibilidad con reservas antiguas.
    const reserva = await db.collection("reservas").findOne(
      { servicioId: { $in: [servicioId, id] } },
      { projection: { _id: 1 } }
    );
    if (reserva) {
      return Response.json({
        ok: false,
        mensaje: "Este servicio tiene reservas asociadas y no se puede eliminar definitivamente. Puedes desactivarlo para ocultarlo del catálogo."
      }, { status: 409 });
    }

    const resultado = await db.collection("servicios").deleteOne({ _id: servicioId });
    if (!resultado.deletedCount) {
      return Response.json({ ok: false, mensaje: "El servicio ya no existe." }, { status: 404 });
    }

    // Evita referencias a un servicio inexistente en las asignaciones.
    await db.collection("usuarios").updateMany(
      { serviciosIds: { $in: [id, servicioId] } },
      { $pull: { serviciosIds: { $in: [id, servicioId] } } }
    );
    return Response.json({ ok: true, mensaje: "Servicio eliminado definitivamente." });
  } catch (error) {
    console.error("Error eliminando servicio:", error);
    return Response.json({ ok: false, mensaje: "No se pudo eliminar el servicio." }, { status: 500 });
  }
}
