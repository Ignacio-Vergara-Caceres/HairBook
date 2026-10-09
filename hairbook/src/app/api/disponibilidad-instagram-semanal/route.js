import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";
import { fechaISOValida } from "@/lib/fechaChile";

const HORARIOS = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

const DIAS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

function crearRangoFechas(inicio, fin) {
  const fechas = [];
  const actual = new Date(`${inicio}T12:00:00Z`);
  const limite = new Date(`${fin}T12:00:00Z`);

  while (actual <= limite) {
    fechas.push(actual.toISOString().slice(0, 10));
    actual.setUTCDate(actual.getUTCDate() + 1);
  }

  return fechas;
}

export async function GET(request) {
  try {
    const usuario = await obtenerUsuarioAdmin();

    if (!usuario) {
      return Response.json(
        { ok: false, mensaje: "No tienes permisos para consultar esta información." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const fechaInicioParam = searchParams.get("fechaInicio");
    const fechaFinParam = searchParams.get("fechaFin");

    if (!fechaInicioParam || !fechaFinParam) {
      return Response.json(
        { ok: false, mensaje: "Debe indicar fecha de inicio y fecha de fin." },
        { status: 400 }
      );
    }

    if (!fechaISOValida(fechaInicioParam) || !fechaISOValida(fechaFinParam)) {
      return Response.json(
        { ok: false, mensaje: "Las fechas indicadas no son válidas." },
        { status: 400 }
      );
    }

    if (fechaFinParam < fechaInicioParam) {
      return Response.json(
        { ok: false, mensaje: "La fecha de fin no puede ser anterior a la fecha de inicio." },
        { status: 400 }
      );
    }

    const diferenciaDias = Math.round(
      (Date.parse(`${fechaFinParam}T12:00:00Z`) - Date.parse(`${fechaInicioParam}T12:00:00Z`)) /
        86400000
    );
    if (diferenciaDias > 6) {
      return Response.json(
        { ok: false, mensaje: "El rango máximo permitido es de una semana." },
        { status: 400 }
      );
    }

    const dbName = process.env.MONGODB_DB;
    if (!dbName) {
      throw new Error("Falta MONGODB_DB en el archivo .env.local");
    }

    const fechasRango = crearRangoFechas(fechaInicioParam, fechaFinParam);

    const client = await clientPromise;
    const db = client.db(dbName);

    const reservas = await db
      .collection("reservas")
      .find({ fecha: { $in: fechasRango } })
      .project({ fecha: 1, hora: 1, estado: 1 })
      .toArray();

    const reservasActivas = reservas.filter((reserva) => {
      const estado = String(reserva.estado || "").toLowerCase().trim();
      return !["cancelada", "rechazada"].includes(estado);
    });

    const rango = fechasRango.map((fechaISO) => {
      const fechaActual = new Date(`${fechaISO}T12:00:00Z`);
      const horasOcupadas = [
        ...new Set(
          reservasActivas
            .filter((reserva) => reserva.fecha === fechaISO)
            .map((reserva) => reserva.hora)
            .filter(Boolean)
        ),
      ];

      const horariosDisponibles = HORARIOS.filter(
        (hora) => !horasOcupadas.includes(hora)
      );

      return {
        fecha: fechaISO,
        dia: DIAS[fechaActual.getUTCDay()],
        horariosDisponibles,
        horasOcupadas,
        totalDisponibles: horariosDisponibles.length,
      };
    });

    return Response.json({
      ok: true,
      fechaInicio: fechaInicioParam,
      fechaFin: fechaFinParam,
      rango,
    });
  } catch (error) {
    console.error("Error obteniendo disponibilidad para imagen semanal:", error);

    return Response.json(
      {
        ok: false,
        mensaje: "No fue posible obtener la disponibilidad semanal.",
      },
      { status: 500 }
    );
  }
}
