import Link from "next/link";
import styles from "./politica.module.css";

// IMPORTANTE: sustituye estos dos valores por datos reales antes de publicar
// esta URL en Meta. El responsable debe ser quien opera la peluquería y decide
// sobre el tratamiento de los datos, no necesariamente el equipo desarrollador.
const DATOS_RESPONSABLE = {
  nombre: "Zorroserpiente",
  correo: "[En un futuro debo crear un correo para solicitar la eliminación de datos(pendiente con eli)]",
};

const apartados = [
  { id: "responsable", nombre: "Quién trata tus datos" },
  { id: "datos", nombre: "Datos que utilizamos" },
  { id: "finalidades", nombre: "Para qué los usamos" },
  { id: "whatsapp", nombre: "Comunicación por WhatsApp" },
  { id: "terceros", nombre: "Servicios y proveedores" },
  { id: "conservacion", nombre: "Conservación y seguridad" },
  { id: "derechos", nombre: "Tus derechos y contacto" },
  { id: "cambios", nombre: "Cambios a esta política" },
];

export const metadata = {
  title: "Política de privacidad | HairBook",
  description:
    "Conoce cómo HairBook utiliza los datos de registro, las reservas y los mensajes de WhatsApp.",
  alternates: { canonical: "https://hair-book-mu.vercel.app/politica-de-privacidad" },
};

