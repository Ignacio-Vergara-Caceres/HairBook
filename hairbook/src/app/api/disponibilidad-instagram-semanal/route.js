import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";
import { fechaISOValida } from "@/lib/fechaChile";
import { HORARIOS } from "@/lib/horarios";
import { horariosParaProfesional } from "@/lib/profesionales";

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

    const profesionales = await db.collection("usuarios").find({
      activo: { $ne: false }, $or: [{ roles: "profesional" }, { rol: "profesional" }],
    }, { projection: { nombre: 1, serviciosIds: 1, bloqueos: 1, activo: 1 } }).toArray();
    const todosIds = [...new Set(profesionales.flatMap(p => p.serviciosIds || []))];
    const servicios = todosIds.length ? await db.collection("servicios")
      .find({ _id: { $in: todosIds.map(id => { try { return new ObjectId(id); } catch { return null; } }).filter(Boolean) }, activo: { $ne: false } })
      .toArray() : [];
    const porId = new Map(servicios.map(s => [String(s._id), s]));
    const disponiblesPorFecha = await Promise.all(fechasRango.map(async fecha => {
      const listas = await Promise.all(profesionales.map(async pro => {
        // La imagen general muestra una hora cuando al menos un profesional tiene
        // espacio para alguno de sus servicios. El más corto permite más cupos.
        const menor = (pro.serviciosIds || []).map(id => porId.get(String(id))).filter(Boolean)
          .sort((a,b) => (a.duracionMin || 60) - (b.duracionMin || 60))[0];
        if (!menor) return [];
        return horariosParaProfesional(db, { profesional: pro, servicio: menor, fecha });
      }));
      return { fecha, disponibles: [...new Set(listas.flat())] };
    }));
    const rango = disponiblesPorFecha.map(({ fecha, disponibles }) => {
      const fechaActual = new Date(`${fecha}T12:00:00Z`);
      const horariosDisponibles = HORARIOS.filter(h => disponibles.includes(h));
      return { fecha, dia: DIAS[fechaActual.getUTCDay()], horariosDisponibles,
        horasOcupadas: HORARIOS.filter(h => !disponibles.includes(h)),
        totalDisponibles: horariosDisponibles.length };
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
