"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./disponibilidad.module.css";

const inicio = { fecha: "", horas: [] };
const nombresDias = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
export default function DisponibilidadProfesional() {
  const [bloqueos, setBloqueos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [semana, setSemana] = useState({});
  const [nuevo, setNuevo] = useState(inicio);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");
  useEffect(() => { fetch("/api/profesional/disponibilidad", { cache: "no-store" }).then(r => r.json()).then(d => {
    if (!d.ok) throw Error(d.mensaje);
    setBloqueos(d.bloqueos || []); setHorarios(d.horarios || []); setSemana(d.horariosSemanales || {});
  }).catch(e => setError(e.message)).finally(() => setCargando(false)); }, []);
  async function guardar(lista) {
    setGuardando(true); setError(""); setMensaje("");
    try {
      const r = await fetch("/api/profesional/disponibilidad", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bloqueos: lista, horariosSemanales: semana }) });
      const d = await r.json();
      if (!r.ok || !d.ok) throw Error(d.mensaje || "No se pudo guardar");
      setBloqueos(lista); setNuevo(inicio); setMensaje(d.mensaje);
    } catch (e) { setError(e.message); }
    finally { setGuardando(false); }
  }
  return <main className={styles.pagina}>
    <Link href="/profesional" className={styles.volver}>← Volver al panel</Link>
    <h1>Mi disponibilidad</h1>
    <p>Define tu jornada semanal y bloquea días o algunas horas. No podrás cerrar horarios con reservas activas.</p>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {mensaje && <p role="status" className={styles.exito}>{mensaje}</p>}
    {cargando ? <p>Cargando...</p> : <>
      <section className={styles.form}>
        <h2>Horario semanal habitual</h2>
        <p>Marca los bloques en los que trabajas. Los días sin horas marcadas quedan cerrados.</p>
        <div className={styles.semana}>{nombresDias.map((dia, indice) => <div className={styles.filaDia} key={dia}>
          <strong>{dia}</strong>
          <div className={styles.horas}>{horarios.map(h => <label key={h}><input type="checkbox" checked={(semana[String(indice)] || []).includes(h)} onChange={e => setSemana(s => ({ ...s, [String(indice)]: e.target.checked ? [...(s[String(indice)] || []), h] : (s[String(indice)] || []).filter(x => x !== h) }))}/>{h}</label>)}</div>
        </div>)}</div>
        <button disabled={guardando} type="button" onClick={() => guardar(bloqueos)}>{guardando ? "Guardando..." : "Guardar horario semanal"}</button>
      </section>
      <form className={styles.form} onSubmit={e => { e.preventDefault(); if (!nuevo.fecha) return; guardar([...bloqueos.filter(b => b.fecha !== nuevo.fecha), nuevo]); }}>
        <label>Fecha<input type="date" value={nuevo.fecha} onChange={e => setNuevo({ fecha: e.target.value, horas: [] })} required /></label>
        <p>Selecciona horas a bloquear. Si no marcas ninguna, se bloqueará el día completo.</p>
        <div className={styles.horas}>{horarios.map(h => <label key={h}><input type="checkbox" checked={nuevo.horas.includes(h)} onChange={e => setNuevo(a => ({ ...a, horas: e.target.checked ? [...a.horas, h] : a.horas.filter(x => x !== h) }))} />{h}</label>)}</div>
        <button disabled={guardando || !nuevo.fecha} type="submit">{guardando ? "Guardando..." : "Guardar bloqueo"}</button>
      </form>
      <h2>Bloqueos registrados</h2>
      {bloqueos.length === 0 ? <p>No tienes bloqueos registrados.</p> : <div className={styles.listado}>{[...bloqueos].sort((a,b) => a.fecha.localeCompare(b.fecha)).map(b => <div className={styles.item} key={b.fecha}>
        <div><strong>{b.fecha}</strong><p>{b.horas.length ? b.horas.join(", ") : "Día completo"}</p></div>
        <button type="button" disabled={guardando} onClick={() => guardar(bloqueos.filter(x => x.fecha !== b.fecha))}>Quitar</button>
      </div>)}</div>}
    </>}
  </main>;
}
