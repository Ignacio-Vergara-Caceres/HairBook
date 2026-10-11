
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";
import { fechaHoraChileAUtc } from "@/lib/fechaChile";

export async function PATCH(request, { params }) {
  try {
    // Verificar que quien realiza la acción sea administrador.
    const usuario = await obtenerUsuarioAdmin();

    if (!usuario) {
      return Response.json(
        { ok: false, mensaje: "Acceso no autorizado." },
        { status: 403 }
      );
    }

    // Obtener el identificador de la reserva.
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { ok: false, mensaje: "Identificador de reserva inválido." },
        { status: 400 }
      );
    }

    // Obtener el estado solicitado desde la interfaz.
    const body = await request.json();
    const estado = body?.estado;

    if (!["confirmada", "rechazada"].includes(estado)) {
      return Response.json(
        { ok: false, mensaje: "Estado no permitido." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB;

    if (!dbName) {
      throw new Error("Falta configurar MONGODB_DB.");
    }

    const db = client.db(dbName);
    const coleccion = db.collection("reservas");

    const reserva = await coleccion.findOne({
      _id: new ObjectId(id),
    });

    if (!reserva) {
      return Response.json(
        { ok: false, mensaje: "Reserva no encontrada." },
        { status: 404 }
      );
    }

    // No permitir cambiar reservas que ya fueron resueltas.
    if (reserva.estado !== "pendiente") {
      return Response.json(
        { ok: false, mensaje: "La reserva ya fue gestionada." },
        { status: 409 }
      );
    }

    // No confirmar ni rechazar reservas cuya fecha ya pasó.
    const fechaHora =
      fechaHoraChileAUtc(reserva.fecha, reserva.hora);

    if (!fechaHora || fechaHora.getTime() <= Date.now()) {
      return Response.json(
        {
          ok: false,
          mensaje: "No puedes gestionar una reserva pasada.",
        },
        { status: 409 }
      );
    }

    // Actualizar únicamente si sigue pendiente.
    const resultado = await coleccion.updateOne(
      {
        _id: new ObjectId(id),
        estado: "pendiente",
      },
      {
        $set: {
          estado,
          fechaActualizacion: new Date(),
          gestionadaPor: usuario.id,
        },
      }
    );

    if (resultado.modifiedCount === 0) {
      return Response.json(
        {
          ok: false,
          mensaje: "La reserva cambió de estado. Actualiza la página.",
        },
        { status: 409 }
      );
    }

    return Response.json({
      ok: true,
      mensaje:
        estado === "confirmada"
          ? "Reserva confirmada correctamente."
          : "Reserva rechazada correctamente.",
      estado,
    });

  } catch (error) {
    console.error("Error actualizando reserva:", error);

    return Response.json(
      {
        ok: false,
        mensaje: "No fue posible actualizar la reserva.",
      },
      { status: 500 }
    );
  }
}
