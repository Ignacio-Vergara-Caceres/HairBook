import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";
import { ventanaAtencionAbierta } from "@/lib/whatsappInbox";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    if (!await obtenerUsuarioAdmin()) return Response.json({ ok: false, mensaje: "No autorizado." }, { status: 403 });
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    const conversaciones = await db.collection("whatsapp_conversaciones")
      .find({}).sort({ ultimoMensajeEn: -1, actualizadaEn: -1 }).limit(100).toArray();
    return Response.json({ ok: true, datos: conversaciones.map((c) => ({
      telefono: c._id, nombre: c.nombre || c._id, ultimoMensaje: c.ultimoMensaje || "Sin mensajes todavía",
      ultimoMensajeEn: c.ultimoMensajeEn, ventanaAbierta: ventanaAtencionAbierta(c),
    })) });
  } catch (error) {
    console.error("Error listando conversaciones:", error);
    return Response.json({ ok: false, mensaje: "No fue posible cargar las conversaciones." }, { status: 500 });
  }
}
