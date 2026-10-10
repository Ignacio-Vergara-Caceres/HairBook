import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioSesion } from "@/lib/session";
import { fechaHoraChileAUtc } from "@/lib/fechaChile";
import { enviarWhatsappReservaRecibida } from "@/lib/whatsapp";

export async function POST(request) {
  try {
    const usuario = await obtenerUsuarioSesion();
    if (!usuario) {
      return Response.json(
        { ok: false, mensaje: "Debes iniciar sesión para reservar." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { servicioId, fecha, hora, notas = "", aceptaWhatsapp = false } = body;

    if (!servicioId || !fecha || !hora || !ObjectId.isValid(servicioId)) {
      return Response.json(
        { ok: false, mensaje: "Completa el servicio, fecha y hora." },
        { status: 400 }
      );
    }

    const fechaHora = fechaHoraChileAUtc(fecha, hora);
    if (!fechaHora || fechaHora.getTime() <= Date.now()) {
      return Response.json(
        { ok: false, mensaje: "Selecciona una fecha y hora futura." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB;

    if (!dbName) {
      throw new Error("Falta MONGODB_DB en el archivo .env.local");
    }

    const db = client.db(dbName);
    const servicio = await db.collection("servicios").findOne({
      _id: new ObjectId(servicioId),
      activo: { $ne: false },
    });

    if (!servicio) {
      return Response.json(
        { ok: false, mensaje: "El servicio seleccionado ya no está disponible." },
        { status: 404 }
      );
    }

    const reservasMismoHorario = await db
      .collection("reservas")
      .find({ fecha, hora })
      .project({ estado: 1 })
      .toArray();

    const horarioOcupado = reservasMismoHorario.some((reservaExistente) => {
      const estado = String(reservaExistente.estado || "")
        .toLowerCase()
        .trim();

      return !["cancelada", "rechazada"].includes(estado);
    });

    if (horarioOcupado) {
      return Response.json(
        { ok: false, mensaje: "Este horario ya no se encuentra disponible." },
        { status: 409 }
      );
    }

    // Se obtiene el celular del usuario autenticado desde MongoDB, jamás del request.
    const cliente = await db.collection("usuarios").findOne(
      { _id: new ObjectId(usuario.id), activo: { $ne: false } },
      { projection: { telefono: 1 } }
    );

    if (!cliente) {
      return Response.json(
        { ok: false, mensaje: "Tu cuenta no está disponible." },
        { status: 401 }
      );
    }

    const consentimientoWhatsapp = aceptaWhatsapp === true;
    const documento = {
      clienteId: new ObjectId(usuario.id),
      clienteNombre: usuario.nombre,
      clienteRut: usuario.rut,
      servicioId: servicio._id,
      servicioNombre: servicio.nombre,
      precioReferencial: servicio.precioDesde || null,
      precioFinal: null,
      fecha,
      hora,
      fechaHora,
      notas: notas.trim(),
      estado: "pendiente",
      estadoPago: "pendiente",
      fechaCreacion: new Date(),
      whatsapp: {
        consentimiento: consentimientoWhatsapp,
        fechaConsentimiento: consentimientoWhatsapp ? new Date() : null,
        estado: consentimientoWhatsapp ? "pendiente_envio" : "sin_consentimiento",
      },
    };

    const resultado = await db.collection("reservas").insertOne(documento);

    // Una reserva guardada correctamente NO debe fallar porque WhatsApp no responda.
    // Se intenta el envío una sola vez después de la inserción (no desde el cliente).
    if (consentimientoWhatsapp) {
      let whatsapp;
      try {
        whatsapp = await enviarWhatsappReservaRecibida(cliente.telefono);
      } catch (error) {
        console.error("No se pudo solicitar notificación de WhatsApp:", error);
        whatsapp = { estado: "error" };
      }

      documento.whatsapp.estado = whatsapp.estado;
      documento.whatsapp.fechaIntento = new Date();
      if (whatsapp.mensajeId) documento.whatsapp.mensajeId = whatsapp.mensajeId;

      try {
        await db.collection("reservas").updateOne(
          { _id: resultado.insertedId },
          { $set: { whatsapp: documento.whatsapp } }
        );
      } catch (error) {
        console.error("No se pudo guardar el estado de WhatsApp:", error);
      }
    }

    return Response.json(
      {
        ok: true,
        reserva: {
          id: resultado.insertedId.toString(),
          servicio: servicio.nombre,
          fecha,
          hora,
          estado: "pendiente",
          whatsappEstado: documento.whatsapp.estado,
          precioReferencial: servicio.precioDesde || null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando reserva:", error);
    return Response.json(
      { ok: false, mensaje: "No fue posible enviar la solicitud de reserva." },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const usuario = await obtenerUsuarioSesion();
    if (!usuario) {
      return Response.json(
        { ok: false, mensaje: "Debes iniciar sesión." },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB;

    if (!dbName) {
      throw new Error("Falta MONGODB_DB en el archivo .env.local");
    }

    const db = client.db(dbName);
    const reservas = await db
      .collection("reservas")
      .find({ clienteId: new ObjectId(usuario.id) })
      .sort({ fechaCreacion: -1 })
      .limit(10)
      .toArray();

    return Response.json({
      ok: true,
      datos: reservas.map((reserva) => ({
        id: reserva._id.toString(),
        servicio: reserva.servicioNombre,
        fecha: reserva.fecha,
        hora: reserva.hora,
        estado: reserva.estado,
        precioReferencial: reserva.precioReferencial,
      })),
    });
  } catch (error) {
    console.error("Error obteniendo reservas:", error);
    return Response.json(
      { ok: false, mensaje: "No fue posible cargar las reservas." },
      { status: 500 }
    );
  }
}
