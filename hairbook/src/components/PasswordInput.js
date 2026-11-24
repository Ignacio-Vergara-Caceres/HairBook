"use client";

import { useState } from "react";
import styles from "./PasswordInput.module.css";

/** Campo de contraseña reutilizable para ingreso, registro y administración. */
export default function PasswordInput({ className = "", ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className={styles.container}>
      <input
        {...props}
        className={`${styles.input} ${className}`.trim()}
        type={visible ? "text" : "password"}
      />
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setVisible((actual) => !actual)}
        aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
        aria-pressed={visible}
        title={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
      >
        {visible ? (
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 3l18 18" />
            <path d="M10.6 5.1A10.7 10.7 0 0 1 12 5c5 0 9 4.5 10 7a12.6 12.6 0 0 1-3.2 4.5" />
            <path d="M6.4 6.4C4.2 7.8 2.6 10 2 12c1 2.5 5 7 10 7 1.6 0 3-.4 4.2-1.1" />
            <path d="M10 10a3 3 0 0 0 4 4" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </span>
  );
}
