"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import styles from "./disponibilidad-instagram-semanal.module.css";

function fechaHoyLocal() {
  const hoy = new Date();
  const offset = hoy.getTimezoneOffset();
  const local = new Date(hoy.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function sumarDias(fechaISO, dias) {
  const base = new Date(`${fechaISO}T00:00:00`);
  base.setDate(base.getDate() + dias);
  const year = base.getFullYear();
  const month = String(base.getMonth() + 1).padStart(2, "0");
  const day = String(base.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function agruparHorarios(horarios) {
  if (!horarios?.length) return [];
  const grupos = [];
  for (let i = 0; i < horarios.length; i += 3) {
    grupos.push(horarios.slice(i, i + 3));
  }
  return grupos;
}

function formatearFechaBonita(fechaISO) {
  if (!fechaISO) return "";
  const [year, month, day] = fechaISO.split("-");
  return `${day}-${month}-${year}`;
}

export default function DisponibilidadInstagramSemanalPage() {
  const hoy = fechaHoyLocal();
  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(sumarDias(hoy, 6));
  const [datosRango, setDatosRango] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mensaje, setMensaje] = useState("");
  const [descargando, setDescargando] = useState(false);

  const maxFechaFin = useMemo(() => sumarDias(fechaInicio, 6), [fechaInicio]);

  useEffect(() => {
    if (fechaFin < fechaInicio) {
      setFechaFin(fechaInicio);
      return;
    }

    if (fechaFin > maxFechaFin) {
      setFechaFin(maxFechaFin);
      return;
    }

    const cargar = async () => {
      setCargando(true);
      setMensaje("");

      try {
        const response = await fetch(
          `/api/disponibilidad-instagram-semanal?fechaInicio=${encodeURIComponent(fechaInicio)}&fechaFin=${encodeURIComponent(fechaFin)}`,
          { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok || !data.ok) {
          setDatosRango([]);
          setMensaje(data.mensaje || "No fue posible cargar la disponibilidad semanal.");
          return;
        }

        setDatosRango(data.rango || []);
      } catch (error) {
        console.error("Error cargando imagen semanal:", error);
        setDatosRango([]);
        setMensaje("No fue posible cargar la disponibilidad semanal.");
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, [fechaInicio, fechaFin, maxFechaFin]);

  const totalHorarios = useMemo(() => {
    return datosRango.reduce((acumulado, dia) => acumulado + (dia.totalDisponibles || 0), 0);
  }, [datosRango]);

  const descargarPNG = async () => {
    try {
      setDescargando(true);

      const canvas = document.createElement("canvas");
      canvas.width = 1080;
      canvas.height = 1350;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("No fue posible inicializar el lienzo.");
      }

      const gradiente = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradiente.addColorStop(0, "#fff8f4");
      gradiente.addColorStop(1, "#f1e1d7");
      ctx.fillStyle = gradiente;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "#1f1a17";
      ctx.font = "700 24px Arial";
      ctx.fillText("HAIRBOOK", 72, 86);

      ctx.font = "700 60px Arial";
      ctx.fillText("Horarios disponibles", 72, 156);

      ctx.fillStyle = "#5f5b58";
      ctx.font = "28px Arial";
      ctx.fillText(
        `${formatearFechaBonita(fechaInicio)} al ${formatearFechaBonita(fechaFin)}`,
        72,
        206
      );

      ctx.fillStyle = "#ffffff";
      roundRect(ctx, 72, 240, 936, 92, 24, true, false);
      ctx.fillStyle = "#1f1a17";
      ctx.font = "bold 24px Arial";
      ctx.fillText(`Total de bloques disponibles: ${totalHorarios}`, 104, 296);

      const columnas = 2;
      const gap = 24;
      const cardWidth = 456;
      const cardHeight = 220;
      const startX = 72;
      const startY = 372;

      datosRango.forEach((dia, index) => {
        const col = index % columnas;
        const row = Math.floor(index / columnas);
        const x = startX + col * (cardWidth + gap);
        const y = startY + row * (cardHeight + gap);

        ctx.fillStyle = "rgba(255,255,255,0.82)";
        roundRect(ctx, x, y, cardWidth, cardHeight, 24, true, false);

        ctx.fillStyle = "#1f1a17";
        ctx.font = "bold 28px Arial";
        ctx.fillText(dia.dia, x + 28, y + 44);

        ctx.fillStyle = "#6f6a66";
        ctx.font = "20px Arial";
        ctx.fillText(dia.fecha, x + 28, y + 74);

        if (dia.horariosDisponibles.length > 0) {
          const grupos = agruparHorarios(dia.horariosDisponibles);
          ctx.fillStyle = "#2a2320";
          ctx.font = "22px Arial";
          grupos.slice(0, 5).forEach((grupo, i) => {
            ctx.fillText(grupo.join(" · "), x + 28, y + 118 + i * 28);
          });
        } else {
          ctx.fillStyle = "#8a4a4a";
          ctx.font = "bold 22px Arial";
          ctx.fillText("Sin cupos disponibles", x + 28, y + 132);
        }
      });

      const enlace = document.createElement("a");
      enlace.download = `hairbook-disponibilidad-${fechaInicio}-a-${fechaFin}.png`;
      enlace.href = canvas.toDataURL("image/png");
      enlace.click();
    } catch (error) {
      console.error("Error descargando PNG:", error);
      setMensaje("No fue posible generar el PNG.");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <main className={styles.contenedor}>
      <section className={styles.panel}>
        <div className={styles.encabezado}>
          <Link href="/admin" className={styles.volverAdmin}>← Panel de administración</Link>
          <h1>Imagen de disponibilidad semanal</h1>
        </div>

        <div className={styles.controles}>
          <label className={styles.campo}>
            <span>Fecha de inicio</span>
            <input
              type="date"
              value={fechaInicio}
              onChange={(e) => setFechaInicio(e.target.value)}
            />
          </label>

          <label className={styles.campo}>
            <span>Fecha de fin</span>
            <input
              type="date"
              value={fechaFin}
              min={fechaInicio}
              max={maxFechaFin}
              onChange={(e) => setFechaFin(e.target.value)}
            />
          </label>

          <div className={styles.resumen}>
            <span>Rango consultado</span>
            <strong>
              {formatearFechaBonita(fechaInicio)} a {formatearFechaBonita(fechaFin)}
            </strong>
            <small>{totalHorarios} bloques disponibles en total</small>
          </div>
        </div>

        <div className={styles.acciones}>
          <button
            type="button"
            className={styles.botonDescarga}
            onClick={descargarPNG}
            disabled={cargando || descargando || datosRango.length === 0}
          >
            {descargando ? "Generando PNG..." : "Descargar PNG"}
          </button>
        </div>

        {mensaje && <p className={styles.error}>{mensaje}</p>}

        <div className={styles.previewWrapper}>
          <div className={styles.previewInstagram}>
            <div className={styles.previewHeader}>
              <div>
                <span className={styles.marca}>HairBook</span>
                <h2>Horarios disponibles</h2>
              </div>
              <span className={styles.badge}>Instagram</span>
            </div>

            <p className={styles.subtitulo}>
              {formatearFechaBonita(fechaInicio)} al {formatearFechaBonita(fechaFin)}
            </p>

            {cargando ? (
              <div className={styles.estado}>Cargando disponibilidad...</div>
            ) : datosRango.length === 0 ? (
              <div className={styles.estado}>No hay datos para mostrar.</div>
            ) : (
              <div className={styles.gridSemana}>
                {datosRango.map((dia) => (
                  <article key={dia.fecha} className={styles.diaCard}>
                    <div className={styles.diaHeader}>
                      <strong>{dia.dia}</strong>
                      <span>{dia.fecha}</span>
                    </div>

                    {dia.horariosDisponibles.length > 0 ? (
                      <div className={styles.horasListas}>
                        {agruparHorarios(dia.horariosDisponibles).map((grupo, index) => (
                          <p key={`${dia.fecha}-${index}`}>
                            {grupo.join(" · ")}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.sinHoras}>Sin cupos disponibles</p>
                    )}
                  </article>
                ))}
              </div>
            )}

          </div>
        </div>
      </section>
    </main>
  );
}

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
  let r = radius;
  if (width < 2 * r) r = width / 2;
  if (height < 2 * r) r = height / 2;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
  if (fill) ctx.fill();
  if (stroke) ctx.stroke();
}
