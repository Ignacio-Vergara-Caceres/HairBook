"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./servicios.module.css";

const inicial = { nombre: "", categoria: "", descripcion: "", precioDesde: "", duracionMin: "", destacado: false, activo: true };
const dinero = n => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n || 0);
export default function AdminServiciosPage() {
  const [servicios, setServicios] = useState([]);
  const [form, setForm] = useState(inicial);
  const [editando, setEditando] = useState("");
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  async function cargar() {
    try {
      const r = await fetch("/api/admin/servicios", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok || !d.ok) throw Error(d.mensaje || "No se pudieron cargar los servicios.");
      setServicios(d.datos || []);
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }
  useEffect(() => { cargar(); }, []);
  function editar(s) { setEditando(s._id); setForm({ nombre: s.nombre || "", categoria: s.categoria || "", descripcion: s.descripcion || "", precioDesde: String(s.precioDesde ?? ""), duracionMin: String(s.duracionMin ?? ""), destacado: s.destacado === true, activo: s.activo !== false }); setError(""); setMensaje(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  function cancelar() { setEditando(""); setForm(inicial); }
  async function enviar(url, method, body) {
    setOcupado(true); setError(""); setMensaje("");
    try {
      const r = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const d = await r.json();
      if (!r.ok || !d.ok) throw Error(d.mensaje || "No se pudieron guardar los cambios.");
      setMensaje(method === "POST" ? "Servicio creado correctamente." : "Servicio actualizado correctamente.");
      cancelar(); await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  }
  function guardar(e) {
    e.preventDefault();
    const body = { ...form, precioDesde: Number(form.precioDesde), duracionMin: Number(form.duracionMin) };
    enviar(editando ? `/api/admin/servicios/${editando}` : "/api/admin/servicios", editando ? "PATCH" : "POST", body);
  }
  function cambiarEstado(s) {
    const activo = s.activo === false;
    if (!window.confirm(`¿${activo ? "Reactivar" : "Desactivar"} «${s.nombre}»? ${activo ? "Volverá a aparecer en el catálogo." : "Dejará de aparecer en el catálogo y no se podrá reservar, pero se conservará su historial."}`)) return;
    enviar(`/api/admin/servicios/${s._id}`, "PATCH", { activo });
  }
  return <main className={styles.pagina}>
    <Link href="/admin" className={styles.volver}>← Volver al panel</Link>
    <h1>Gestión de servicios</h1>
    {mensaje && <p className={styles.exito} role="status">{mensaje}</p>}
    {error && <p className={styles.error} role="alert">{error}</p>}
    <form onSubmit={guardar} className={styles.form}>
      <h2>{editando ? "Editar servicio" : "Crear servicio"}</h2>
      <div className={styles.campos}>
        <label>Nombre<input required minLength={2} maxLength={120} value={form.nombre} onChange={e => setForm({ ...form, nombre: e.target.value })} placeholder="Corte de cabello" /></label>
        <label>Categoría<input required minLength={2} maxLength={120} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} placeholder="Corte" /></label>
        <label>Precio desde (CLP)<input required type="number" min="0" max="100000000" step="1" value={form.precioDesde} onChange={e => setForm({ ...form, precioDesde: e.target.value })} /></label>
        <label>Duración (minutos)<input required type="number" min="1" max="1440" step="1" value={form.duracionMin} onChange={e => setForm({ ...form, duracionMin: e.target.value })} /></label>
        <label className={styles.ancho}>Descripción<textarea maxLength={1000} rows={3} value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} /></label>
      </div>
      <div className={styles.opciones}>
        <label><input type="checkbox" checked={form.destacado} onChange={e => setForm({ ...form, destacado: e.target.checked })} /> Destacado</label>
        <label><input type="checkbox" checked={form.activo} onChange={e => setForm({ ...form, activo: e.target.checked })} /> Activo (visible para clientes)</label>
      </div>
      <div className={styles.botones}><button type="submit" disabled={ocupado}>{ocupado ? "Guardando..." : editando ? "Guardar cambios" : "Crear servicio"}</button>{editando && <button type="button" className={styles.secundario} onClick={cancelar}>Cancelar edición</button>}</div>
    </form>
    <h2>Servicios registrados ({servicios.length})</h2>
    {cargando ? <p>Cargando servicios...</p> : servicios.length === 0 ? <p>No hay servicios registrados.</p> : <div className={styles.listado}>{servicios.map(s => <article key={s._id} className={styles.tarjeta}>
      <div><div className={styles.encabezado}><h3>{s.nombre}</h3><span className={s.activo === false ? styles.inactivo : styles.activo}>{s.activo === false ? "Desactivado" : "Activo"}</span></div>
      <p>{s.categoria} {s.destacado ? "· Destacado" : ""}</p><p>{s.descripcion}</p><strong>{dinero(s.precioDesde)} · {s.duracionMin} min</strong></div>
      <div className={styles.botones}><button type="button" disabled={ocupado} onClick={() => editar(s)}>Editar</button><button type="button" disabled={ocupado} className={styles.secundario} onClick={() => cambiarEstado(s)}>{s.activo === false ? "Reactivar" : "Desactivar"}</button></div>
    </article>)}</div>}
  </main>;
}
