
import Link from "next/link";
import { redirect } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";
import styles from "./estadisticas.module.css";

export const dynamic = "force-dynamic";

// Obtener precio válido
function obtenerPrecio(valor) {
  if (typeof valor === "number") {
    return Number.isFinite(valor) ? Math.max(0, valor) : 0;
  }

  if (typeof valor === "string") {
    return Number(valor.replace(/[^\d]/g, "")) || 0;
  }

  return 0;
}

// Formatear valores en pesos chilenos
function formatearPrecio(valor) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(valor);
}

export default async function EstadisticasPage({ searchParams }) {

  // Verificar que el usuario sea administrador
  const admin = await obtenerUsuarioAdmin();

  if (!admin) {
    redirect("/");
  }

  // ----------------------------------------
  // FILTROS POR PERÍODO
  // ----------------------------------------

  const parametros = await searchParams;
  const periodoSolicitado = parametros?.periodo;

  const periodo = ["mes", "anio", "historico"].includes(periodoSolicitado)
    ? periodoSolicitado
    : "mes";

  // Obtener fecha actual de Chile
  const partesFecha = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const anioActual = Number(
    partesFecha.find((parte) => parte.type === "year").value
  );

  const mesActual = Number(
    partesFecha.find((parte) => parte.type === "month").value
  );

  // Preparar filtro de MongoDB
  let filtroFecha = {};

  if (periodo === "mes") {
    const inicio = `${anioActual}-${String(mesActual).padStart(2, "0")}-01`;

    const siguienteMes = mesActual === 12
      ? `${anioActual + 1}-01-01`
      : `${anioActual}-${String(mesActual + 1).padStart(2, "0")}-01`;

    filtroFecha = {
      fecha: {
        $gte: inicio,
        $lt: siguienteMes,
      },
    };
  }

  if (periodo === "anio") {
    filtroFecha = {
      fecha: {
        $gte: `${anioActual}-01-01`,
        $lt: `${anioActual + 1}-01-01`,
      },
    };
  }

  // ----------------------------------------
  // CONEXIÓN CON MONGODB
  // ----------------------------------------

  const client = await clientPromise;

  const db = client.db(
    process.env.MONGODB_DB || "capstone_peluqueria"
  );

  // Consultar las reservas según el período
  const reservas = await db.collection("reservas")
    .find(filtroFecha, {
      projection: {
        fecha: 1,
        estado: 1,
        precioReferencial: 1,
        precioFinal: 1,
      },
    })
    .toArray();

  // ----------------------------------------
  // CALCULAR INDICADORES
  // ----------------------------------------

  const conteos = {
    pendiente: 0,
    confirmada: 0,
    rechazada: 0,
    cancelada: 0,
    completada: 0,
  };

  let ingresosEstimados = 0;

  reservas.forEach((reserva) => {
    const estado = reserva.estado || "pendiente";

    if (Object.prototype.hasOwnProperty.call(conteos, estado)) {
      conteos[estado]++;
    }

    // Sumar ingresos de reservas aprobadas
    if (estado === "confirmada" || estado === "completada") {
      const precio = reserva.precioFinal ??
        reserva.precioReferencial;

      ingresosEstimados += obtenerPrecio(precio);
    }
  });

  const aprobadas = conteos.confirmada + conteos.completada;
  const total = reservas.length;

  // Porcentaje de aprobación
  const porcentajeAprobacion = total > 0
    ? ((aprobadas / total) * 100).toFixed(1)
    : "0.0";

  // ----------------------------------------
  // TARJETAS KPI
  // ----------------------------------------

  const indicadores = [
    {
      titulo: "Total de reservas",
      valor: total,
      descripcion: "Todas las solicitudes registradas",
    },
    {
      titulo: "Reservas aprobadas",
      valor: aprobadas,
      descripcion: "Confirmadas y completadas",
    },
    {
      titulo: "Reservas rechazadas",
      valor: conteos.rechazada,
      descripcion: "Solicitudes rechazadas",
    },
    {
      titulo: "Reservas pendientes",
      valor: conteos.pendiente,
      descripcion: "Esperando confirmación",
    },
    {
      titulo: "Citas completadas",
      valor: conteos.completada,
      descripcion: "Atenciones finalizadas",
    },
    {
      titulo: "Ingresos estimados",
      valor: formatearPrecio(ingresosEstimados),
      descripcion: "Valor de reservas confirmadas y completadas",
      destacada: true,
    },
  ];

  // ----------------------------------------
  // DATOS PARA EL GRÁFICO
  // ----------------------------------------

  const estados = [
    { nombre: "Pendientes", clave: "pendiente" },
    { nombre: "Confirmadas", clave: "confirmada" },
    { nombre: "Rechazadas", clave: "rechazada" },
    { nombre: "Canceladas", clave: "cancelada" },
    { nombre: "Completadas", clave: "completada" },
  ];

  // ----------------------------------------
  // INTERFAZ
  // ----------------------------------------

  return (
    <main className={styles.pagina}>
      <div className={styles.contenido}>

        <Link href="/admin" className={styles.volver}>
          ← Volver al panel de administración
        </Link>

        {/* ENCABEZADO */}

        <header className={styles.encabezado}>
          <span className={styles.etiqueta}>
            HAIRBOOK · ADMINISTRACIÓN
          </span>

          <h1>Estadísticas</h1>

          <p>
            Resumen general de reservas e ingresos estimados
            de la peluquería.
          </p>
        </header>

        {/* FILTROS POR PERÍODO */}

        <nav
          className={styles.filtros}
          aria-label="Filtrar estadísticas"
        >
          <Link
            href="/admin/estadisticas?periodo=mes"
            className={`${styles.filtro} ${
              periodo === "mes" ? styles.filtroActivo : ""
            }`}
            aria-current={periodo === "mes" ? "page" : undefined}
          >
            Este mes
          </Link>

          <Link
            href="/admin/estadisticas?periodo=anio"
            className={`${styles.filtro} ${
              periodo === "anio" ? styles.filtroActivo : ""
            }`}
            aria-current={periodo === "anio" ? "page" : undefined}
          >
            Este año
          </Link>

          <Link
            href="/admin/estadisticas?periodo=historico"
            className={`${styles.filtro} ${
              periodo === "historico" ? styles.filtroActivo : ""
            }`}
            aria-current={periodo === "historico" ? "page" : undefined}
          >
            Histórico
          </Link>
        </nav>

        {/* TARJETAS DE INDICADORES */}

        <section className={styles.tarjetas}>
          {indicadores.map((indicador) => (
            <article
              key={indicador.titulo}
              className={`${styles.tarjeta} ${
                indicador.destacada ? styles.destacada : ""
              }`}
            >
              <h2>{indicador.titulo}</h2>

              <strong>{indicador.valor}</strong>

              <p>{indicador.descripcion}</p>
            </article>
          ))}
        </section>

        {/* DISTRIBUCIÓN DE RESERVAS */}

        <section className={styles.panelGrafico}>
          <h2>Distribución de reservas</h2>

          <p>
            Estado de las solicitudes durante el período
            seleccionado.
          </p>

          <div className={styles.grafico}>
            {estados.map((item) => {
              const cantidad = conteos[item.clave];

              const porcentaje = total > 0
                ? (cantidad / total) * 100
                : 0;

              return (
                <div
                  className={styles.fila}
                  key={item.clave}
                >
                  <div className={styles.filaTexto}>
                    <span>{item.nombre}</span>
                    <strong>{cantidad}</strong>
                  </div>

                  <div className={styles.pista}>
                    <div
                      className={`${styles.barra} ${styles[item.clave]}`}
                      style={{
                        width: `${porcentaje}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* INFORMACIÓN ADICIONAL */}

        <p className={styles.nota}>
          Porcentaje de aprobación del período:{" "}
          <strong>{porcentajeAprobacion}%</strong>.
        </p>

        <p className={styles.nota}>
          Los ingresos son estimaciones basadas en el precio
          registrado de las reservas confirmadas o completadas.
          No representan pagos efectivamente recibidos.
        </p>

      </div>
    </main>
  );
}
