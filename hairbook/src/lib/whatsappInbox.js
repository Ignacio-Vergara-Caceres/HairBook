/** Persistencia de conversaciones de WhatsApp. Exclusivamente del servidor. */
import { randomUUID } from "node:crypto";
import { normalizarTelefonoWhatsapp } from "./whatsapp.js";

export const VENTANA_ATENCION_MS = 24 * 60 * 60 * 1000;

export function ventanaAtencionAbierta(conversacion, ahora = new Date()) {
  const ultima = conversacion?.ultimoMensajeEntrante;
  return !!ultima && ahora.getTime() - new Date(ultima).getTime() < VENTANA_ATENCION_MS &&
    ahora.getTime() >= new Date(ultima).getTime();
}

export async function registrarConversacion(db, telefono, datos = {}) {
  const numero = normalizarTelefonoWhatsapp(telefono);
  if (!numero) return null;
  const ahora = new Date();
  const set = { actualizadaEn: ahora };
  if (datos.nombre) set.nombre = String(datos.nombre).slice(0, 120);
  if (datos.clienteId) set.clienteId = datos.clienteId;
  if (datos.ultimoMensajeEntrante) set.ultimoMensajeEntrante = datos.ultimoMensajeEntrante;
  if (datos.ultimoMensaje) {
    set.ultimoMensaje = String(datos.ultimoMensaje).slice(0, 150);
    set.ultimoMensajeEn = datos.ultimoMensajeEn || ahora;
  }
  await db.collection("whatsapp_conversaciones").updateOne(
    { _id: numero },
    { $set: set, $setOnInsert: { creadaEn: ahora } },
    { upsert: true }
  );
  return numero;
}

/** Un evento repetido de Meta nunca crea dos mensajes. */
export async function registrarMensajeEntrante(db, { id, telefono, nombre, tipo, texto, fecha }) {
  const numero = normalizarTelefonoWhatsapp(telefono);
  if (!id || !numero) return false;
  const cuando = fecha instanceof Date && !Number.isNaN(fecha.getTime()) ? fecha : new Date();
  try {
    await db.collection("whatsapp_mensajes").insertOne({
      _id: `meta:${id}`, metaId: id, telefono: numero, direccion: "entrante",
      tipo: tipo || "text", texto: String(texto || "").slice(0, 4000),
      fecha: cuando, estado: "recibido",
    });
  } catch (error) {
    if (error.code === 11000) return false;
    throw error;
  }
  await registrarConversacion(db, numero, {
    nombre, ultimoMensajeEntrante: cuando,
    ultimoMensaje: texto || `[${tipo || "mensaje"}]`, ultimoMensajeEn: cuando,
  });
  return true;
}

export async function registrarMensajeSaliente(db, { telefono, texto, tipo = "text", metaId = null, estado = "aceptado", clienteId, nombre }) {
  const numero = normalizarTelefonoWhatsapp(telefono);
  if (!numero) return null;
  const fecha = new Date();
  const id = `local:${randomUUID()}`;
  await db.collection("whatsapp_mensajes").insertOne({
    _id: id, metaId, telefono: numero, direccion: "saliente", tipo,
    texto: String(texto || "").slice(0, 4000), fecha, estado,
  });
  await registrarConversacion(db, numero, {
    clienteId, nombre, ultimoMensaje: texto, ultimoMensajeEn: fecha,
  });
  return id;
}

export async function registrarEstadoEntrega(db, metaId, estado) {
  if (!metaId || !["sent", "delivered", "read", "failed"].includes(estado)) return;
  const rangos = { sent: 1, delivered: 2, read: 3, failed: 4 };
  await db.collection("whatsapp_mensajes").updateOne(
    { metaId, direccion: "saliente", $or: [
      { estadoEntregaRank: { $exists: false } },
      { estadoEntregaRank: { $lt: rangos[estado] } },
    ] },
    { $set: { estadoEntrega: estado, estadoEntregaRank: rangos[estado], actualizadoEn: new Date() } }
  );
}
