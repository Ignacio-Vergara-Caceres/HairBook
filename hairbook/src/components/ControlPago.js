"use client";

import { ESTADOS_PAGO, normalizarEstadoPago, permiteGestionPago } from "@/lib/estadoPago";
import styles from "./controlPago.module.css";

export default function ControlPago({ reserva, rol, procesando, gestionar }) {
  const estado = normalizarEstadoPago(reserva.estadoPago);
  return <div className={styles.pago}>
    <div className={styles.resumen}><strong>Estado de pago</strong><span className={`${styles.estado} ${styles[estado]}`}>{ESTADOS_PAGO[estado]}</span></div>
    {rol === "profesional" && permiteGestionPago(reserva.estado) && <>
      <small>Verifica la transferencia antes de registrar el pago.</small>
      <div className={styles.acciones}>
        {Object.entries({ abonada: "Marcar abonada", pagada: "Marcar pagada", pendiente: "Volver a pendiente" }).filter(([valor]) => valor !== estado).map(([valor, texto]) => <button key={valor} type="button" disabled={!!procesando} onClick={() => gestionar(reserva, { accion: "pago", estadoPago: valor, estadoPagoAnterior: estado })}>{texto}</button>)}
      </div>
    </>}
  </div>;
}
