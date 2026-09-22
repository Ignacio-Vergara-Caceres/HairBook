import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioSesion } from "@/lib/session";

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
    const { servicioId, fecha, hora, notas = "" } = body;

    if (!servicioId || !fecha || !hora || !ObjectId.isValid(servicioId)) {
      return Response.json(
        { ok: false, mensaje: "Completa el servicio, fecha y hora." },
        { status: 400 }
      );
    }

    const fechaHora = new Date(`${fecha}T${hora}:00`);
    if (Number.isNaN(fechaHora.getTime()) || fechaHora.getTime() < Date.now()) {
      return Response.json(
        { ok: false, mensaje: "Selecciona una fecha y hora futura." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("capstone_peluqueria");
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
    };

    const resultado = await db.collection("reservas").insertOne(documento);

    return Response.json(
      {
        ok: true,
        reserva: {
          id: resultado.insertedId.toString(),
          servicio: servicio.nombre,
          fecha,
          hora,
          estado: "pendiente",
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
    const db = client.db("capstone_peluqueria");
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
