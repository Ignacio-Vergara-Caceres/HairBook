import { ObjectId } from "mongodb";
import clientPromise from "./mongodb";
import { obtenerUsuarioAdmin, obtenerUsuarioProfesional } from "./session";
import { fechaHoraChileAUtc } from "./fechaChile";
import { HORARIOS } from "./horarios";
import { horariosParaProfesional, idValido, reservaActiva, seSolapan } from "./profesionales";
import { enviarWhatsappTexto, normalizarTelefonoWhatsapp } from "./whatsapp";
import { registrarMensajeSaliente, ventanaAtencionAbierta } from "./whatsappInbox";

const sinPermiso = () => Response.json({ ok: false, mensaje: "Acceso no autorizado." }, { status: 403 });
export async function obtenerActor(tipo) { return tipo === "admin" ? obtenerUsuarioAdmin() : obtenerUsuarioProfesional(); }
export function filtroActor(tipo, actor) { return tipo === "admin" ? {} : { profesionalId: new ObjectId(actor.id) }; }

export async function listarReservas(tipo) {
  try {
    const actor = await obtenerActor(tipo);
    if (!actor) return sinPermiso();
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    const reservas = await db.collection("reservas").find(filtroActor(tipo, actor)).sort({ fechaCreacion: -1 }).limit(200).toArray();
    const idsClientes = [...new Set(reservas.map(r => String(r.clienteId || "")).filter(idValido))];
    const usuarios = idsClientes.length ? await db.collection("usuarios").find({ _id: { $in: idsClientes.map(id => new ObjectId(id)) } }, { projection: { telefono: 1 } }).toArray() : [];
    const telefonos = new Map(usuarios.map(u => [String(u._id), normalizarTelefonoWhatsapp(u.telefono)]));
    const idsPro = [...new Set(reservas.map(r => String(r.profesionalId || "")).filter(idValido))];
    const pros = idsPro.length ? await db.collection("usuarios").find({ _id: { $in: idsPro.map(id => new ObjectId(id)) } }, { projection: { nombre: 1 } }).toArray() : [];
    const nombres = new Map(pros.map(p => [String(p._id), p.nombre]));
    return Response.json({ ok: true, datos: reservas.map(r => ({
      id: String(r._id), cliente: r.clienteNombre, servicio: r.servicioNombre, servicioId: String(r.servicioId || ""),
      profesionalId: r.profesionalId ? String(r.profesionalId) : null,
      profesional: r.profesionalNombre || nombres.get(String(r.profesionalId)) || "Sin asignar (reserva anterior)",
      fecha: r.fecha, hora: r.hora, estado: r.estado || "pendiente", notas: r.notas || "",
      telefono: r.whatsapp?.consentimiento ? (normalizarTelefonoWhatsapp(r.whatsapp.numero) || telefonos.get(String(r.clienteId)) || null) : null,
    })) });
  } catch (error) {
    console.error("Error listando reservas:", error);
    return Response.json({ ok: false, mensaje: "No fue posible cargar las reservas." }, { status: 500 });
  }
}

function descripcionCambio(r, estado, fecha, hora, modifica) {
  const fechaTexto = fecha.split("-").reverse().join("/");
  const base = `HairBook: Tu reserva de ${r.servicioNombre}`;
  if (modifica) return `${base} fue reprogramada para el ${fechaTexto} a las ${hora}. Si tienes dudas, responde a este mensaje.`;
  if (estado === "confirmada") return `${base} para el ${fechaTexto} a las ${hora} fue confirmada. ¡Te esperamos!`;
  if (estado === "cancelada") return `${base} para el ${fechaTexto} a las ${hora} fue cancelada. Escríbenos si necesitas ayuda.`;
  if (estado === "rechazada") return `${base} para el ${fechaTexto} a las ${hora} fue rechazada. Puedes escribirnos para buscar otro horario.`;
  return "";
}

