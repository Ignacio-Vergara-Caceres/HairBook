import clientPromise from "@/lib/mongodb";

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

function formatearFechaISO(fecha) {
  const year = fecha.getFullYear();
  const month = String(fecha.getMonth() + 1).padStart(2, "0");
  const day = String(fecha.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function crearRangoFechas(inicio, fin) {
  const fechas = [];
  const actual = new Date(inicio);
  actual.setHours(0, 0, 0, 0);

  const limite = new Date(fin);
  limite.setHours(0, 0, 0, 0);

  while (actual <= limite) {
    fechas.push(formatearFechaISO(actual));
    actual.setDate(actual.getDate() + 1);
  }

  return fechas;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fechaInicioParam = searchParams.get("fechaInicio");
    const fechaFinParam = searchParams.get("fechaFin");

    if (!fechaInicioParam || !fechaFinParam) {
      return Response.json(
        { ok: false, mensaje: "Debe indicar fecha de inicio y fecha de fin." },
        { status: 400 }
      );
    }

    const fechaInicio = new Date(`${fechaInicioParam}T00:00:00`);
    const fechaFin = new Date(`${fechaFinParam}T00:00:00`);

    if (Number.isNaN(fechaInicio.getTime()) || Number.isNaN(fechaFin.getTime())) {
      return Response.json(
        { ok: false, mensaje: "Las fechas indicadas no son válidas." },
        { status: 400 }
      );
    }

    if (fechaFin < fechaInicio) {
      return Response.json(
        { ok: false, mensaje: "La fecha de fin no puede ser anterior a la fecha de inicio." },
        { status: 400 }
      );
    }

    const diferenciaDias = Math.floor((fechaFin.getTime() - fechaInicio.getTime()) / (1000 * 60 * 60 * 24));
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

    const fechasRango = crearRangoFechas(fechaInicio, fechaFin);

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
      const fechaActual = new Date(`${fechaISO}T00:00:00`);
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
        dia: DIAS[fechaActual.getDay()],
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
