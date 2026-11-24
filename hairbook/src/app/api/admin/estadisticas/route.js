
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";
import { normalizarEstadoPago } from "@/lib/estadoPago";

export const dynamic = "force-dynamic";

function crearResumen() {
  return {
    total: 0,
    pendiente: 0,
    confirmada: 0,
    rechazada: 0,
    cancelada: 0,
    completada: 0,

    // Ingresos según el estado de pago.
    montoRegistrado: 0,
    abonosVigentes: 0,
    pagosCompletos: 0,
  };
}

function agregarReserva(resumen, reserva) {
  const estado = reserva.estado || "pendiente";

  resumen.total++;

  if (Object.prototype.hasOwnProperty.call(resumen, estado)) {
    resumen[estado]++;
  }

  // Trabajamos únicamente con el precio referencial.
  const precio = Number(reserva.precioReferencial);

  if (!Number.isFinite(precio) || precio <= 0) {
    return;
  }

  const estadoPago = normalizarEstadoPago(
    reserva.estadoPago
  );

  // Se registra el 50% si está abonada.
  if (estadoPago === "abonada") {
    const abono = Math.round(precio * 0.5);

    resumen.abonosVigentes += abono;
    resumen.montoRegistrado += abono;
  }

  // Se registra el 100% si está pagada.
  // El abono anterior ya está incluido.
  if (estadoPago === "pagada") {
    resumen.pagosCompletos += precio;
    resumen.montoRegistrado += precio;
  }
}

export async function GET(request) {
  try {
    const admin = await obtenerUsuarioAdmin();

    if (!admin) {
      return Response.json(
        {
          ok: false,
          mensaje: "Acceso no autorizado.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const desde = searchParams.get("desde") || "";
    const hasta = searchParams.get("hasta") || "";

    const formatoFecha = /^\d{4}-\d{2}-\d{2}$/;

    if (
      (desde && !formatoFecha.test(desde)) ||
      (hasta && !formatoFecha.test(hasta)) ||
      (desde && hasta && desde > hasta)
    ) {
      return Response.json(
        {
          ok: false,
          mensaje: "Rango de fechas inválido.",
        },
        { status: 400 }
      );
    }

    const db = (await clientPromise).db(
      process.env.MONGODB_DB || "capstone_peluqueria"
    );

    const filtroFechas = {};

    if (desde || hasta) {
      filtroFechas.fecha = {};

      if (desde) {
        filtroFechas.fecha.$gte = desde;
      }

      if (hasta) {
        filtroFechas.fecha.$lte = hasta;
      }
    }

    const [catalogo, reservas] = await Promise.all([
      db.collection("servicios")
        .find({ activo: { $ne: false } })
        .toArray(),

      db.collection("reservas")
        .find(filtroFechas, {
          projection: {
            servicioId: 1,
            servicioNombre: 1,
            estado: 1,
            estadoPago: 1,
            fecha: 1,
            precioReferencial: 1,
          },
        })
        .toArray(),
    ]);

    const general = crearResumen();
    const porServicio = new Map();

    // Incluir todos los servicios activos.
    for (const servicio of catalogo) {
      const id = String(servicio._id);

      porServicio.set(id, {
        id,
        nombre: servicio.nombre,
        activo: true,
        ...crearResumen(),
      });
    }

    // Calcular estadísticas de las reservas.
    for (const reserva of reservas) {
      const id = String(
        reserva.servicioId || "sin-servicio"
      );

      // Conservar servicios históricos.
      if (!porServicio.has(id)) {
        porServicio.set(id, {
          id,
          nombre:
            reserva.servicioNombre ||
            "Servicio anterior",
          activo: false,
          ...crearResumen(),
        });
      }

      agregarReserva(general, reserva);

      agregarReserva(
        porServicio.get(id),
        reserva
      );
    }

    return Response.json({
      ok: true,
      periodo: { desde, hasta },
      resumen: general,
      servicios: Array.from(porServicio.values()),
    });

  } catch (error) {
    console.error(
      "Error obteniendo estadísticas:",
      error
    );

    return Response.json(
      {
        ok: false,
        mensaje:
          "No fue posible cargar las estadísticas.",
      },
      { status: 500 }
    );
  }
}
