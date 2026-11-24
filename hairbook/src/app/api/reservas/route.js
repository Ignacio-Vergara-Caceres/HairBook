import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioSesion } from "@/lib/session";
import { fechaHoraChileAUtc } from "@/lib/fechaChile";
import { enviarWhatsappReservaRecibida, normalizarTelefonoWhatsapp } from "@/lib/whatsapp";
import { registrarConversacion, registrarMensajeSaliente } from "@/lib/whatsappInbox";
import { horariosParaProfesional, idValido } from "@/lib/profesionales";

export async function POST(request) {
  try {
    const usuario = await obtenerUsuarioSesion();
    if (!usuario) {
      return Response.json(
        { ok: false, mensaje: "Debes iniciar sesión para reservar." },
        { status: 401 }
      );
    }

    if (!usuario.roles?.includes("cliente")) return Response.json({ ok: false, mensaje: "Solo las cuentas de clientes pueden reservar." }, { status: 403 });
    const body = await request.json();
    const { servicioId, profesionalId, fecha, hora, notas = "", aceptaWhatsapp = false } = body;

    if (!idValido(servicioId) || !idValido(profesionalId) || !fecha || !hora || typeof notas !== "string" || notas.length > 1500) {
      return Response.json(
        { ok: false, mensaje: "Completa servicio, profesional, fecha y hora." },
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

    const profesional = await db.collection("usuarios").findOne({
      _id: new ObjectId(profesionalId), activo: { $ne: false },
      $or: [{ roles: "profesional" }, { rol: "profesional" }],
    });
    if (!profesional) return Response.json({ ok: false, mensaje: "Profesional no disponible." }, { status: 404 });
    const disponibles = await horariosParaProfesional(db, { profesional, servicio, fecha });
    if (!disponibles.includes(hora)) return Response.json({ ok: false, mensaje: "Esta hora ya no está disponible para el profesional seleccionado." }, { status: 409 });

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
      profesionalId: profesional._id,
      profesionalNombre: profesional.nombre,
      servicioId: servicio._id,
      servicioNombre: servicio.nombre,
      duracionMin: servicio.duracionMin || 60,
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
        numero: consentimientoWhatsapp ? normalizarTelefonoWhatsapp(cliente.telefono) : null,
        fechaConsentimiento: consentimientoWhatsapp ? new Date() : null,
        estado: consentimientoWhatsapp ? "pendiente_envio" : "sin_consentimiento",
      },
    };

    const resultado = await db.collection("reservas").insertOne(documento);

    // Una reserva guardada correctamente NO debe fallar porque WhatsApp no responda.
    // Se intenta el envío una sola vez después de la inserción (no desde el cliente).
    if (consentimientoWhatsapp) {
      // Mostrar también solicitudes pendientes en la bandeja, aunque Meta esté desactivado.
      try {
        await registrarConversacion(db, cliente.telefono, {
          nombre: usuario.nombre, clienteId: new ObjectId(usuario.id),
        });
      } catch (error) {
        console.error("No se pudo crear la conversación asociada a reserva:", error);
      }
      let whatsapp;
      try {
        whatsapp = await enviarWhatsappReservaRecibida(cliente.telefono, {
          fecha: documento.fecha,
          hora: documento.hora,
          servicioNombre: documento.servicioNombre,
          precioReferencial: documento.precioReferencial,
        });
      } catch (error) {
        console.error("No se pudo solicitar notificación de WhatsApp:", error);
        whatsapp = { estado: "error" };
      }

      documento.whatsapp.estado = whatsapp.estado;
      documento.whatsapp.fechaIntento = new Date();
      if (whatsapp.mensajeId) documento.whatsapp.mensajeId = whatsapp.mensajeId;
      if (whatsapp.mensajeId) {
        try {
          await registrarMensajeSaliente(db, {
            telefono: cliente.telefono, nombre: usuario.nombre,
            clienteId: new ObjectId(usuario.id), metaId: whatsapp.mensajeId,
            tipo: "template",
            texto: `Plantilla ${process.env.WHATSAPP_TEMPLATE_NAME || "de reserva"}: ${documento.servicioNombre} · ${documento.fecha} ${documento.hora}`,
          });
        } catch (error) {
          console.error("No se pudo registrar notificación en historial de WhatsApp:", error);
        }
      }

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
          profesional: profesional.nombre,
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
        profesional: reserva.profesionalNombre || "Sin asignar",
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
