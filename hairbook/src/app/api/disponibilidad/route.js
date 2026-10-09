import clientPromise from "@/lib/mongodb";
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

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const fecha = searchParams.get("fecha");

    if (!fechaISOValida(fecha)) {
      return Response.json(
        { ok: false, mensaje: "Debe indicar una fecha." },
        { status: 400 }
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
      .find({ fecha })
      .project({ hora: 1, estado: 1 })
      .toArray();

    const horasOcupadas = [
      ...new Set(
        reservas
          .filter((reserva) => {
            const estado = String(reserva.estado || "")
              .toLowerCase()
              .trim();

            return !["cancelada", "rechazada"].includes(estado);
          })
          .map((reserva) => reserva.hora)
          .filter(Boolean)
      ),
    ];

    const horariosDisponibles = HORARIOS.filter(
      (hora) => !horasOcupadas.includes(hora)
    );

    return Response.json({
      ok: true,
      fecha,
      horariosDisponibles,
      horasOcupadas,
      totalDisponibles: horariosDisponibles.length,
    });
  } catch (error) {
    console.error("Error obteniendo disponibilidad:", error);

    return Response.json(
      {
        ok: false,
        mensaje: "No fue posible obtener la disponibilidad.",
      },
      { status: 500 }
    );
  }
}