async function notificarSiCorresponde(db, r, estado, fecha, hora, modifica) {
  if (!r.whatsapp?.consentimiento) return { notificado: false, aviso: "No se envió WhatsApp (sin consentimiento)." };
  let telefono = r.whatsapp.numero;
  if (!telefono && r.clienteId) {
    const u = await db.collection("usuarios").findOne({ _id: r.clienteId }, { projection: { telefono: 1 } });
    telefono = u?.telefono;
  }
  const numero = normalizarTelefonoWhatsapp(telefono);
  if (!numero) return { notificado: false, aviso: "No se encontró un teléfono válido." };
  const c = await db.collection("whatsapp_conversaciones").findOne({ _id: numero });
  if (!ventanaAtencionAbierta(c)) return { notificado: false, aviso: "La ventana de WhatsApp de 24 horas está cerrada; contacta al cliente mediante una plantilla aprobada." };
  const texto = descripcionCambio(r, estado, fecha, hora, modifica);
  if (!texto) return { notificado: false, aviso: "" };
  try {
    const { metaId } = await enviarWhatsappTexto(numero, texto);
    await registrarMensajeSaliente(db, { telefono: numero, metaId, texto, clienteId: r.clienteId, nombre: r.clienteNombre });
    return { notificado: true, aviso: "WhatsApp aceptó la notificación (entrega pendiente)." };
  } catch (error) {
    console.error("No se pudo notificar reserva:", error);
    return { notificado: false, aviso: "Reserva actualizada; no se pudo enviar WhatsApp." };
  }
}

