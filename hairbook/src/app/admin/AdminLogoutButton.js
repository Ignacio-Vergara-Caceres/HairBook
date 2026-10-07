"use client";

import styles from "./admin.module.css";

export default function AdminLogoutButton() {
  const cerrarSesion = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/";
    }
  };

  return (
    <button type="button" className={styles.logoutButton} onClick={cerrarSesion}>
      Cerrar sesión
    </button>
  );
}
