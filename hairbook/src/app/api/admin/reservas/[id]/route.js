import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";
import { fechaHoraChileAUtc } from "@/lib/fechaChile";
import { HORARIOS } from "@/lib/horarios";
import { enviarWhatsappTexto, normalizarTelefonoWhatsapp } from "@/lib/whatsapp";
import { registrarMensajeSaliente, ventanaAtencionAbierta } from "@/lib/whatsappInbox";

function describirCambio(reserva, nuevoEstado, fecha, hora, cambioHorario) {
  const fechaLegible = fecha.split("-").reverse().join("/");
  if (cambioHorario) {
    return `HairBook: Tu reserva de ${reserva.servicioNombre} fue reprogramada para el ${fechaLegible} a las ${hora}. Si tienes preguntas, responde a este mensaje.`;
  }
  if (nuevoEstado === "confirmada") {
    return `HairBook: Tu reserva de ${reserva.servicioNombre} para el ${fechaLegible} a las ${hora} fue confirmada. ¡Te esperamos!`;
  }
  return `HairBook: Tu solicitud de ${reserva.servicioNombre} para el ${fechaLegible} a las ${hora} fue rechazada. Puedes escribirnos para buscar otro horario.`;
}

async function notificarSiCorresponde(db, reserva, nuevoEstado, fecha, hora, cambioHorario) {
  if (!reserva.whatsapp?.consentimiento) {
    return { notificado: false, aviso: "Reserva actualizada. No se envió WhatsApp porque esta solicitud no autorizó notificaciones." };
  }
  let telefono = reserva.whatsapp?.numero;
  if (!telefono && reserva.clienteId) {
    const cliente = await db.collection("usuarios").findOne({ _id: reserva.clienteId }, { projection: { telefono: 1 } });
    telefono = cliente?.telefono;
  }
  const numero = normalizarTelefonoWhatsapp(telefono);
  if (!numero) return { notificado: false, aviso: "Reserva actualizada, pero el teléfono de la clienta no es válido." };
  const conversacion = await db.collection("whatsapp_conversaciones").findOne({ _id: numero });
  if (!ventanaAtencionAbierta(conversacion)) {
    return { notificado: false, aviso: "Reserva actualizada. No se envió WhatsApp porque no hay una conversación abierta en las últimas 24 horas. Para avisar fuera de plazo se necesita una plantilla aprobada por Meta." };
  }
  try {
    const texto = describirCambio(reserva, nuevoEstado, fecha, hora, cambioHorario);
    const { metaId } = await enviarWhatsappTexto(numero, texto);
    await registrarMensajeSaliente(db, {
      telefono: numero, metaId, texto, clienteId: reserva.clienteId,
      nombre: reserva.clienteNombre,
    });
    return { notificado: true, aviso: "WhatsApp aceptó la notificación (entrega pendiente de confirmar)." };
  } catch (error) {
    console.error("Error notificando cambio de reserva:", error.message);
    return { notificado: false, aviso: "Reserva actualizada, pero no se pudo enviar o registrar la notificación. Revisa el chat y los logs antes de intentar reenviar." };
  }
}

export async function PATCH(request, { params }) {
  try {
    const admin = await obtenerUsuarioAdmin();
    if (!admin) return Response.json({ ok: false, mensaje: "Acceso no autorizado." }, { status: 403 });
    const { id } = await params;
    if (!ObjectId.isValid(id)) return Response.json({ ok: false, mensaje: "ID de reserva inválido." }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const modificacion = body.accion === "modificar";
    if (!modificacion && !["confirmada", "rechazada"].includes(body.estado)) {
      return Response.json({ ok: false, mensaje: "Acción no permitida." }, { status: 400 });
    }
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    const coleccion = db.collection("reservas");
    const reserva = await coleccion.findOne({ _id: new ObjectId(id) });
    if (!reserva) return Response.json({ ok: false, mensaje: "Reserva no encontrada." }, { status: 404 });
    const estadoActual = reserva.estado || "pendiente";
    if (modificacion ? !["pendiente", "confirmada"].includes(estadoActual) : estadoActual !== "pendiente") {
      return Response.json({ ok: false, mensaje: "Esta reserva no admite esa acción." }, { status: 409 });
    }
    const fechaOriginal = fechaHoraChileAUtc(reserva.fecha, reserva.hora);
    if (!fechaOriginal || fechaOriginal.getTime() <= Date.now()) {
      return Response.json({ ok: false, mensaje: "No se pueden gestionar reservas pasadas." }, { status: 409 });
    }
    const fecha = modificacion ? body.fecha : reserva.fecha;
    const hora = modificacion ? body.hora : reserva.hora;
    if (modificacion) {
      const nuevaFechaHora = fechaHoraChileAUtc(fecha, hora);
      if (!nuevaFechaHora || nuevaFechaHora.getTime() <= Date.now() || !HORARIOS.includes(hora)) {
        return Response.json({ ok: false, mensaje: "Selecciona una fecha y horario laboral futuro válido." }, { status: 400 });
      }
      if (fecha === reserva.fecha && hora === reserva.hora) {
        return Response.json({ ok: false, mensaje: "La fecha y hora no cambiaron." }, { status: 400 });
      }
      const ocupada = await coleccion.findOne({
        _id: { $ne: reserva._id }, fecha, hora,
        estado: { $nin: ["rechazada", "cancelada"] },
      }, { projection: { _id: 1 } });
      if (ocupada) return Response.json({ ok: false, mensaje: "Ese horario ya está ocupado." }, { status: 409 });
    }
    const nuevoEstado = modificacion ? estadoActual : body.estado;
    const set = {
      fechaActualizacion: new Date(), gestionadaPor: admin.id,
      ...(modificacion ? { fecha, hora, fechaHora: fechaHoraChileAUtc(fecha, hora) } : { estado: nuevoEstado }),
    };
    // Comprobación optimista: impide sobrescribir el cambio de otro administrador.
    const actualizado = await coleccion.updateOne(
      { _id: reserva._id, estado: reserva.estado, fecha: reserva.fecha, hora: reserva.hora },
      { $set: set }
    );
    if (!actualizado.modifiedCount) {
      return Response.json({ ok: false, mensaje: "La reserva cambió; vuelve a cargar los datos." }, { status: 409 });
    }
    let resultadoNotificacion;
    try {
      resultadoNotificacion = await notificarSiCorresponde(db, reserva, nuevoEstado, fecha, hora, modificacion);
    } catch (error) {
      console.error("No se pudo comprobar notificación:", error);
      resultadoNotificacion = { notificado: false, aviso: "Reserva actualizada; no fue posible comprobar la notificación de WhatsApp." };
    }
    return Response.json({ ok: true,
      mensaje: modificacion ? "Reserva reprogramada correctamente." :
        nuevoEstado === "confirmada" ? "Reserva confirmada correctamente." : "Reserva rechazada correctamente.",
      estado: nuevoEstado, fecha, hora, ...resultadoNotificacion,
    });
  } catch (error) {
    console.error("Error gestionando reserva:", error);
    return Response.json({ ok: false, mensaje: "No fue posible actualizar la reserva." }, { status: 500 });
  }
}
