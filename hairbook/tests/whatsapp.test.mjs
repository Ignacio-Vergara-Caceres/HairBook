import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizarTelefonoWhatsapp, parametrosPlantillaReserva } from '../src/lib/whatsapp.js';
import { ventanaAtencionAbierta, registrarMensajeEntrante } from '../src/lib/whatsappInbox.js';

test('normaliza solo teléfonos móviles chilenos', () => {
  assert.equal(normalizarTelefonoWhatsapp('+56 9 1234 5678'), '56912345678');
  assert.equal(normalizarTelefonoWhatsapp('912345678'), '56912345678');
  assert.equal(normalizarTelefonoWhatsapp('56912345678'), '56912345678');
  assert.equal(normalizarTelefonoWhatsapp('221234567'), null);
});

test('parámetros de la plantilla tienen cuatro valores y fecha legible', () => {
  const params = parametrosPlantillaReserva({ fecha: '2026-11-02', hora: '15:00', servicioNombre: 'Corte', precioReferencial: 15000 });
  assert.equal(params.length, 4);
  assert.equal(params[0].text, '02/11/2026');
  assert.equal(params[1].text, '15:00');
});

test('ventana de atención solo admite respuesta en 24 h', () => {
  const ahora = new Date('2026-10-27T20:00:00Z');
  assert.equal(ventanaAtencionAbierta({ ultimoMensajeEntrante: new Date(ahora.getTime() - 60_000) }, ahora), true);
  assert.equal(ventanaAtencionAbierta({ ultimoMensajeEntrante: new Date(ahora.getTime() - 86_400_000) }, ahora), false);
  assert.equal(ventanaAtencionAbierta({}, ahora), false);
});

test('deduplica webhooks repetidos mediante _id meta', async () => {
  const msgs = new Map();
  const conversaciones = new Map();
  const db = { collection(nombre) {
    if (nombre === 'whatsapp_mensajes') return { async insertOne(doc) {
      if (msgs.has(doc._id)) { const e = new Error('duplicate key'); e.code = 11000; throw e; }
      msgs.set(doc._id, doc);
    } };
    if (nombre === 'whatsapp_conversaciones') return { async updateOne(query, update) {
      conversaciones.set(query._id, { ...conversaciones.get(query._id), ...update.$set, ...update.$setOnInsert });
    } };
    throw new Error(nombre);
  } };
  const evento = { id: 'wamid.test', telefono: '56912345678', nombre: 'Clienta', texto: 'Hola', fecha: new Date() };
  assert.equal(await registrarMensajeEntrante(db, evento), true);
  assert.equal(await registrarMensajeEntrante(db, evento), false);
  assert.equal(msgs.size, 1);
  assert.equal(conversaciones.get(evento.telefono).nombre, 'Clienta');
});
