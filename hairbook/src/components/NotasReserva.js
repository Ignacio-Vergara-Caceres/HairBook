
"use client";

import { useState } from "react";

export default function NotasReserva({
    reservaId,
    rol,
    estado,
}) {
    const [abierto, setAbierto] = useState(false);
    const [comentario, setComentario] = useState("");
    const [notas, setNotas] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState("");
    const [error, setError] = useState("");

    const puedeEscribir =
        rol === "profesional" &&
        ["confirmada", "completada"].includes(estado);

    const url = `/api/notas-reservas/${reservaId}`;

    // Consultar las notas anteriores del cliente
    async function cargarNotas() {
        setCargando(true);
        setError("");

        try {
            const respuesta = await fetch(url, {
                cache: "no-store",
            });

            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                throw new Error(
                    datos.mensaje || "No se pudieron cargar las notas."
                );
            }

            setNotas(datos.notas || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setCargando(false);
        }
    }

    // Guardar nota solamente si el profesional lo desea
    async function guardarNota(evento) {
        evento.preventDefault();

        const texto = comentario.trim();

        if (!texto || guardando) return;

        setGuardando(true);
        setError("");
        setMensaje("");

        try {
            const respuesta = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    comentario: texto,
                }),
            });

            const datos = await respuesta.json();

            if (!respuesta.ok || !datos.ok) {
                throw new Error(
                    datos.mensaje || "No se pudo guardar la nota."
                );
            }

            setComentario("");
            setMensaje("Nota guardada correctamente.");

            await cargarNotas();
        } catch (err) {
            setError(err.message);
        } finally {
            setGuardando(false);
        }
    }

    async function abrirHistorial() {
        if (abierto) {
            setAbierto(false);
            return;
        }

        setAbierto(true);
        await cargarNotas();
    }

    return (
        <section
            style={{
                marginTop: 16,
                padding: 18,
                border: "1px solid #eadde1",
                borderRadius: 14,
                background: "#fffafc",
            }}
        >

            <button
                type="button"
                onClick={abrirHistorial}
                aria-expanded={abierto}
                style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    background: abierto ? "#ffffff" : "#5e2635",
                    border: "1px solid #5e2635",
                    color: abierto ? "#5e2635" : "#ffffff",
                    fontWeight: 600,
                    fontSize: 14,
                    fontFamily: "inherit",
                    cursor: "pointer",
                    padding: "12px 20px",
                    borderRadius: 10,
                    transition: "all 0.2s ease",
                }}
            >
                <span aria-hidden="true">
                    {abierto ? "−" : "+"}
                </span>

                {abierto
                    ? "Ocultar historial de notas"
                    : "Ver notas e historial del cliente"}
            </button>


            {abierto && (
                <div style={{ marginTop: 18 }}>
                    {cargando && <p>Cargando notas...</p>}

                    {error && (
                        <p role="alert" style={{ color: "#b42318" }}>
                            {error}
                        </p>
                    )}

                    {mensaje && (
                        <p role="status" style={{ color: "#28754a" }}>
                            {mensaje}
                        </p>
                    )}

                    {!cargando && notas.length === 0 && !error && (
                        <p
                            style={{
                                fontSize: 13,
                                color: "#777",
                            }}
                        >
                            Este cliente todavía no tiene notas registradas.
                        </p>
                    )}

                    {/* HISTORIAL DEL CLIENTE */}

                    {!cargando &&
                        notas.map((nota) => (
                            <article
                                key={nota.id}
                                style={{
                                    padding: "14px 0",
                                    borderBottom: "1px solid #eadde1",
                                }}
                            >
                                <strong style={{ color: "#5e2635" }}>
                                    {nota.servicio || "Servicio"}
                                </strong>

                                <p
                                    style={{
                                        margin: "8px 0",
                                        fontSize: 14,
                                        whiteSpace: "pre-wrap",
                                        overflowWrap: "anywhere",
                                    }}
                                >
                                    {nota.comentario}
                                </p>

                                <small style={{ color: "#777" }}>
                                    {nota.profesional || "Profesional"}
                                    {" · "}
                                    {nota.fechaServicio || "Sin fecha"}
                                </small>
                            </article>
                        ))}

                    {/* CAMPO OPCIONAL PARA EL PROFESIONAL */}

                    {puedeEscribir && (
                        <form
                            onSubmit={guardarNota}
                            style={{ marginTop: 20 }}
                        >
                            <label
                                htmlFor={`comentario-${reservaId}`}
                                style={{
                                    display: "block",
                                    marginBottom: 8,
                                    color: "#5e2635",
                                    fontWeight: 600,
                                }}
                            >
                                Agregar nota técnica (opcional)
                            </label>

                            <textarea
                                id={`comentario-${reservaId}`}
                                value={comentario}
                                onChange={(e) =>
                                    setComentario(e.target.value)
                                }
                                placeholder="Ej.: Se mezclaron los tonos 7.1 y 8.3. Se realizó corte en capas largas..."
                                maxLength={1500}
                                rows={4}
                                style={{
                                    width: "100%",
                                    boxSizing: "border-box",
                                    padding: 12,
                                    borderRadius: 10,
                                    border: "1px solid #d8c5cb",
                                    resize: "vertical",
                                    fontFamily: "inherit",
                                    fontSize: 14,
                                }}
                            />

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: 12,
                                    marginTop: 10,
                                }}
                            >
                                <small style={{ color: "#777" }}>
                                    {comentario.length}/1500
                                </small>

                                <button
                                    type="submit"
                                    disabled={
                                        guardando || !comentario.trim()
                                    }
                                    style={{
                                        padding: "10px 18px",
                                        background: "#5e2635",
                                        color: "white",
                                        border: "none",
                                        borderRadius: 10,
                                        cursor: "pointer",
                                        opacity:
                                            guardando || !comentario.trim()
                                                ? 0.5
                                                : 1,
                                    }}
                                >
                                    {guardando
                                        ? "Guardando..."
                                        : "Guardar nota"}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            )}
        </section>
    );
}
