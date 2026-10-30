"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./gestionReservas.module.css";

function fechaHoraChile() {
  const partes = new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date());
  return partes.replace(" ", "T");
}
const estados = { pendiente: "Pendiente", confirmada: "Confirmada", rechazada: "Rechazada", cancelada: "Cancelada", completada: "Completada" };
export default function GestionReservas({ rol = "admin" }) {
  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState("");
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [editar, setEditar] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [horarios, setHorarios] = useState([]);
  const [filtro, setFiltro] = useState("todos");
  const [profesionales, setProfesionales] = useState([]);
  const [asignaciones, setAsignaciones] = useState({});
  const base = `/api/${rol}/reservas`;
  async function cargar() {
    try {
      const res = await fetch(base, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw Error(data.mensaje || "Error al cargar reservas.");
      setReservas(data.datos || []);
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }
  useEffect(() => {
    cargar();
    if (rol === "admin") fetch("/api/admin/profesionales", { cache: "no-store" }).then(r => r.json()).then(d => { if (d.ok) setProfesionales((d.datos || []).filter(p => p.activo)); }).catch(() => {});
  }, [rol]); // eslint-disable-line react-hooks/exhaustive-deps
  async function gestionar(r, body) {
    const etiqueta = body.accion === "modificar" ? "reprogramar" : body.estado === "confirmada" ? "aceptar" : body.estado === "rechazada" ? "rechazar" : body.estado === "cancelada" ? "cancelar" : "completar";
    if (!window.confirm(`¿Quieres ${etiqueta} esta reserva?`)) return;
    setProcesando(r.id); setError(""); setMensaje("");
    try {
      const res = await fetch(`${base}/${r.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw Error(data.mensaje || "No se pudo actualizar la reserva.");
      setMensaje(`${data.mensaje} ${data.aviso || ""}`);
      setEditar(""); await cargar();
    } catch (e) { setError(e.message); }
    finally { setProcesando(""); }
  }
  async function consultarHorarios(r, valor) {
    setFecha(valor); setHora(""); setHorarios([]); if (!valor) return;
    if (!r.profesionalId) { setError("Esta reserva antigua no tiene profesional. Primero debe asignarla el administrador."); return; }
    try {
      const query = new URLSearchParams({ fecha: valor, profesionalId: r.profesionalId, servicioId: r.servicioId });
      const res = await fetch(`/api/disponibilidad?${query.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.ok) throw Error(data.mensaje || "Sin disponibilidad.");
      const opciones = data.horariosDisponibles || [];
      if (valor === r.fecha && !opciones.includes(r.hora)) opciones.push(r.hora);
      setHorarios(opciones.sort());
    } catch (e) { setError(e.message); }
  }
  const ahora = fechaHoraChile();
  const mostradas = filtro === "todos" ? reservas : reservas.filter(r => r.estado === filtro);
  return <main className={styles.pagina}>
    <Link href={`/${rol}`} className={styles.volver}>← Volver al panel</Link>
    <div className={styles.cabecera}><div><h1>{rol === "admin" ? "Gestión de reservas" : "Mis reservas"}</h1><p>{rol === "admin" ? "Consulta las reservas de la peluquería." : "Acepta, rechaza, modifica y completa tus propias reservas."}</p></div><select aria-label="Filtrar por estado" value={filtro} onChange={e => setFiltro(e.target.value)}><option value="todos">Todos los estados</option>{Object.entries(estados).map(([clave, txt]) => <option key={clave} value={clave}>{txt}</option>)}</select></div>
    {mensaje && <p className={styles.aviso} role="status">{mensaje}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    {cargando ? <p>Cargando reservas...</p> : <div className={styles.lista}>
      {!mostradas.length && <p>No hay reservas para mostrar.</p>}
      {mostradas.map(r => {
        const futura = `${r.fecha}T${r.hora}` > ahora;
        const pendiente = r.estado === "pendiente";
        const confirmada = r.estado === "confirmada";
        return <article key={r.id} className={styles.tarjeta}>
          <div className={styles.titulo}><div><h2>{r.servicio}</h2><p>{r.cliente} · {r.fecha} a las {r.hora}</p><small>Profesional: {r.profesional}</small></div><span className={`${styles.estado} ${styles[r.estado] || ""}`}>{estados[r.estado] || r.estado}</span></div>
          {r.notas && <p className={styles.notas}>Notas: {r.notas}</p>}
          {rol === "admin" && ["pendiente", "confirmada"].includes(r.estado) && <form className={styles.editar} onSubmit={e => { e.preventDefault(); gestionar(r, { accion: "asignar", profesionalId: asignaciones[r.id] }); }}>
            <label>{r.profesionalId ? "Reasignar profesional" : "Asignar reserva anterior"}<select required value={asignaciones[r.id] || ""} onChange={e => setAsignaciones(v => ({ ...v, [r.id]: e.target.value }))}><option value="">Seleccionar profesional</option>{profesionales.filter(p => p.serviciosIds.includes(r.servicioId) && p.id !== r.profesionalId).map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}</select></label>
            <button type="submit" disabled={!!procesando || !asignaciones[r.id]}>{r.profesionalId ? "Reasignar" : "Asignar"}</button>
          </form>}
          <div className={styles.acciones}>
            {r.telefono && <Link className={styles.chat} href={`/${rol}/whatsapp?telefono=${encodeURIComponent(r.telefono)}`}>Abrir chat</Link>}
            {futura && pendiente && <><button className={styles.aceptar} disabled={!!procesando} onClick={() => gestionar(r, { estado: "confirmada" })}>Aceptar</button><button className={styles.rechazar} disabled={!!procesando} onClick={() => gestionar(r, { estado: "rechazada" })}>Rechazar</button></>}
            {futura && (pendiente || confirmada) && <><button className={styles.modificar} disabled={!!procesando || !r.profesionalId} title={!r.profesionalId ? "Reserva anterior sin profesional asignado" : ""} onClick={() => { setEditar(editar === r.id ? "" : r.id); if (editar !== r.id) { setError(""); consultarHorarios(r, r.fecha); } }}>Modificar horario</button><button className={styles.cancelar} disabled={!!procesando} onClick={() => gestionar(r, { estado: "cancelada" })}>Cancelar</button></>}
            {!futura && confirmada && <button className={styles.aceptar} disabled={!!procesando} onClick={() => gestionar(r, { estado: "completada" })}>Marcar completada</button>}
          </div>
          {editar === r.id && <form className={styles.editar} onSubmit={e => { e.preventDefault(); gestionar(r, { accion: "modificar", fecha, hora }); }}>
            <label>Fecha<input type="date" min={ahora.slice(0, 10)} value={fecha} onChange={e => consultarHorarios(r, e.target.value)} required /></label>
            <label>Hora<select value={hora} onChange={e => setHora(e.target.value)} required><option value="">Seleccionar hora</option>{horarios.map(h => <option key={h} value={h}>{h}</option>)}</select></label>
            <button type="submit" disabled={!!procesando || !hora || (fecha === r.fecha && hora === r.hora)}>Guardar cambio</button>
          </form>}
        </article>;
      })}
    </div>}
  </main>;
}
