import { ObjectId } from "mongodb";
import { HORARIOS } from "./horarios";
import { fechaHoraChileAUtc, fechaISOValida } from "./fechaChile";

export function rutChilenoValido(valor) {
  const rut = String(valor || "").replace(/[.\-\s]/g, "").toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(rut)) return false;
  let suma = 0, factor = 2;
  for (let i = rut.length - 2; i >= 0; i--) {
    suma += Number(rut[i]) * factor;
    factor = factor === 7 ? 2 : factor + 1;
  }
  const dv = 11 - (suma % 11);
  return rut.at(-1) === (dv === 11 ? "0" : dv === 10 ? "K" : String(dv));
}

export const idValido = (valor) => typeof valor === "string" && /^[a-f\d]{24}$/i.test(valor) && ObjectId.isValid(valor);
export const reservaActiva = (reserva) => !["rechazada", "cancelada"].includes(String(reserva.estado || "pendiente").toLowerCase());
export const serviciosProfesional = (p) => Array.isArray(p.serviciosIds) ? p.serviciosIds.map(String) : [];
export const realizaServicio = (p, servicioId) => serviciosProfesional(p).includes(String(servicioId));

export function horarioSemanalPermite(profesional, fecha, hora, duracion = 60) {
  const diaSemana = new Date(`${fecha}T12:00:00Z`).getUTCDay();
  const agendaDia = profesional.horariosSemanales?.[String(diaSemana)];
  if (!Array.isArray(agendaDia)) return true; // compatibilidad con profesionales anteriores
  return HORARIOS.filter(h => seSolapan(hora, duracion, h, 60)).every(h => agendaDia.includes(h));
}

export function bloqueado(profesional, fecha, hora, duracion = 60) {
  return (profesional.bloqueos || []).some((b) => b.fecha === fecha &&
    (!b.horas?.length || b.horas.some(h => seSolapan(hora, duracion, h, 60))));
}

export function minutos(hora) {
  if (typeof hora !== "string" || !/^\d{2}:\d{2}$/.test(hora)) return NaN;
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

export function seSolapan(horaA, duracionA, horaB, duracionB) {
  const a = minutos(horaA), b = minutos(horaB);
  return a < b + Math.max(1, Number(duracionB) || 60) && b < a + Math.max(1, Number(duracionA) || 60);
}

// Las reservas anteriores sin profesional conservan su bloqueo global hasta ser asignadas.
export async function horariosParaProfesional(db, { profesional, fecha, servicio, ignorarReservaId }) {
  if (!fechaISOValida(fecha) || !profesional || profesional.activo === false || !realizaServicio(profesional, servicio._id)) return [];
  const reservas = await db.collection("reservas").find({
    fecha,
    $or: [{ profesionalId: profesional._id }, { profesionalId: { $exists: false } }, { profesionalId: null }],
  }, { projection: { _id: 1, hora: 1, estado: 1, duracionMin: 1, servicioId: 1 } }).toArray();
  const duracionesFaltantes = [...new Set(reservas.filter(r => !r.duracionMin && r.servicioId).map(r => String(r.servicioId)))];
  const anteriores = duracionesFaltantes.length ? await db.collection("servicios").find({ _id: { $in: duracionesFaltantes.filter(idValido).map((id) => new ObjectId(id)) } }, { projection: { duracionMin: 1 } }).toArray() : [];
  const duracionMap = new Map(anteriores.map(s => [String(s._id), s.duracionMin]));
  const duracion = Math.max(1, Number(servicio.duracionMin) || 60);
  return HORARIOS.filter((hora) => {
    const instante = fechaHoraChileAUtc(fecha, hora);
    if (!instante || instante.getTime() <= Date.now() || bloqueado(profesional, fecha, hora, duracion) || !horarioSemanalPermite(profesional, fecha, hora, duracion)) return false;
    // Respetar el final de la jornada representada por los horarios existentes.
    if (minutos(hora) + duracion > minutos(HORARIOS.at(-1)) + 60) return false;
    return !reservas.some(r => String(r._id) !== String(ignorarReservaId || "") && reservaActiva(r) && seSolapan(hora, duracion, r.hora, r.duracionMin || duracionMap.get(String(r.servicioId)) || 60));
  });
}

export function profesionalPublico(profesional) {
  return { id: String(profesional._id), nombre: profesional.nombre, especialidad: profesional.especialidad || "", serviciosIds: serviciosProfesional(profesional) };
}

export function filtroReservaProfesional(profesionalId) {
  return { profesionalId: new ObjectId(profesionalId) };
}
