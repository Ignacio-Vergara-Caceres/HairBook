
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

function responderError(mensaje, status) {
  return Response.json(
    { ok: false, mensaje },
    { status }
  );
}

// ==========================================
// CONSULTAR HISTORIAL DE UN CLIENTE
// ==========================================

export async function GET(request, { params }) {
  try {
    // Solo administradores pueden consultar.
    const admin = await obtenerUsuarioAdmin();

    if (!admin) {
      return responderError(
        "Acceso no autorizado.",
        403
      );
    }

    const { id } = await params;

    if (!/^[0-9a-f]{24}$/i.test(id || "")) {
      return responderError(
        "Identificador de cliente inválido.",
        400
      );
    }

    const db = (await clientPromise).db(
      process.env.MONGODB_DB || "capstone_peluqueria"
    );

    const clienteId = new ObjectId(id);

    // Verificar que el cliente exista.
    const cliente = await db
      .collection("usuarios")
      .findOne(
        {
          _id: clienteId,
          $or: [
            { roles: "cliente" },
            { rol: "cliente" },
          ],
        },
        {
          projection: {
            nombre: 1,
          },
        }
      );

    if (!cliente) {
      return responderError(
        "Cliente no encontrado.",
        404
      );
    }

    // Obtener reservas y notas del mismo cliente.
    const [reservas, notas] = await Promise.all([
      db.collection("reservas")
        .find(
          { clienteId },
          {
            projection: {
              servicioNombre: 1,
              profesionalNombre: 1,
              fecha: 1,
              hora: 1,
              estado: 1,
              estadoPago: 1,
            },
          }
        )
        .sort({ fecha: -1, hora: -1 })
        .toArray(),

      db.collection("notas_reservas")
        .find(
          { clienteId },
          {
            projection: {
              reservaId: 1,
              servicio: 1,
              profesional: 1,
              fechaServicio: 1,
              comentario: 1,
              fechaRegistro: 1,
            },
          }
        )
        .sort({ fechaRegistro: -1 })
        .toArray(),
    ]);

    // Preparar la información de las reservas.
    const historialReservas = reservas.map(
      (reserva) => ({
        id: String(reserva._id),
        servicio:
          reserva.servicioNombre || "Servicio",
        profesional:
          reserva.profesionalNombre || "Sin asignar",
        fecha: reserva.fecha || "",
        hora: reserva.hora || "",
        estado: reserva.estado || "pendiente",
        estadoPago:
          reserva.estadoPago || "pendiente",
      })
    );

    // Preparar el historial de notas técnicas.
    const historialNotas = notas.map((nota) => ({
      id: String(nota._id),
      reservaId: String(nota.reservaId || ""),
      servicio: nota.servicio || "Servicio",
      profesional:
        nota.profesional || "Profesional",
      fechaServicio: nota.fechaServicio || "",
      comentario: nota.comentario || "",
      fechaRegistro: nota.fechaRegistro || null,
    }));

    return Response.json({
      ok: true,
      cliente: {
        id: String(cliente._id),
        nombre: cliente.nombre || "Cliente",
      },
      totalReservas: historialReservas.length,
      totalNotas: historialNotas.length,
      reservas: historialReservas,
      notas: historialNotas,
    });

  } catch (error) {
    console.error(
      "Error obteniendo historial del cliente:",
      error
    );

    return responderError(
      "No se pudo cargar el historial del cliente.",
      500
    );
  }
}
