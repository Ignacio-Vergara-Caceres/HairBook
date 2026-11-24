
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./estadisticas.module.css";

// ==========================================
// CONFIGURACIÓN
// ==========================================

const periodos = [
  { id: "mes", nombre: "Este mes" },
  { id: "anio", nombre: "Este año" },
  { id: "historico", nombre: "Histórico" },
];

const estados = [
  {
    clave: "pendiente",
    nombre: "Pendientes",
    color: "#C59A55",
  },
  {
    clave: "confirmada",
    nombre: "Confirmadas",
    color: "#5B947D",
  },
  {
    clave: "rechazada",
    nombre: "Rechazadas",
    color: "#BC6A79",
  },
  {
    clave: "cancelada",
    nombre: "Canceladas",
    color: "#9996A0",
  },
  {
    clave: "completada",
    nombre: "Completadas",
    color: "#627DA1",
  },
];

// ==========================================
// FUNCIONES AUXILIARES
// ==========================================

function formatoCLP(valor) {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(valor || 0);
}

function obtenerRango(periodo) {
  if (periodo === "historico") return {};

  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());

  const anio = Number(
    partes.find((p) => p.type === "year").value
  );

  const mes = Number(
    partes.find((p) => p.type === "month").value
  );

  if (periodo === "anio") {
    return {
      desde: `${anio}-01-01`,
      hasta: `${anio}-12-31`,
    };
  }

  const numeroMes = String(mes).padStart(2, "0");
  const ultimoDia = new Date(anio, mes, 0).getDate();

  return {
    desde: `${anio}-${numeroMes}-01`,
    hasta: `${anio}-${numeroMes}-${ultimoDia}`,
  };
}

// ==========================================
// GRÁFICO CIRCULAR DE RESERVAS
// ==========================================

