
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

// Obtiene fecha y hora actuales de Chile.
// Evita problemas con el horario del computador
// y los cambios de horario de verano/invierno.
function obtenerFechaHoraChile() {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  const valores = Object.fromEntries(
    partes.map(({ type, value }) => [type, value])
  );

  return (
    `${valores.year}-${valores.month}-${valores.day}` +
    `T${valores.hour}:${valores.minute}`
  );
}

function esReservaFutura(reserva) {
  return (
    `${reserva.fecha}T${reserva.hora.slice(0, 5)}` >
    obtenerFechaHoraChile()
  );
}

export default function AdminReservasPage() {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [reservaProcesando, setReservaProcesando] = useState(null);
  const [fechaActual, setFechaActual] = useState("");

  // Cargar reservas al abrir la página.
  useEffect(() => {
    setFechaActual(obtenerFechaHoraChile());

    async function cargarReservas() {
      try {
        const respuesta = await fetch("/api/admin/reservas", {
          cache: "no-store",
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok || !resultado.ok) {
          throw new Error(
            resultado.mensaje || "Error al cargar reservas."
          );
        }

        setReservas(resultado.datos || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    }

    cargarReservas();
  }, []);

  // Aceptar o rechazar una reserva.
  async function actualizarReserva(id, estado) {
    const accion =
      estado === "confirmada" ? "aceptar" : "rechazar";

    const confirmar = window.confirm(
      `¿Estás seguro de que deseas ${accion} esta reserva?`
    );

    if (!confirmar) return;

    setReservaProcesando(id);
    setMensaje("");
    setError("");

    try {
      const respuesta = await fetch(
        `/api/admin/reservas/${id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ estado }),
        }
      );

      const resultado = await respuesta.json();

      if (!respuesta.ok || !resultado.ok) {
        throw new Error(
          resultado.mensaje ||
            "No fue posible actualizar la reserva."
        );
      }

      // Actualizar la tabla sin recargar la página.
      setReservas((anteriores) =>
        anteriores.map((reserva) =>
          reserva.id === id
            ? { ...reserva, estado: resultado.estado }
            : reserva
        )
      );

      setMensaje(resultado.mensaje);
    } catch (err) {
      setError(err.message);
    } finally {
      setReservaProcesando(null);
      setFechaActual(obtenerFechaHoraChile());
    }
  }

  function mostrarEstado(estado) {
    if (estado === "confirmada") {
      return <strong style={{ color: "green" }}>Confirmada</strong>;
    }

    if (estado === "rechazada") {
      return <strong style={{ color: "#b91c1c" }}>Rechazada</strong>;
    }

    if (estado === "cancelada") {
      return <strong>Cancelada</strong>;
    }

    return <strong style={{ color: "#a66b00" }}>Pendiente</strong>;
  }

  return (
    <main
      style={{
        padding: "40px 20px",
        maxWidth: "1200px",
        margin: "auto",
      }}
    >
      <Link href="/admin">
        ← Volver al panel de administración
      </Link>

      <h1>Gestión de reservas</h1>

      <p>
        Consulta, acepta o rechaza las solicitudes
        realizadas por las clientas.
      </p>

      {cargando && <p>Cargando reservas...</p>}

      {error && (
        <p role="alert" style={{ color: "#b91c1c" }}>
          {error}
        </p>
      )}

      {mensaje && (
        <p role="status" style={{ color: "green" }}>
          {mensaje}
        </p>
      )}

      {!cargando && (
        <div style={{ overflowX: "auto", marginTop: "24px" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr>
                {[
                  "Clienta",
                  "Servicio",
                  "Fecha",
                  "Hora",
                  "Estado",
                  "Notas",
                  "Acciones",
                ].map((titulo) => (
                  <th
                    key={titulo}
                    style={{
                      textAlign: "left",
                      padding: "12px",
                      borderBottom: "2px solid #ddd",
                    }}
                  >
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {reservas.map((reserva) => {
                const pendiente =
                  reserva.estado === "pendiente";

                const futura =
                  fechaActual !== "" &&
                  `${reserva.fecha}T${reserva.hora.slice(0, 5)}` >
                    fechaActual;

                return (
                  <tr key={reserva.id}>
                    <td style={{ padding: "12px" }}>
                      {reserva.cliente}
                    </td>

                    <td style={{ padding: "12px" }}>
                      {reserva.servicio}
                    </td>

                    <td style={{ padding: "12px" }}>
                      {reserva.fecha}
                    </td>

                    <td style={{ padding: "12px" }}>
                      {reserva.hora}
                    </td>

                    <td style={{ padding: "12px" }}>
                      {mostrarEstado(reserva.estado)}
                    </td>

                    <td style={{ padding: "12px" }}>
                      {reserva.notas || "Sin notas"}
                    </td>

                    <td style={{ padding: "12px" }}>
                      {pendiente && futura ? (
                        <div
                          style={{
                            display: "flex",
                            gap: "8px",
                          }}
                        >
                          <button
                            type="button"
                            onClick={() =>
                              actualizarReserva(
                                reserva.id,
                                "confirmada"
                              )
                            }
                            disabled={
                              reservaProcesando !== null
                            }
                            style={{
                              padding: "8px 12px",
                              background: "#287a47",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                          >
                            {reservaProcesando === reserva.id
                              ? "Procesando..."
                              : "Aceptar"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              actualizarReserva(
                                reserva.id,
                                "rechazada"
                              )
                            }
                            disabled={
                              reservaProcesando !== null
                            }
                            style={{
                              padding: "8px 12px",
                              background: "#a32e39",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                            }}
                          >
                            Rechazar
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "#777" }}>
                          {pendiente
                            ? "Fecha vencida"
                            : "Gestionada"}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {reservas.length === 0 && !error && (
            <p>No existen reservas registradas.</p>
          )}
        </div>
      )}
    </main>
  );
}
