import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";
import { enviarWhatsappTexto, normalizarTelefonoWhatsapp } from "@/lib/whatsapp";
import { registrarMensajeSaliente, ventanaAtencionAbierta } from "@/lib/whatsappInbox";

export async function POST(request, { params }) {
  try {
    const admin = await obtenerUsuarioAdmin();
    if (!admin) return Response.json({ ok: false, mensaje: "No autorizado." }, { status: 403 });
    const numero = normalizarTelefonoWhatsapp((await params).telefono);
    if (!numero) return Response.json({ ok: false, mensaje: "Teléfono inválido." }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const texto = typeof body.texto === "string" ? body.texto.trim() : "";
    if (!texto || texto.length > 2500) return Response.json({ ok: false, mensaje: "Ingresa un mensaje de 1 a 2500 caracteres." }, { status: 400 });
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    const conversacion = await db.collection("whatsapp_conversaciones").findOne({ _id: numero });
    if (!ventanaAtencionAbierta(conversacion)) {
      return Response.json({ ok: false, mensaje: "El cliente debe escribir primero o volver a hacerlo: la ventana de 24 horas está cerrada. Para iniciar otra conversación necesitas una plantilla aprobada." }, { status: 409 });
    }
    const enviado = await enviarWhatsappTexto(numero, texto);
    await registrarMensajeSaliente(db, { telefono: numero, texto, metaId: enviado.metaId });
    return Response.json({ ok: true, mensaje: "Mensaje aceptado por WhatsApp." });
  } catch (error) {
    console.error("Error enviando WhatsApp:", error.message);
    return Response.json({ ok: false, mensaje: "No se pudo enviar el mensaje. Comprueba la configuración y los logs del servidor." }, { status: 502 });
  }
}