export async function actualizarReserva(request, { params }, tipo) {
  try {
    const actor = await obtenerActor(tipo);
    if (!actor) return sinPermiso();
    const { id } = await params;
    if (!idValido(id)) return Response.json({ ok: false, mensaje: "ID de reserva inválido." }, { status: 400 });
    const body = await request.json().catch(() => ({}));
    const modificacion = body.accion === "modificar";
    const asignacion = body.accion === "asignar" && tipo === "admin";
    const estadosPermitidos = ["confirmada", "rechazada", "cancelada", "completada"];
    if (!modificacion && !asignacion && !estadosPermitidos.includes(body.estado)) return Response.json({ ok: false, mensaje: "Acción no permitida." }, { status: 400 });
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    const col = db.collection("reservas");
    const r = await col.findOne({ _id: new ObjectId(id), ...filtroActor(tipo, actor) });
    if (!r) return Response.json({ ok: false, mensaje: "Reserva no encontrada o no asignada a tu cuenta." }, { status: 404 });
    const estadoActual = r.estado || "pendiente";
    const transiciones = { pendiente: ["confirmada", "rechazada", "cancelada"], confirmada: ["cancelada", "completada"] };
    if ((modificacion || asignacion) ? !["pendiente", "confirmada"].includes(estadoActual) : !(transiciones[estadoActual] || []).includes(body.estado)) {
      return Response.json({ ok: false, mensaje: "El estado actual no permite esa acción." }, { status: 409 });
    }
    const instanteOriginal = fechaHoraChileAUtc(r.fecha, r.hora);
    if (!instanteOriginal) return Response.json({ ok: false, mensaje: "Fecha original inválida." }, { status: 409 });
    if (!asignacion && body.estado !== "completada" && instanteOriginal.getTime() <= Date.now()) {
      return Response.json({ ok: false, mensaje: "No se pueden modificar reservas pasadas." }, { status: 409 });
    }
    if (body.estado === "completada" && instanteOriginal.getTime() > Date.now()) {
      return Response.json({ ok: false, mensaje: "La atención todavía no ha comenzado." }, { status: 409 });
    }
    const fecha = modificacion ? body.fecha : r.fecha;
    const hora = modificacion ? body.hora : r.hora;
    if (modificacion) {
      const nueva = fechaHoraChileAUtc(fecha, hora);
      if (!nueva || nueva.getTime() <= Date.now() || !HORARIOS.includes(hora)) return Response.json({ ok: false, mensaje: "Fecha u hora no válida." }, { status: 400 });
      if (fecha === r.fecha && hora === r.hora) return Response.json({ ok: false, mensaje: "No cambió la fecha ni la hora." }, { status: 400 });
      if (r.profesionalId) {
        const p = await db.collection("usuarios").findOne({ _id: r.profesionalId, activo: { $ne: false } });
        const servicio = await db.collection("servicios").findOne({ _id: r.servicioId });
        if (!p || !servicio || !(await horariosParaProfesional(db, { profesional: p, fecha, servicio, ignorarReservaId: r._id })).includes(hora)) return Response.json({ ok: false, mensaje: "El profesional no está disponible en ese horario." }, { status: 409 });
      } else {
        // Las reservas antiguas sin asignar mantienen su bloqueo global.
        const otras = await col.find({ fecha, _id: { $ne: r._id } }).toArray();
        if (otras.some(o => reservaActiva(o) && seSolapan(hora, r.duracionMin || 60, o.hora, o.duracionMin || 60))) return Response.json({ ok: false, mensaje: "Ese horario está ocupado." }, { status: 409 });
      }
    }
    let asignado = null;
    if (asignacion) {
      if (!idValido(body.profesionalId) || String(r.profesionalId || "") === body.profesionalId) return Response.json({ ok: false, mensaje: "Selecciona un profesional distinto y válido." }, { status: 400 });
      const [pro, servicio] = await Promise.all([
        db.collection("usuarios").findOne({ _id: new ObjectId(body.profesionalId), activo: { $ne: false }, $or: [{ roles: "profesional" }, { rol: "profesional" }] }),
        db.collection("servicios").findOne({ _id: r.servicioId }),
      ]);
      if (!pro || !servicio) return Response.json({ ok: false, mensaje: "Profesional o servicio inexistente." }, { status: 404 });
      if (instanteOriginal.getTime() > Date.now() && !(await horariosParaProfesional(db, { profesional: pro, fecha: r.fecha, servicio, ignorarReservaId: r._id })).includes(r.hora)) {
        return Response.json({ ok: false, mensaje: "El profesional no tiene disponible ese horario." }, { status: 409 });
      }
      if (!(pro.serviciosIds || []).includes(String(r.servicioId))) return Response.json({ ok: false, mensaje: "El profesional no realiza este servicio." }, { status: 409 });
      asignado = { profesionalId: pro._id, profesionalNombre: pro.nombre, duracionMin: servicio.duracionMin || 60 };
    }
    const nuevoEstado = (modificacion || asignacion) ? estadoActual : body.estado;
    const set = { fechaActualizacion: new Date(), gestionadaPor: actor.id, ...(asignacion ? asignado : modificacion ? { fecha, hora, fechaHora: fechaHoraChileAUtc(fecha, hora) } : { estado: nuevoEstado }) };
    const resultado = await col.updateOne({ _id: r._id, ...filtroActor(tipo, actor), estado: r.estado, fecha: r.fecha, hora: r.hora }, { $set: set });
    if (!resultado.modifiedCount) return Response.json({ ok: false, mensaje: "La reserva cambió. Actualiza la página." }, { status: 409 });
    let aviso = { notificado: false, aviso: "" };
    try { if (!asignacion) aviso = await notificarSiCorresponde(db, r, nuevoEstado, fecha, hora, modificacion); }
    catch (error) { console.error("Error notificando:", error); aviso.aviso = "Reserva actualizada; no fue posible comprobar WhatsApp."; }
    return Response.json({ ok: true, mensaje: asignacion ? "Profesional de la reserva actualizado." : modificacion ? "Reserva reprogramada correctamente." : `Reserva ${nuevoEstado} correctamente.`, estado: nuevoEstado, fecha, hora, ...aviso });
  } catch (error) {
    console.error("Error gestionando reserva:", error);
    return Response.json({ ok: false, mensaje: "No fue posible actualizar la reserva." }, { status: 500 });
  }
}
