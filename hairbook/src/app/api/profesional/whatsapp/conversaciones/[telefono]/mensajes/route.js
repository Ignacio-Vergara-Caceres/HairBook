import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioProfesional } from "@/lib/session";
import { puedeChatear } from "@/lib/chatProfesional";
import { normalizarTelefonoWhatsapp, enviarWhatsappTexto } from "@/lib/whatsapp";
import { registrarMensajeSaliente, ventanaAtencionAbierta } from "@/lib/whatsappInbox";
export async function POST(request, { params }) {
  try {
    const usuario = await obtenerUsuarioProfesional();
    if (!usuario) return Response.json({ ok: false, mensaje: "No autorizado." }, { status: 403 });
    const numero = normalizarTelefonoWhatsapp((await params).telefono);
    const body = await request.json().catch(() => ({}));
    const texto = typeof body.texto === "string" ? body.texto.trim() : "";
    if (!texto || texto.length > 2500) return Response.json({ ok: false, mensaje: "Mensaje inválido." }, { status: 400 });
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    if (!await puedeChatear(db, usuario.id, numero)) return Response.json({ ok: false, mensaje: "Conversación no asignada." }, { status: 403 });
    const c = await db.collection("whatsapp_conversaciones").findOne({ _id: numero });
    if (!ventanaAtencionAbierta(c)) return Response.json({ ok: false, mensaje: "La ventana de 24 horas de Meta está cerrada." }, { status: 409 });
    const enviado = await enviarWhatsappTexto(numero, texto);
    await registrarMensajeSaliente(db, { telefono: numero, texto, metaId: enviado.metaId });
    return Response.json({ ok: true, mensaje: "Mensaje aceptado por WhatsApp." });
  } catch (error) {
    console.error("Error enviando mensaje profesional:", error);
    return Response.json({ ok: false, mensaje: "No se pudo enviar el mensaje." }, { status: 502 });
  }
}
