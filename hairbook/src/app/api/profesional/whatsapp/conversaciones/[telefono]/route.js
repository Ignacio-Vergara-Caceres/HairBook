import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioProfesional } from "@/lib/session";
import { puedeChatear, reservasDeConversacion } from "@/lib/chatProfesional";
import { normalizarTelefonoWhatsapp } from "@/lib/whatsapp";
import { ventanaAtencionAbierta } from "@/lib/whatsappInbox";
export const dynamic = "force-dynamic";
export async function GET(_request, { params }) {
  try {
    const usuario = await obtenerUsuarioProfesional();
    if (!usuario) return Response.json({ ok: false, mensaje: "No autorizado." }, { status: 403 });
    const numero = normalizarTelefonoWhatsapp((await params).telefono);
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    if (!await puedeChatear(db, usuario.id, numero)) return Response.json({ ok: false, mensaje: "Conversación no asignada a este profesional." }, { status: 403 });
    const c = await db.collection("whatsapp_conversaciones").findOne({ _id: numero });
    if (!c) return Response.json({ ok: false, mensaje: "Sin conversación todavía." }, { status: 404 });
    // WhatsApp usa un hilo por teléfono. Solo se muestran las reservas propias; los mensajes
    // del mismo número son compartidos (no existe una separación por profesional en Meta).
    const [mensajes, reservas] = await Promise.all([
      db.collection("whatsapp_mensajes").find({ telefono: numero }).sort({ fecha: -1 }).limit(150).toArray(),
      reservasDeConversacion(db, usuario.id, numero),
    ]);
    return Response.json({ ok: true, conversacion: { telefono: numero, nombre: c.nombre || numero, ventanaAbierta: ventanaAtencionAbierta(c), ultimoMensajeEntrante: c.ultimoMensajeEntrante || null }, mensajes: mensajes.reverse().map(m => ({ id: String(m._id), direccion: m.direccion, tipo: m.tipo, texto: m.texto, fecha: m.fecha, estado: m.estadoEntrega || m.estado })), reservas: reservas.map(r => ({ id: String(r._id), servicio: r.servicioNombre, servicioId: String(r.servicioId), profesionalId: String(r.profesionalId), fecha: r.fecha, hora: r.hora, estado: r.estado, precioReferencial: r.precioReferencial, notas: r.notas || "" })) });
  } catch (error) {
    console.error("Error leyendo chat profesional:", error);
    return Response.json({ ok: false, mensaje: "No fue posible cargar el chat." }, { status: 500 });
  }
}
