import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioProfesional } from "@/lib/session";
import { telefonosAutorizados } from "@/lib/chatProfesional";
import { ventanaAtencionAbierta } from "@/lib/whatsappInbox";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const usuario = await obtenerUsuarioProfesional();
    if (!usuario) return Response.json({ ok: false, mensaje: "No autorizado." }, { status: 403 });
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    const numeros = await telefonosAutorizados(db, usuario.id);
    const conversaciones = numeros.length ? await db.collection("whatsapp_conversaciones").find({ _id: { $in: numeros } }).sort({ ultimoMensajeEn: -1 }).limit(100).toArray() : [];
    return Response.json({ ok: true, datos: conversaciones.map(c => ({ telefono: c._id, nombre: c.nombre || c._id, ultimoMensaje: c.ultimoMensaje || "Sin mensajes", ultimoMensajeEn: c.ultimoMensajeEn, ventanaAbierta: ventanaAtencionAbierta(c) })) });
  } catch (error) {
    console.error("Error listando chats profesional:", error);
    return Response.json({ ok: false, mensaje: "No fue posible cargar los chats." }, { status: 500 });
  }
}
