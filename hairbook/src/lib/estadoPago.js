// Estado administrativo del pago: no consulta ni mueve dinero en el banco.
export const ESTADOS_PAGO = Object.freeze({
  pendiente: "Pendiente de pago",
  abonada: "Abonada (pago parcial)",
  pagada: "Pagada",
});

export function estadoPagoValido(estado) {
  return typeof estado === "string" && Object.hasOwn(ESTADOS_PAGO, estado);
}

export function normalizarEstadoPago(estado) {
  return estadoPagoValido(estado) ? estado : "pendiente";
}

export function permiteGestionPago(estadoReserva) {
  return ["confirmada", "completada"].includes(estadoReserva);
}
