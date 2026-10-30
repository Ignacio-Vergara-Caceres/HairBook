import Link from "next/link";
import { obtenerUsuarioProfesional } from "@/lib/session";
import AdminLogoutButton from "@/app/admin/AdminLogoutButton";
import styles from "@/app/admin/admin.module.css";

const modulos = [
  { titulo: "Mis reservas", descripcion: "Acepta, rechaza, modifica, cancela y completa tus propias atenciones.", href: "/profesional/reservas", numero: "01" },
  { titulo: "WhatsApp", descripcion: "Conversa con tus clientes desde la bandeja de HairBook.", href: "/profesional/whatsapp", numero: "02" },
  { titulo: "Mi disponibilidad", descripcion: "Bloquea días o franjas horarias de tu propia agenda.", href: "/profesional/disponibilidad", numero: "03" },
];
export default async function ProfesionalPage() {
  const usuario = await obtenerUsuarioProfesional();
  return <main className={styles.shell}>
    <header className={styles.topbar}><div className={styles.topbarInner}>
      <Link href="/profesional" className={styles.brand}><span className={styles.brandMark}>HB</span><span><strong>HairBook</strong><small>Panel profesional</small></span></Link>
      <div className={styles.topActions}><Link href="/" className={styles.siteLink}>Ver sitio</Link><AdminLogoutButton /></div>
    </div></header>
    <section className={styles.content}>
      <div className={styles.heading}><span className={styles.eyebrow}>Mi agenda</span><h1>Hola, {usuario.nombre.split(" ")[0]}</h1><p>Gestiona tus horas directamente, sin esperar aprobación administrativa.</p></div>
      <div className={styles.grid}>{modulos.map(m => <Link href={m.href} key={m.href} className={styles.cardActive}>
        <div className={styles.cardTop}><span className={styles.cardNumber}>{m.numero}</span><span className={styles.statusActive}>Disponible</span></div>
        <div><h2>{m.titulo}</h2><p>{m.descripcion}</p></div><span className={styles.cardAction}>Abrir módulo →</span>
      </Link>)}</div>
    </section>
  </main>;
}
