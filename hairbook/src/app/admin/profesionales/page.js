"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import styles from "./profesionales.module.css";

const vacio = { nombre: "", rut: "", contrasena: "", especialidad: "", serviciosIds: [] };
export default function AdminProfesionalesPage() {
  const [pros, setPros] = useState([]);
  const [servicios, setServicios] = useState([]);
  const [nuevo, setNuevo] = useState(vacio);
  const [editando, setEditando] = useState("");
  const [cambio, setCambio] = useState({});
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");
  async function cargar() {
    try {
      const [a, b] = await Promise.all([fetch("/api/admin/profesionales", { cache: "no-store" }), fetch("/api/servicios", { cache: "no-store" })]);
      const [p, s] = await Promise.all([a.json(), b.json()]);
      if (!a.ok || !p.ok || !b.ok || !s.ok) throw Error(p.mensaje || s.mensaje || "Error cargando los datos.");
      setPros(p.datos || []); setServicios(s.datos || []);
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }
  useEffect(() => { cargar(); }, []);
  function cambiarServicio(state, setter, id) { setter({ ...state, serviciosIds: state.serviciosIds.includes(id) ? state.serviciosIds.filter(x => x !== id) : [...state.serviciosIds, id] }); }
  async function enviar(path, method, data) {
    setError(""); setMensaje(""); setOcupado(true);
    try {
      const r = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
      const d = await r.json();
      if (!r.ok || !d.ok) throw Error(d.mensaje || "No se pudieron guardar los cambios.");
      setMensaje(method === "POST" ? "Profesional creado correctamente." : "Profesional actualizado.");
      setNuevo(vacio); setEditando(""); setCambio({}); await cargar();
    } catch (e) { setError(e.message); }
    finally { setOcupado(false); }
  }
  return <main className={styles.pagina}>
    <Link href="/admin" className={styles.volver}>← Volver al panel</Link>
    <h1>Gestión de profesionales</h1>
    <p>Solo el administrador crea cuentas. Los profesionales ingresarán con RUT y la contraseña que tú les entregues.</p>
    {mensaje && <p role="status" className={styles.exito}>{mensaje}</p>}
    {error && <p role="alert" className={styles.error}>{error}</p>}
    <form className={styles.form} onSubmit={e => { e.preventDefault(); enviar("/api/admin/profesionales", "POST", nuevo); }}>
      <h2>Crear profesional</h2>
      <div className={styles.campos}>
        <label>Nombre completo<input required minLength={3} maxLength={120} placeholder="Nombre y apellido" value={nuevo.nombre} onChange={e => setNuevo({ ...nuevo, nombre: e.target.value })}/></label>
        <label>RUT<input required placeholder="12.345.678-5" value={nuevo.rut} onChange={e => setNuevo({ ...nuevo, rut: e.target.value })}/></label>
        <label>Contraseña inicial<input required type="password" minLength={8} maxLength={128} autoComplete="new-password" placeholder="Mínimo 8 caracteres" value={nuevo.contrasena} onChange={e => setNuevo({ ...nuevo, contrasena: e.target.value })}/></label>
        <label>Especialidad (opcional)<input maxLength={120} placeholder="Ej. Corte y coloración" value={nuevo.especialidad} onChange={e => setNuevo({ ...nuevo, especialidad: e.target.value })}/></label>
      </div>
      <h3>Servicios que puede atender</h3>
      <div className={styles.servicios}>{servicios.map(s => <label key={s._id}><input type="checkbox" checked={nuevo.serviciosIds.includes(s._id)} onChange={() => cambiarServicio(nuevo, setNuevo, s._id)}/>{s.nombre}</label>)}</div>
      <p className={styles.ayuda}>La contraseña no será visible después de crear la cuenta; podrás reemplazarla si es necesario.</p>
      <button disabled={ocupado} type="submit">{ocupado ? "Guardando..." : "Crear profesional"}</button>
    </form>
    <h2>Profesionales registrados</h2>
    {cargando ? <p>Cargando...</p> : pros.length === 0 ? <p>Todavía no hay profesionales.</p> : <div className={styles.listado}>{pros.map(p => <article key={p.id} className={styles.tarjeta}>
      <div className={styles.tarjetaTop}><div><h3>{p.nombre}</h3><p>RUT: {p.rut} · {p.especialidad || "Sin especialidad"}</p><small>{p.serviciosIds.length} servicio(s) asignado(s) · {p.activo ? "Activo" : "Desactivado"}</small></div><div className={styles.botones}>
        <button type="button" onClick={() => { setEditando(editando === p.id ? "" : p.id); setCambio({ nombre: p.nombre, especialidad: p.especialidad, serviciosIds: [...p.serviciosIds], contrasena: "" }); }}>Editar</button>
        <button type="button" disabled={ocupado} onClick={() => { if (window.confirm(`¿${p.activo ? "Desactivar" : "Activar"} a ${p.nombre}?`)) enviar(`/api/admin/profesionales/${p.id}`, "PATCH", { activo: !p.activo }); }}>{p.activo ? "Desactivar" : "Activar"}</button>
      </div></div>
      {editando === p.id && <form className={styles.edicion} onSubmit={e => { e.preventDefault(); const cambios = { ...cambio }; if (!cambios.contrasena) delete cambios.contrasena; enviar(`/api/admin/profesionales/${p.id}`, "PATCH", cambios); }}>
        <div className={styles.campos}>
          <label>Nombre<input required minLength={3} value={cambio.nombre || ""} onChange={e => setCambio({ ...cambio, nombre: e.target.value })}/></label>
          <label>Especialidad<input value={cambio.especialidad || ""} onChange={e => setCambio({ ...cambio, especialidad: e.target.value })}/></label>
          <label>Nueva contraseña (dejar vacío para mantener)<input type="password" minLength={8} maxLength={128} autoComplete="new-password" value={cambio.contrasena || ""} onChange={e => setCambio({ ...cambio, contrasena: e.target.value })}/></label>
        </div>
        <h4>Servicios asignados</h4><div className={styles.servicios}>{servicios.map(s => <label key={s._id}><input type="checkbox" checked={cambio.serviciosIds?.includes(s._id) || false} onChange={() => cambiarServicio(cambio, setCambio, s._id)}/>{s.nombre}</label>)}</div>
        <button type="submit" disabled={ocupado}>Guardar cambios</button>
      </form>}
    </article>)}</div>}
  </main>;
}
