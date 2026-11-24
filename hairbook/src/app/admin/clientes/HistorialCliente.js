
"use client";

import { useEffect, useState } from "react";

const colores = {
  principal: "#5e2635",
  secundario: "#786b6e",
  borde: "#e8dcd6",
};

function formatearFecha(fecha) {
  if (!fecha) return "Sin fecha";

  if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    const [anio, mes, dia] = fecha.split("-");
    return `${dia}/${mes}/${anio}`;
  }

  return new Date(fecha).toLocaleDateString("es-CL");
}

function nombreEstado(estado) {
  const nombres = {
    pendiente: "Pendiente",
    confirmada: "Confirmada",
    rechazada: "Rechazada",
    cancelada: "Cancelada",
    completada: "Completada",
  };

  return nombres[estado] || estado || "Sin estado";
}

export default function HistorialCliente({ clienteId }) {
  const [abierto, setAbierto] = useState(false);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!abierto) return;

    const controller = new AbortController();

    async function cargarHistorial() {
      setCargando(true);
      setError("");

      try {
        const respuesta = await fetch(
          `/api/admin/clientes/${clienteId}/historial`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.ok) {
          throw new Error(
            resultado.mensaje ||
              "No se pudo cargar el historial."
          );
        }

        setDatos(resultado);
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }

    cargarHistorial();

    return () => controller.abort();
  }, [abierto, clienteId]);

  const reservas = datos?.reservas || [];
  const notas = datos?.notas || [];

  return (
    <div style={{ marginTop: 18 }}>
      <button
        type="button"
        onClick={() => setAbierto(!abierto)}
        aria-expanded={abierto}
        aria-controls={`historial-${clienteId}`}
        style={{
          padding: "11px 18px",
          background: abierto
            ? "#ffffff"
            : colores.principal,
          color: abierto
            ? colores.principal
            : "#ffffff",
          border: `1px solid ${colores.principal}`,
          borderRadius: 10,
          cursor: "pointer",
          fontFamily: "inherit",
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        {abierto ? "Ocultar historial" : "Ver historial"}
      </button>

      {abierto && (
        <section
          id={`historial-${clienteId}`}
          style={{
            marginTop: 18,
            paddingTop: 18,
            borderTop: `1px solid ${colores.borde}`,
          }}
        >
          {cargando && (
            <p role="status">Cargando historial...</p>
          )}

          {error && (
            <p role="alert" style={{ color: "#b42318" }}>
              {error}
            </p>
          )}

          {!cargando && datos && !error && (
            <>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 12,
                  marginBottom: 20,
                  color: colores.secundario,
                  fontSize: 13,
                }}
              >
                <span>
                  {datos.totalReservas} reservas
                </span>

                <span>
                  {datos.totalNotas} notas técnicas
                </span>
              </div>

              {reservas.length === 0 && (
                <p
                  style={{
                    color: colores.secundario,
                    fontSize: 14,
                  }}
                >
                  Este cliente todavía no tiene
                  reservas registradas.
                </p>
              )}

              {reservas.map((reserva) => {
                const notasReserva = notas.filter(
                  (nota) =>
                    nota.reservaId === reserva.id
                );

                return (
                  <article
                    key={reserva.id}
                    style={{
                      padding: 16,
                      marginBottom: 14,
                      border: `1px solid ${colores.borde}`,
                      borderRadius: 12,
                      background: "#fcfaf8",
                    }}
                  >
                    <h3
                      style={{
                        color: colores.principal,
                        fontSize: 16,
                        margin: "0 0 10px",
                      }}
                    >
                      {reserva.servicio}
                    </h3>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                        fontSize: 13,
                        color: colores.secundario,
                      }}
                    >
                      <span>
                        Fecha:{" "}
                        {formatearFecha(reserva.fecha)}
                        {reserva.hora
                          ? ` · ${reserva.hora}`
                          : ""}
                      </span>

                      <span>
                        Profesional: {reserva.profesional}
                      </span>

                      <span>
                        Estado: {nombreEstado(reserva.estado)}
                      </span>
                    </div>

                    {notasReserva.length > 0 && (
                      <div
                        style={{
                          marginTop: 16,
                          paddingTop: 14,
                          borderTop: `1px solid ${colores.borde}`,
                        }}
                      >
                        <h4
                          style={{
                            color: colores.principal,
                            fontSize: 14,
                            margin: "0 0 10px",
                          }}
                        >
                          Notas técnicas
                        </h4>

                        {notasReserva.map((nota) => (
                          <div
                            key={nota.id}
                            style={{
                              marginBottom: 12,
                            }}
                          >
                            <p
                              style={{
                                fontSize: 14,
                                lineHeight: 1.6,
                                margin: "0 0 6px",
                                whiteSpace: "pre-wrap",
                                overflowWrap: "anywhere",
                              }}
                            >
                              {nota.comentario}
                            </p>

                            <small
                              style={{
                                color: colores.secundario,
                              }}
                            >
                              {nota.profesional}
                            </small>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                );
              })}

              {/* Notas históricas sin una reserva
                  presente en el listado */}

              {notas
                .filter(
                  (nota) =>
                    !reservas.some(
                      (reserva) =>
                        reserva.id === nota.reservaId
                    )
                )
                .map((nota) => (
                  <article
                    key={nota.id}
                    style={{
                      padding: 16,
                      marginTop: 12,
                      border: `1px solid ${colores.borde}`,
                      borderRadius: 12,
                    }}
                  >
                    <strong
                      style={{
                        color: colores.principal,
                      }}
                    >
                      {nota.servicio}
                    </strong>

                    <p
                      style={{
                        whiteSpace: "pre-wrap",
                        overflowWrap: "anywhere",
                        fontSize: 14,
                      }}
                    >
                      {nota.comentario}
                    </p>

                    <small
                      style={{
                        color: colores.secundario,
                      }}
                    >
                      {nota.profesional} ·{" "}
                      {formatearFecha(nota.fechaServicio)}
                    </small>
                  </article>
                ))}
            </>
          )}
        </section>
      )}
    </div>
  );
}
