"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import styles from "./whatsapp.module.css";

const formatFecha = (fecha) => fecha ? new Date(fecha).toLocaleString("es-CL", {
  timeZone: "America/Santiago", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
}) : "";
const fechaLegible = (fecha) => fecha ? fecha.split("-").reverse().join("/") : "";
const normalizar = (valor) => String(valor || "").replace(/\D/g, "");

export default function ChatAdmin({ telefonoInicial }) {
  const [lista, setLista] = useState([]);
  const [telefono, setTelefono] = useState(normalizar(telefonoInicial));
  const [datos, setDatos] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [borrador, setBorrador] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [procesando, setProcesando] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [editando, setEditando] = useState("");
  const [nuevaFecha, setNuevaFecha] = useState("");
  const [nuevaHora, setNuevaHora] = useState("");
  const [disponibles, setDisponibles] = useState([]);
  const finMensajes = useRef(null);

  const cargarLista = useCallback(async () => {
    try {
      const respuesta = await fetch("/api/admin/whatsapp/conversaciones", { cache: "no-store" });
      const contenido = await respuesta.json();
      if (!respuesta.ok || !contenido.ok) throw new Error(contenido.mensaje || "Error cargando conversaciones");
      setLista(contenido.datos || []);
      setTelefono((actual) => actual || contenido.datos?.[0]?.telefono || "");
      setError("");
    } catch (e) { setError(e.message); }
    finally { setCargando(false); }
  }, []);

  const cargarChat = useCallback(async (numero, silencioso = false) => {
    if (!numero) { setDatos(null); return; }
    try {
      const respuesta = await fetch(`/api/admin/whatsapp/conversaciones/${encodeURIComponent(numero)}`, { cache: "no-store" });
      const contenido = await respuesta.json();
      if (!respuesta.ok || !contenido.ok) throw new Error(contenido.mensaje || "Error cargando chat");
      setDatos(contenido);
      if (!silencioso) setError("");
    } catch (e) { if (!silencioso) setError(e.message); }
  }, []);

  useEffect(() => {
    cargarLista();
    const temporizador = setInterval(cargarLista, 12000);
    return () => clearInterval(temporizador);
  }, [cargarLista]);

  useEffect(() => {
    cargarChat(telefono);
    const temporizador = setInterval(() => cargarChat(telefono, true), 9000);
    return () => clearInterval(temporizador);
  }, [telefono, cargarChat]);

  useEffect(() => { finMensajes.current?.scrollIntoView({ behavior: "smooth", block: "nearest" }); }, [datos?.mensajes?.length]);

  async function enviarMensaje(evento) {
    evento.preventDefault();
    if (!telefono || !borrador.trim() || procesando) return;
    setProcesando(true); setError(""); setAviso("");
    try {
      const respuesta = await fetch(`/api/admin/whatsapp/conversaciones/${encodeURIComponent(telefono)}/mensajes`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texto: borrador.trim() }),
      });
      const contenido = await respuesta.json();
      if (!respuesta.ok || !contenido.ok) throw new Error(contenido.mensaje || "No se pudo enviar");
      setBorrador(""); setAviso(contenido.mensaje);
      await Promise.all([cargarChat(telefono), cargarLista()]);
    } catch (e) { setError(e.message); }
    finally { setProcesando(false); }
  }

  async function gestionarReserva(reserva, body) {
    if (procesando) return;
    const accion = body.accion === "modificar" ? "reprogramar" : body.estado === "confirmada" ? "confirmar" : "rechazar";
    if (!window.confirm(`¿Deseas ${accion} esta reserva?`)) return;
    setProcesando(true); setError(""); setAviso("");
    try {
      const respuesta = await fetch(`/api/admin/reservas/${reserva.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const contenido = await respuesta.json();
      if (!respuesta.ok || !contenido.ok) throw new Error(contenido.mensaje || "Error actualizando reserva");
      setAviso(`${contenido.mensaje} ${contenido.aviso || ""}`);
      setEditando(""); await Promise.all([cargarChat(telefono), cargarLista()]);
    } catch (e) { setError(e.message); }
    finally { setProcesando(false); }
  }

  async function cargarDisponibilidad(fecha, reserva) {
    setDisponibles([]); setNuevaHora("");
    if (!fecha) return;
    try {
      const respuesta = await fetch(`/api/disponibilidad?fecha=${encodeURIComponent(fecha)}`, { cache: "no-store" });
      const contenido = await respuesta.json();
      if (!respuesta.ok || !contenido.ok) throw new Error(contenido.mensaje || "Sin disponibilidad");
      const opciones = contenido.horariosDisponibles || [];
      if (fecha === reserva.fecha) opciones.push(reserva.hora);
      setDisponibles([...new Set(opciones)].sort());
    } catch (e) { setError(e.message); }
  }

  function comenzarCambio(reserva) {
    setEditando(reserva.id); setNuevaFecha(reserva.fecha); setNuevaHora(""); setError("");
    cargarDisponibilidad(reserva.fecha, reserva);
  }

  const seleccionada = lista.find((c) => c.telefono === telefono);
  const filtradas = lista.filter((c) => `${c.nombre} ${c.telefono} ${c.ultimoMensaje}`.toLowerCase().includes(busqueda.toLowerCase()));
  return (
    <main className={styles.pagina}>
      <header className={styles.encabezado}>
        <div><Link href="/admin" className={styles.volver}>← Volver al panel</Link>
          <h1>Mensajes de WhatsApp</h1>
          <p>Conversaciones y reservas, todo desde HairBook.</p></div>
        <span className={styles.estadoConexion}>WhatsApp Cloud API</span>
      </header>
      {error && <div role="alert" className={styles.error}>{error}</div>}
      {aviso && <div role="status" className={styles.aviso}>{aviso}</div>}
      <div className={styles.panel}>
        <aside className={styles.barraLateral}>
          <div className={styles.tituloSeccion}>Conversaciones <span>{lista.length}</span></div>
          <input className={styles.buscar} aria-label="Buscar conversaciones" placeholder="Buscar nombre o teléfono..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          <div className={styles.contactos}>
            {cargando && <p className={styles.vacio}>Cargando...</p>}
            {!cargando && filtradas.length === 0 && <p className={styles.vacio}>No hay conversaciones. Aparecerán aquí cuando llegue un mensaje o se registre una reserva con WhatsApp autorizado.</p>}
            {filtradas.map((c) => <button key={c.telefono} className={`${styles.contacto} ${c.telefono === telefono ? styles.contactoActivo : ""}`} onClick={() => { setTelefono(c.telefono); setEditando(""); setAviso(""); setError(""); }}>
              <span className={styles.avatar}>{(c.nombre || "C").charAt(0).toUpperCase()}</span>
              <span className={styles.contactoTexto}><strong>{c.nombre}</strong><small>{c.ultimoMensaje}</small></span>
              {c.ventanaAbierta && <span className={styles.punto} title="Ventana de respuesta abierta" />}
            </button>)}
          </div>
        </aside>
        <section className={styles.chat} aria-label="Chat de WhatsApp">
          {!telefono || !datos || datos.conversacion.telefono !== telefono ? (
            <div className={styles.sinSeleccion}>{telefono ? "Cargando conversación..." : "Selecciona una conversación para empezar."}</div>
          ) : <>
            <div className={styles.cabeceraChat}>
              <div><strong>{datos.conversacion.nombre || seleccionada?.nombre || telefono}</strong><small>+{telefono}</small></div>
              <span className={datos.conversacion.ventanaAbierta ? styles.estadoAbierto : styles.estadoCerrado}>
                {datos.conversacion.ventanaAbierta ? "Ventana abierta (24 h)" : "Ventana cerrada"}
              </span>
            </div>
            <div className={styles.mensajes}>
              {datos.mensajes.length === 0 && <p className={styles.vacio}>Todavía no hay mensajes registrados. El historial anterior a la integración no puede importarse automáticamente.</p>}
              {datos.mensajes.map((m) => <div key={m.id} className={`${styles.burbuja} ${m.direccion === "saliente" ? styles.saliente : styles.entrante}`}>
                <div>{m.texto}</div><small>{formatFecha(m.fecha)} · {m.direccion === "saliente" ? m.estado || "Aceptado" : "Recibido"}</small>
              </div>)}
              <div ref={finMensajes} />
            </div>
            <form className={styles.enviar} onSubmit={enviarMensaje}>
              {!datos.conversacion.ventanaAbierta && <p className={styles.cuidado}>Para enviar un mensaje libre, el cliente debe escribir primero. Fuera de 24 horas se requiere una plantilla aprobada por Meta.</p>}
              <div className={styles.filaEnviar}>
                <input aria-label="Mensaje" placeholder={datos.conversacion.ventanaAbierta ? "Escribe una respuesta..." : "Esperando mensaje del cliente..."}
                  value={borrador} onChange={(e) => setBorrador(e.target.value)} maxLength={2500} disabled={!datos.conversacion.ventanaAbierta || procesando} />
                <button type="submit" disabled={!datos.conversacion.ventanaAbierta || !borrador.trim() || procesando}>{procesando ? "Enviando..." : "Enviar"}</button>
              </div>
            </form>
          </>}
        </section>
        <aside className={styles.reservas}>
          <div className={styles.tituloSeccion}>Reservas vinculadas</div>
          {datos?.conversacion?.telefono !== telefono ? <p className={styles.vacio}>Selecciona una conversación.</p> : <>
            {datos.reservas.length === 0 && <p className={styles.vacio}>No hay reservas vinculadas a este número.</p>}
            {datos.reservas.map((reserva) => {
              const activa = ["pendiente", "confirmada"].includes(reserva.estado);
              const futura = `${reserva.fecha}T${reserva.hora}` > new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Santiago", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date()).replace(" ", "T");
              return <article className={styles.tarjetaReserva} key={reserva.id}>
                <div className={styles.reservaTitulo}><strong>{reserva.servicio}</strong><span className={styles.etiqueta}>{reserva.estado || "pendiente"}</span></div>
                <p>{fechaLegible(reserva.fecha)} · {reserva.hora}</p>
                {reserva.precioReferencial != null && <p>Desde ${Number(reserva.precioReferencial).toLocaleString("es-CL")}</p>}
                {reserva.notas && <p>Notas: {reserva.notas}</p>}
                {activa && futura && <div className={styles.acciones}>
                  {reserva.estado === "pendiente" && <>
                    <button className={styles.aceptar} disabled={procesando} onClick={() => gestionarReserva(reserva, { estado: "confirmada" })}>Aceptar</button>
                    <button className={styles.rechazar} disabled={procesando} onClick={() => gestionarReserva(reserva, { estado: "rechazada" })}>Rechazar</button>
                  </>}
                  <button className={styles.modificar} disabled={procesando} onClick={() => editando === reserva.id ? setEditando("") : comenzarCambio(reserva)}>Modificar</button>
                </div>}
                {editando === reserva.id && <form className={styles.edicion} onSubmit={(e) => { e.preventDefault(); gestionarReserva(reserva, { accion: "modificar", fecha: nuevaFecha, hora: nuevaHora }); }}>
                  <label>Fecha<input type="date" value={nuevaFecha} onChange={(e) => { setNuevaFecha(e.target.value); cargarDisponibilidad(e.target.value, reserva); }} required /></label>
                  <label>Horario<select value={nuevaHora} onChange={(e) => setNuevaHora(e.target.value)} required><option value="">Seleccionar hora</option>{disponibles.map((h) => <option key={h} value={h}>{h}</option>)}</select></label>
                  <button disabled={procesando || !nuevaHora || (nuevaFecha === reserva.fecha && nuevaHora === reserva.hora)} type="submit">Guardar cambio</button>
                </form>}
              </article>;
            })}
          </>}
        </aside>
      </div>
      <p className={styles.nota}>Los mensajes se actualizan automáticamente. Que Meta acepte un envío no garantiza su entrega: revisa su estado en el chat.</p>
    </main>
  );
}