function GraficoEstados({ resumen }) {
  const total = Number(resumen?.total || 0);

  const datos = estados.map((estado) => ({
    ...estado,
    cantidad: Number(resumen?.[estado.clave] || 0),
  }));

  const contabilizadas = datos.reduce(
    (suma, item) => suma + item.cantidad,
    0
  );

  const otras = Math.max(0, total - contabilizadas);

  if (otras > 0) {
    datos.push({
      clave: "otros",
      nombre: "Otros estados",
      cantidad: otras,
      color: "#C6BEBB",
    });
  }

  let acumulado = 0;

  const segmentos = datos
    .filter((item) => item.cantidad > 0)
    .map((item) => {
      const inicio = acumulado;

      acumulado += (item.cantidad / total) * 100;

      return `${item.color} ${inicio}% ${acumulado}%`;
    });

  const fondo =
    total > 0
      ? `conic-gradient(${segmentos.join(", ")})`
      : "#EDE7E3";

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "center",
        gap: 50,
        padding: "30px 10px",
      }}
    >
      <div
        role="img"
        aria-label={`Distribución de ${total} reservas`}
        style={{
          width: 250,
          height: 250,
          borderRadius: "50%",
          background: fondo,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "70%",
            height: "70%",
            borderRadius: "50%",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <strong
            style={{
              fontSize: 48,
              fontFamily: "Georgia, serif",
              fontWeight: 400,
              color: "#5e2635",
            }}
          >
            {total}
          </strong>

          <span
            style={{
              fontSize: 14,
              color: "#857477",
            }}
          >
            Reservas
          </span>
        </div>
      </div>

      <div
        style={{
          flex: "1 1 250px",
          maxWidth: 450,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {datos.map((item) => {
          const porcentaje = total
            ? (item.cantidad / total) * 100
            : 0;

          return (
            <div
              key={item.clave}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                borderBottom: "1px solid #eee7e3",
                paddingBottom: 12,
              }}
            >
              <span
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: item.color,
                  flexShrink: 0,
                }}
              />

              <span
                style={{
                  flex: 1,
                  fontSize: 15,
                  color: "#4d4142",
                }}
              >
                {item.nombre}
              </span>

              <strong
                style={{
                  fontSize: 18,
                  color: "#5e2635",
                }}
              >
                {item.cantidad}
              </strong>

              <span
                style={{
                  minWidth: 58,
                  textAlign: "right",
                  fontSize: 13,
                  color: "#8e7b7e",
                }}
              >
                {porcentaje.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ==========================================
// GRÁFICO DE DEMANDA POR SERVICIO
// ==========================================

function GraficoServicios({ servicios, servicioId }) {
  const ordenados = [...servicios].sort(
    (a, b) => b.total - a.total
  );

  const totalReservas = ordenados.reduce(
    (suma, servicio) => suma + servicio.total,
    0
  );

  const maximo = Math.max(
    0,
    ...ordenados.map((servicio) => servicio.total)
  );

  const masSolicitado =
    maximo > 0 ? ordenados[0] : null;

  if (ordenados.length === 0) {
    return (
      <p style={{ padding: "20px 0" }}>
        No hay servicios para mostrar.
      </p>
    );
  }

  return (
    <div style={{ padding: "24px 0 10px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 32,
        }}
      >
        <div>
          <span
            style={{
              fontSize: 13,
              color: "#8e7b7e",
            }}
          >
            Reservas del período
          </span>

          <div
            style={{
              fontFamily: "Georgia, serif",
              fontSize: 36,
              color: "#5e2635",
              marginTop: 5,
            }}
          >
            {totalReservas}
          </div>
        </div>

        <div
          style={{
            background: "#F8F0F2",
            color: "#7A4052",
            padding: "10px 16px",
            borderRadius: 12,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {ordenados.length} servicios
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {ordenados.map((servicio) => {
          const porcentaje = totalReservas
            ? (servicio.total / totalReservas) * 100
            : 0;

          const anchoBarra = maximo
            ? (servicio.total / maximo) * 100
            : 0;

          const esLider =
            masSolicitado?.id === servicio.id;

          const seleccionado =
            servicioId === servicio.id;

          const destacado = servicioId
            ? seleccionado
            : esLider;

          return (
            <div
              key={servicio.id}
              style={{
                padding: "14px 16px",
                borderRadius: 14,
                background: destacado
                  ? "#FBF3F5"
                  : "#FFFFFF",
                border: destacado
                  ? "1px solid #E8CED5"
                  : "1px solid #F0EAE7",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  flexWrap: "wrap",
                  marginBottom: 13,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      fontWeight: destacado ? 700 : 500,
                      color: "#5e2635",
                    }}
                  >
                    {servicio.nombre}
                  </span>

                  {esLider && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "4px 8px",
                        borderRadius: 20,
                        background: "#F1E0E5",
                        color: "#854C5D",
                      }}
                    >
                      Más solicitado
                    </span>
                  )}

                  {seleccionado && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "4px 8px",
                        borderRadius: 20,
                        background: "#E8E0F0",
                        color: "#655079",
                      }}
                    >
                      Seleccionado
                    </span>
                  )}
                </div>

                <span
                  style={{
                    fontSize: 13,
                    color: "#796A6D",
                    whiteSpace: "nowrap",
                  }}
                >
                  <strong
                    style={{
                      fontSize: 16,
                      color: "#5e2635",
                    }}
                  >
                    {servicio.total}
                  </strong>
                  {" · "}
                  {porcentaje.toFixed(1)}%
                </span>
              </div>

              <div
                role="progressbar"
                aria-label={`Demanda de ${servicio.nombre}`}
                aria-valuenow={servicio.total}
                aria-valuemin={0}
                aria-valuemax={maximo || 1}
                style={{
                  width: "100%",
                  height: 13,
                  borderRadius: 20,
                  background: "#F1E9EB",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${anchoBarra}%`,
                    height: "100%",
                    borderRadius: 20,
                    background: destacado
                      ? "linear-gradient(90deg, #85465A, #B7788B)"
                      : "linear-gradient(90deg, #CAA1AE, #D8B4BE)",
                    transition: "width 0.4s ease",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 28,
          padding: "18px 20px",
          borderRadius: 14,
          background: "#F9F6F4",
          border: "1px solid #EEE6E2",
        }}
      >
        {masSolicitado ? (
          <>
            <div
              style={{
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: 1,
                color: "#98747D",
                marginBottom: 8,
                fontWeight: 700,
              }}
            >
              Servicio con mayor demanda
            </div>

            <div
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: "#5e2635",
                marginBottom: 5,
              }}
            >
              {masSolicitado.nombre}
            </div>

            <p
              style={{
                margin: 0,
                fontSize: 13,
                lineHeight: 1.6,
                color: "#74676A",
              }}
            >
              Representa el{" "}
              <strong>
                {(
                  (masSolicitado.total / totalReservas) *
                  100
                ).toFixed(1)}
                %
              </strong>{" "}
              de las reservas registradas durante
              el período seleccionado.
            </p>
          </>
        ) : (
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#74676A",
            }}
          >
            No hay reservas registradas durante
            el período seleccionado.
          </p>
        )}
      </div>
    </div>
  );
}

// ==========================================
// DASHBOARD PRINCIPAL
// ==========================================

export default function EstadisticasCliente() {
  const [periodo, setPeriodo] = useState("mes");
  const [servicioId, setServicioId] = useState("");
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ========================================
  // CONSULTAR ESTADÍSTICAS
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    async function cargarEstadisticas() {
      setCargando(true);
      setError("");

      try {
        const rango = obtenerRango(periodo);
        const parametros = new URLSearchParams(rango);

        const respuesta = await fetch(
          `/api/admin/estadisticas?${parametros.toString()}`,
          {
            signal: controller.signal,
            cache: "no-store",
          }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.ok) {
          throw new Error(
            resultado.mensaje ||
              "Error al cargar estadísticas"
          );
        }

        setDatos(resultado);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
          setDatos(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargarEstadisticas();

    return () => controller.abort();
  }, [periodo]);

  // ========================================
  // FILTROS Y DATOS
  // ========================================

  const servicios = datos?.servicios || [];

  const servicioSeleccionado = servicios.find(
    (servicio) => servicio.id === servicioId
  );

  const servicioIdActivo = servicioSeleccionado?.id || "";

  const resumen = servicioSeleccionado || datos?.resumen;

  // ========================================
  // KPI FINANCIEROS
  // ========================================

  const indicadores = [
    {
      titulo: "Ingresos registrados",
      valor: formatoCLP(resumen?.montoRegistrado),
      descripcion:
        "Suma de abonos vigentes y pagos completos",
      destacada: true,
    },
    {
      titulo: "Abonos vigentes",
      valor: formatoCLP(resumen?.abonosVigentes),
      descripcion:
        "50% de reservas abonadas que aún no están pagadas",
    },
    {
      titulo: "Pagos completos",
      valor: formatoCLP(resumen?.pagosCompletos),
      descripcion:
        "100% de reservas marcadas como pagadas",
    },
  ];

  // ========================================
  // INTERFAZ
  // ========================================

  return (
    <main className={styles.pagina}>
      <div className={styles.contenido}>

        {/* ENCABEZADO */}

        <Link href="/admin" className={styles.volver}>
          ← Volver al panel de administración
        </Link>

        <header className={styles.encabezado}>
          <span className={styles.etiqueta}>
            HAIRBOOK · ADMINISTRACIÓN
          </span>

          <h1>Estadísticas</h1>

          <p>
            Análisis de ingresos registrados,
            reservas y demanda por servicio.
          </p>
        </header>

        {/* FILTROS DE PERÍODO */}

        <nav
          className={styles.filtros}
          aria-label="Filtrar por período"
        >
          {periodos.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`${styles.filtro} ${
                periodo === item.id
                  ? styles.filtroActivo
                  : ""
              }`}
              onClick={() => setPeriodo(item.id)}
            >
              {item.nombre}
            </button>
          ))}
        </nav>

        {/* FILTRO POR SERVICIO */}

        <section
          className={styles.panelGrafico}
          style={{ marginBottom: 30 }}
        >
          <h2>Filtrar por servicio</h2>

          <p>
            Selecciona un servicio para consultar
            sus ingresos y estadísticas individuales.
          </p>

          <select
            aria-label="Seleccionar servicio"
            value={servicioIdActivo}
            onChange={(e) => setServicioId(e.target.value)}
            disabled={cargando || !datos}
            style={{
              marginTop: 20,
              width: "100%",
              maxWidth: 450,
              padding: "14px 16px",
              borderRadius: 12,
              border: "1px solid #e6ded8",
              background: "#fff",
              color: "#5e2635",
              fontWeight: 600,
            }}
          >
            <option value="">
              Todos los servicios
            </option>

            {servicios.map((servicio) => (
              <option
                key={servicio.id}
                value={servicio.id}
              >
                {servicio.nombre}
              </option>
            ))}
          </select>
        </section>

        {/* CARGA Y ERRORES */}

        {cargando && (
          <p role="status">
            Cargando estadísticas...
          </p>
        )}

        {error && (
          <p role="alert" style={{ color: "#a52a2a" }}>
            {error}
          </p>
        )}

        {/* CONTENIDO PRINCIPAL */}

        {!cargando && datos && (
          <>
            {/* KPI FINANCIEROS */}

            <section className={styles.tarjetas}>
              {indicadores.map((indicador) => (
                <article
                  key={indicador.titulo}
                  className={`${styles.tarjeta} ${
                    indicador.destacada
                      ? styles.destacada
                      : ""
                  }`}
                >
                  <h2>{indicador.titulo}</h2>

                  <strong>
                    {indicador.valor}
                  </strong>

                  <p>{indicador.descripcion}</p>
                </article>
              ))}
            </section>

            {/* GRÁFICO CIRCULAR */}

            <section className={styles.panelGrafico}>
              <h2>Distribución de reservas</h2>

              <p>
                {servicioSeleccionado
                  ? `Estados de las reservas de ${servicioSeleccionado.nombre}.`
                  : "Estado general de las reservas del período."}
              </p>

              <GraficoEstados resumen={resumen} />
            </section>

            {/* GRÁFICO DE DEMANDA */}

            <section
              className={styles.panelGrafico}
              style={{ marginTop: 30 }}
            >
              <h2>Demanda por servicio</h2>

              <p>
                Comparación de los servicios más
                solicitados durante el período.
                Los porcentajes representan su
                participación en el total.
              </p>

              <GraficoServicios
                servicios={servicios}
                servicioId={servicioIdActivo}
              />
            </section>
          </>
        )}
      </div>
    </main>
  );
}