export default function PoliticaDePrivacidad() {
  const emailConfigurado =
    !DATOS_RESPONSABLE.correo.includes("[") &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(DATOS_RESPONSABLE.correo);

  return (
    <main className={styles.shell}>
      <header className={styles.topbar}>
        <div className={styles.topbarInner}>
          <Link href="/" className={styles.brand} aria-label="Ir al inicio de HairBook">
            <span className={styles.mark}>HB</span>
            <span className={styles.wordmark}>HairBook</span>
          </Link>
          <Link className={styles.backTop} href="/">Volver al inicio <span aria-hidden="true">↗</span></Link>
        </div>
      </header>

      <section className={styles.hero} aria-labelledby="titulo-privacidad">
        <div className={styles.heroInner}>
          <span className={styles.eyebrow}>TRANSPARENCIA Y CONFIANZA</span>
          <h1 id="titulo-privacidad">Política de<br /><em>privacidad.</em></h1>
          <p>
            Queremos que sepas qué información usa HairBook cuando creas una
            cuenta, solicitas una hora o conversas con la peluquería por WhatsApp.
          </p>
          <div className={styles.updated}>Última actualización: 27 de octubre de 2026</div>
        </div>
        <div className={styles.heroArt} aria-hidden="true"><span /><span /><span /></div>
      </section>

      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Índice de la política">
          <p>EN ESTA PÁGINA</p>
          <nav>
            {apartados.map((item, indice) => (
              <a href={`#${item.id}`} key={item.id}>
                <span>{String(indice + 1).padStart(2, "0")}</span>{item.nombre}
              </a>
            ))}
          </nav>
        </aside>

        <article className={styles.article}>
          <section className={styles.section} id="responsable">
            <span className={styles.number}>01 / IDENTIFICACIÓN</span>
            <h2>Quién trata tus datos</h2>
            <p>
              HairBook es una plataforma utilizada para gestionar solicitudes de
              atención en una peluquería. La entidad o persona que gestiona la
              peluquería y determina cómo se utilizan los datos es:
            </p>
            <div className={styles.detail}>
              <span>Responsable del tratamiento</span>
              <strong>{DATOS_RESPONSABLE.nombre}</strong>
            </div>
            <p>
              Esta política se aplica a la información tratada mediante el sitio
              web de HairBook y a las conversaciones de WhatsApp gestionadas desde
              su panel de administración.
            </p>
          </section>

          <section className={styles.section} id="datos">
            <span className={styles.number}>02 / INFORMACIÓN</span>
            <h2>Datos que utilizamos</h2>
            <p>Según cómo utilices HairBook, podemos tratar las siguientes categorías:</p>
            <ul>
              <li><strong>Cuenta:</strong> nombre, RUT, teléfono celular, correo electrónico opcional y datos necesarios para validar el acceso. La contraseña se almacena mediante un "salted hash", no como texto legible.</li>
              <li><strong>Reservas:</strong> servicio solicitado, fecha, hora, notas ingresadas por ti, precio referencial, estado de la solicitud e historial de cambios.</li>
              <li><strong>WhatsApp:</strong> número telefónico, nombre de perfil cuando Meta lo proporciona, contenido de mensajes recibidos y enviados, referencias a tipos de archivos compartidos y estados de entrega.</li>
              <li><strong>Funcionamiento técnico:</strong> cookies de sesión y registros técnicos necesarios para mantener el servicio y diagnosticar errores.</li>
            </ul>
            <p>
              Te recomendamos no incluir datos sensibles o información que no sea
              necesaria para tu atención en las notas de reserva o los mensajes.
            </p>
          </section>

          <section className={styles.section} id="finalidades">
            <span className={styles.number}>03 / USOS</span>
            <h2>Para qué los usamos</h2>
            <ul>
              <li>Crear tu cuenta, autenticarte y permitirte consultar tus reservas.</li>
              <li>Registrar, revisar, confirmar, rechazar o reprogramar solicitudes de hora.</li>
              <li>Responder consultas y coordinar tu atención con el equipo autorizado.</li>
              <li>Enviar comunicaciones relacionadas con tu reserva cuando hayas autorizado ese canal.</li>
              <li>Proteger el sistema y atender incidentes técnicos o solicitudes sobre tus datos.</li>
            </ul>
            <p>
              HairBook no utiliza las conversaciones para enviar publicidad por
              WhatsApp dentro de las funcionalidades actuales de la plataforma.
            </p>
          </section>

          <section className={styles.section} id="whatsapp">
            <span className={styles.number}>04 / MENSAJERÍA</span>
            <h2>Comunicación por WhatsApp</h2>
            <p>
              Al solicitar una reserva puedes marcar una casilla opcional para
              autorizar que HairBook te envíe notificaciones relacionadas con ella.
              La reserva puede solicitarse sin aceptar esa opción.
            </p>
            <p>
              Si escribes directamente al número de WhatsApp asociado a HairBook,
              los mensajes y las respuestas pueden aparecer en la bandeja interna
              de atención de la peluquería para continuar la conversación.
            </p>
            <p>
              El envío y la recepción se realizan mediante WhatsApp Business
              Platform, operada por Meta. Puedes pedir que dejemos de enviarte
              notificaciones de reservas por WhatsApp a través del contacto de
              privacidad indicado más abajo. Esto no implica necesariamente
              eliminar de inmediato los antecedentes de una reserva existente.
            </p>
          </section>

          <section className={styles.section} id="terceros">
            <span className={styles.number}>05 / PROVEEDORES</span>
            <h2>Servicios y proveedores</h2>
            <p>Para operar HairBook se utilizan servicios de terceros:</p>
            <ul>
              <li><strong>Vercel:</strong> alojamiento y funcionamiento del sitio web y sus rutas de servidor.</li>
              <li><strong>MongoDB Atlas:</strong> almacenamiento de cuentas, reservas y conversaciones.</li>
              <li><strong>Meta / WhatsApp Business Platform:</strong> entrega y recepción de mensajes de WhatsApp.</li>
            </ul>
            <p>
              Estos proveedores pueden procesar información en infraestructura
              ubicada fuera de Chile, de acuerdo con sus condiciones y políticas
              aplicables. Los datos se ponen a disposición de los servicios
              necesarios para que cada funcionalidad opere.
            </p>
          </section>

          <section className={styles.section} id="conservacion">
            <span className={styles.number}>06 / PROTECCIÓN</span>
            <h2>Conservación y seguridad</h2>
            <p>
              La información de cuentas, reservas y conversaciones permanece
              almacenada para permitir el funcionamiento de HairBook y la gestión
              de las solicitudes. El sistema actual no elimina automáticamente
              los historiales de WhatsApp por antigüedad.
            </p>
            <p>
              El acceso al panel de conversaciones está restringido a usuarios
              administradores. La aplicación utiliza autenticación y verifica
              las solicitudes recibidas en su webhook de WhatsApp.
            </p>
            <p>
              Las solicitudes de acceso, rectificación o eliminación deben
              revisarse caso a caso, considerando las obligaciones legales y la
              necesidad de mantener registros de reservas que correspondan.
            </p>
          </section>

          <section className={styles.section} id="derechos">
            <span className={styles.number}>07 / TUS DATOS</span>
            <h2>Tus derechos y contacto</h2>
            <p>
              Puedes solicitar información sobre los datos personales que
              mantenemos, pedir que se corrijan si son inexactos y solicitar su
              eliminación u oponerte a determinados usos cuando corresponda
              conforme a la normativa chilena aplicable.
            </p>
            <p>
              Para presentar una solicitud, escribe a nuestro contacto de
              privacidad e indica el tipo de solicitud. Podemos necesitar
              verificar tu identidad antes de comunicar o modificar datos de
              una cuenta.
            </p>
            <div className={styles.contactBox}>
              <span>CONTACTO DE PRIVACIDAD</span>
              {emailConfigurado ? (
                <a href={`mailto:${DATOS_RESPONSABLE.correo}`}>{DATOS_RESPONSABLE.correo}</a>
              ) : (
                <strong>{DATOS_RESPONSABLE.correo}</strong>
              )}
              {!emailConfigurado && <small>Este dato debe completarse con un correo real antes de publicar.</small>}
            </div>
          </section>

          <section className={styles.section} id="cambios">
            <span className={styles.number}>08 / ACTUALIZACIONES</span>
            <h2>Cambios a esta política</h2>
            <p>
              Esta política puede actualizarse si cambian los servicios, las
              funcionalidades o las obligaciones aplicables. La versión vigente
              se publicará en esta misma dirección con su fecha de actualización.
            </p>
          </section>
        </article>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Link href="/" className={styles.footerBrand}>HairBook</Link>
          <span>Tu información, con claridad.</span>
          <Link href="/">Volver al inicio ↗</Link>
        </div>
      </footer>
    </main>
  );
}
