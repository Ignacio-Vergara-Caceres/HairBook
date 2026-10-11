import Link from "next/link";
import { obtenerUsuarioAdmin } from "@/lib/session";
import AdminLogoutButton from "./AdminLogoutButton";
import styles from "./admin.module.css";

const modulos = [
  {
    titulo: "Disponibilidad para redes",
    descripcion:
      "Consulta los cupos de la semana y genera la imagen PNG para publicar en Instagram.",
    numero: "01",
    href: "/admin/disponibilidad-instagram-semanal",
    activo: true,
  },
  {
    titulo: "Reservas",
    descripcion:
      "Revisa solicitudes, confirma horas y administra el estado de las reservas.",
    numero: "02",
    href: "/admin/reservas",
    activo: true,
  },
  {
    titulo: "Clientas",
    descripcion:
      "Accede a las fichas de clientas y a su historial de atención.",
    numero: "03",
    activo: false,
  },
  {
    titulo: "Servicios",
    descripcion:
      "Administra el catálogo, precios referenciales y duración de los servicios.",
    numero: "04",
    activo: false,
  },
];

export default async function AdminPage() {
  const usuario = await obtenerUsuarioAdmin();
  const primerNombre = usuario?.nombre?.split(" ")[0] || "administradora";

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link href="/admin" className={styles.brand}>
            <span className={styles.brandMark}>HB</span>
            <span>
              <strong>HairBook</strong>
              <small>Panel de administración</small>
            </span>
          </Link>

          <div className={styles.topActions}>
            <Link href="/" className={styles.siteLink}>
              Ver sitio
            </Link>
            <AdminLogoutButton />
          </div>
        </div>
      </header>

      <section className={styles.content}>
        <div className={styles.heading}>
          <span className={styles.eyebrow}>Administración</span>
          <h1>Administrando como: {primerNombre}</h1>
          <p>
            Desde aquí podrás concentrar las herramientas de gestión interna de HairBook.
          </p>
        </div>

        <div className={styles.grid}>
          {modulos.map((modulo) => {
            const contenido = (
              <>
                <div className={styles.cardTop}>
                  <span className={styles.cardNumber}>{modulo.numero}</span>
                  <span className={modulo.activo ? styles.statusActive : styles.statusSoon}>
                    {modulo.activo ? "Disponible" : "Próximamente"}
                  </span>
                </div>
                <div>
                  <h2>{modulo.titulo}</h2>
                  <p>{modulo.descripcion}</p>
                </div>
                <span className={styles.cardAction}>
                  {modulo.activo ? "Abrir módulo →" : "Módulo en preparación"}
                </span>
              </>
            );

            if (modulo.activo) {
              return (
                <Link key={modulo.titulo} href={modulo.href} className={styles.cardActive}>
                  {contenido}
                </Link>
              );
            }

            return (
              <article key={modulo.titulo} className={styles.cardDisabled}>
                {contenido}
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
