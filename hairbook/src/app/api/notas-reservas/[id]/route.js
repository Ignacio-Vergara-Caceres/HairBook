
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import {
  obtenerUsuarioAdmin,
  obtenerUsuarioProfesional,
} from "@/lib/session";

export const dynamic = "force-dynamic";

// ======================================
// FUNCIONES AUXILIARES
// ======================================

function idValido(id) {
  return typeof id === "string" &&
    /^[0-9a-f]{24}$/i.test(id);
}

function responderError(mensaje, status) {
  return Response.json(
    { ok: false, mensaje },
    { status }
  );
}

async function obtenerBaseDatos() {
  const cliente = await clientPromise;

  return cliente.db(
    process.env.MONGODB_DB || "capstone_peluqueria"
  );
}

// ======================================
// CONSULTAR HISTORIAL DE NOTAS
// ======================================

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!idValido(id)) {
      return responderError("Reserva inválida.", 400);
    }

    // Solo administradores y profesionales.
    const [admin, profesional] = await Promise.all([
      obtenerUsuarioAdmin(),
      obtenerUsuarioProfesional(),
    ]);

    if (!admin && !profesional) {
      return responderError(
        "No tienes permiso para consultar estas notas.",
        403
      );
    }

    const db = await obtenerBaseDatos();

    const reserva = await db.collection("reservas").findOne({
      _id: new ObjectId(id),
    });

    if (!reserva) {
      return responderError(
        "Reserva no encontrada.",
        404
      );
    }

    // El administrador puede consultar todo.
    // El profesional solo puede consultar
    // reservas que tenga asignadas.

    const profesionalAsignado =
      profesional &&
      String(reserva.profesionalId || "") === profesional.id;

    if (!admin && !profesionalAsignado) {
      return responderError(
        "Esta reserva no está asignada a tu cuenta.",
        403
      );
    }

    const clienteId = String(
      reserva.clienteId || ""
    );

    if (!idValido(clienteId)) {
      return responderError(
        "No se encontró el cliente asociado.",
        422
      );
    }

    // Obtener todas las notas históricas
    // asociadas al mismo cliente.

    const notas = await db
      .collection("notas_reservas")
      .find({
        clienteId: new ObjectId(clienteId),
      })
      .sort({ fechaRegistro: -1 })
      .limit(100)
      .toArray();

    return Response.json({
      ok: true,
      notas: notas.map((nota) => ({
        id: String(nota._id),
        reservaId: String(nota.reservaId),
        servicio: nota.servicio,
        fechaServicio: nota.fechaServicio,
        profesional: nota.profesional,
        comentario: nota.comentario,
        fechaRegistro: nota.fechaRegistro,
      })),
    });

  } catch (error) {
    console.error(
      "Error consultando historial de notas:",
      error
    );

    return responderError(
      "No se pudo cargar el historial.",
      500
    );
  }
}

// ======================================
// GUARDAR UNA NUEVA NOTA
// ======================================

export async function POST(request, { params }) {
  try {
    // Solo profesionales pueden agregar notas.
    const profesional =
      await obtenerUsuarioProfesional();

    if (!profesional) {
      return responderError(
        "No tienes permiso para agregar notas.",
        403
      );
    }

    const { id } = await params;

    if (!idValido(id)) {
      return responderError("Reserva inválida.", 400);
    }

    const datos = await request
      .json()
      .catch(() => ({}));

    const comentario =
      typeof datos.comentario === "string"
        ? datos.comentario.trim()
        : "";

    if (
      comentario.length === 0 ||
      comentario.length > 1500
    ) {
      return responderError(
        "La nota debe contener entre 1 y 1500 caracteres.",
        400
      );
    }

    const db = await obtenerBaseDatos();

    // Verificar que la reserva corresponda
    // al profesional que inició sesión.

    const reserva = await db.collection("reservas").findOne({
      _id: new ObjectId(id),
      profesionalId: new ObjectId(profesional.id),
    });

    if (!reserva) {
      return responderError(
        "No tienes acceso a esta reserva.",
        403
      );
    }

    // Solo se permiten notas en reservas
    // confirmadas o completadas.

    if (
      !["confirmada", "completada"].includes(
        reserva.estado
      )
    ) {
      return responderError(
        "Solo puedes agregar notas a reservas confirmadas o completadas.",
        409
      );
    }

    const clienteId = String(
      reserva.clienteId || ""
    );

    if (!idValido(clienteId)) {
      return responderError(
        "La reserva no tiene un cliente válido.",
        422
      );
    }

    // Guardar nota vinculada al cliente,
    // reserva y profesional.

    const nuevaNota = {
      clienteId: new ObjectId(clienteId),
      reservaId: reserva._id,
      profesionalId: new ObjectId(profesional.id),

      profesional: profesional.nombre,
      servicio: reserva.servicioNombre,
      fechaServicio: reserva.fecha,

      comentario,
      fechaRegistro: new Date(),
    };

    await db
      .collection("notas_reservas")
      .insertOne(nuevaNota);

    return Response.json(
      {
        ok: true,
        mensaje: "Nota guardada correctamente.",
      },
      { status: 201 }
    );

  } catch (error) {
    console.error(
      "Error guardando nota:",
      error
    );

    return responderError(
      "No se pudo guardar la nota.",
      500
    );
  }
}
