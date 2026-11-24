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
    if (campos.codigo && campos.codigo !== actual.codigo && await col.findOne({ codigo: campos.codigo, _id: { $ne: actual._id } })) return Response.json({ ok: false, mensaje: "Ya existe un servicio con ese código." }, { status: 409 });
    await col.updateOne({ _id: actual._id }, { $set: { ...campos, fechaActualizacion: new Date() } });
    return Response.json({ ok: true, mensaje: "Servicio actualizado." });
  } catch (error) { console.error("Error actualizando servicio:", error); return Response.json({ ok: false, mensaje: "No se pudo actualizar el servicio." }, { status: 500 }); }
}
