import { ObjectId } from "mongodb";
import { normalizarTelefonoWhatsapp } from "./whatsapp";

// Los profesionales solo pueden acceder a números asociados a sus propias reservas.
export async function telefonosAutorizados(db, profesionalId) {
  const reservas = await db.collection("reservas").find({ profesionalId: new ObjectId(profesionalId), "whatsapp.consentimiento": true }, { projection: { clienteId: 1, "whatsapp.numero": 1 } }).toArray();
  const ids = [...new Set(reservas.map(r => String(r.clienteId || "")).filter(id => ObjectId.isValid(id)))];
  const clientes = ids.length ? await db.collection("usuarios").find({ _id: { $in: ids.map(id => new ObjectId(id)) } }, { projection: { telefono: 1 } }).toArray() : [];
  const porId = new Map(clientes.map(c => [String(c._id), normalizarTelefonoWhatsapp(c.telefono)]));
  return [...new Set(reservas.map(r => normalizarTelefonoWhatsapp(r.whatsapp?.numero) || porId.get(String(r.clienteId))).filter(Boolean))];
}
export async function puedeChatear(db, profesionalId, telefono) {
  const numero = normalizarTelefonoWhatsapp(telefono);
  return !!numero && (await telefonosAutorizados(db, profesionalId)).includes(numero);
}
export async function reservasDeConversacion(db, profesionalId, telefono) {
  const numero = normalizarTelefonoWhatsapp(telefono);
  const filtro = { profesionalId: new ObjectId(profesionalId), "whatsapp.consentimiento": true, "whatsapp.numero": numero };
  const reservas = await db.collection("reservas").find(filtro).sort({ fechaCreacion: -1 }).limit(15).toArray();
  // Compatibilidad con reservas anteriores que no guardaron el número en la reserva.
  const ids = await db.collection("usuarios").find({ telefono: { $exists: true } }, { projection: { telefono: 1 } }).toArray();
  const clienteIds = ids.filter(c => normalizarTelefonoWhatsapp(c.telefono) === numero).map(c => c._id);
  const otras = clienteIds.length ? await db.collection("reservas").find({ profesionalId: new ObjectId(profesionalId), clienteId: { $in: clienteIds }, "whatsapp.consentimiento": true, _id: { $nin: reservas.map(r => r._id) } }).sort({ fechaCreacion: -1 }).limit(15).toArray() : [];
  return [...reservas, ...otras].sort((a,b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)).slice(0,15);
}
