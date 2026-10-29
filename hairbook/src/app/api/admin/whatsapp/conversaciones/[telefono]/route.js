import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";
import { normalizarTelefonoWhatsapp } from "@/lib/whatsapp";
import { ventanaAtencionAbierta } from "@/lib/whatsappInbox";

export const dynamic = "force-dynamic";

export async function GET(_request, { params }) {
  try {
    if (!await obtenerUsuarioAdmin()) return Response.json({ ok: false, mensaje: "No autorizado." }, { status: 403 });
    const numero = normalizarTelefonoWhatsapp((await params).telefono);
    if (!numero) return Response.json({ ok: false, mensaje: "Teléfono no válido." }, { status: 400 });
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    const conversacion = await db.collection("whatsapp_conversaciones").findOne({ _id: numero });
    if (!conversacion) return Response.json({ ok: false, mensaje: "No existe una conversación con ese número." }, { status: 404 });
    const mensajes = await db.collection("whatsapp_mensajes").find({ telefono: numero })
      .sort({ fecha: -1 }).limit(150).toArray();

    let clienteId = conversacion.clienteId;
    if (!clienteId) {
      const reservaVinculada = await db.collection("reservas").findOne(
        { "whatsapp.numero": numero }, { sort: { fechaCreacion: -1 }, projection: { clienteId: 1 } }
      );
      clienteId = reservaVinculada?.clienteId;
    }
    const reservas = clienteId && ObjectId.isValid(String(clienteId))
      ? await db.collection("reservas").find({ clienteId: new ObjectId(String(clienteId)) })
        .sort({ fechaCreacion: -1 }).limit(15).toArray()
      : await db.collection("reservas").find({ "whatsapp.numero": numero })
        .sort({ fechaCreacion: -1 }).limit(15).toArray();
    return Response.json({ ok: true,
      conversacion: { telefono: numero, nombre: conversacion.nombre || numero,
        ventanaAbierta: ventanaAtencionAbierta(conversacion),
        ultimoMensajeEntrante: conversacion.ultimoMensajeEntrante || null },
      mensajes: mensajes.reverse().map((m) => ({
        id: String(m._id), direccion: m.direccion, tipo: m.tipo, texto: m.texto,
        fecha: m.fecha, estado: m.estadoEntrega || m.estado,
      })),
      reservas: reservas.map((r) => ({
        id: String(r._id), servicio: r.servicioNombre, servicioId: String(r.servicioId || ""), profesionalId: r.profesionalId ? String(r.profesionalId) : null, fecha: r.fecha, hora: r.hora,
        estado: r.estado, precioReferencial: r.precioReferencial, notas: r.notas || "",
      })),
    });
  } catch (error) {
    console.error("Error cargando conversación:", error);
    return Response.json({ ok: false, mensaje: "No fue posible cargar el chat." }, { status: 500 });
  }
}
