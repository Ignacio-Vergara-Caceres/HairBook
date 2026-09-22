"use client";

import { useEffect, useMemo, useState } from "react";

function formatoPrecio(valor) {
  if (!valor) return "A confirmar";
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(valor);
}

function fechaMinima() {
  const hoy = new Date();
  const offset = hoy.getTimezoneOffset();
  const local = new Date(hoy.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

const horarios = [
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

function Logo({ compact = false }) {
  return (
    <button
      type="button"
      className={`brand ${compact ? "brand-compact" : ""}`}
      aria-label="Ir al inicio"
    >
      <span className="brand-mark">HB</span>
      <span className="brand-copy">
        <strong>Hair Book</strong>
        {!compact && <small>Tu cabello, tu momento</small>}
      </span>
    </button>
  );
}

function Spinner() {
  return <span className="spinner" aria-hidden="true" />;
}

export default function Home() {
  const [pantalla, setPantalla] = useState("inicio");
  const [modoAuth, setModoAuth] = useState("login");
  const [usuario, setUsuario] = useState(null);
  const [cargandoSesion, setCargandoSesion] = useState(true);
  const [servicios, setServicios] = useState([]);
  const [cargandoServicios, setCargandoServicios] = useState(true);
  const [categoria, setCategoria] = useState("Todos");
  const [servicioSeleccionado, setServicioSeleccionado] = useState(null);
  const [reservaConfirmada, setReservaConfirmada] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [cargandoReservas, setCargandoReservas] = useState(false);

  const [login, setLogin] = useState({ rut: "", contrasena: "" });
  const [registro, setRegistro] = useState({
    nombre: "",
    rut: "",
    telefono: "",
    correo: "",
    contrasena: "",
  });
  const [reserva, setReserva] = useState({ fecha: "", hora: "", notas: "" });
  const [mensajeAuth, setMensajeAuth] = useState("");
  const [mensajeReserva, setMensajeReserva] = useState("");
  const [enviandoAuth, setEnviandoAuth] = useState(false);
  const [enviandoReserva, setEnviandoReserva] = useState(false);

  useEffect(() => {
    const iniciar = async () => {
      try {
        const [sessionResponse, serviciosResponse] = await Promise.all([
          fetch("/api/auth/session", { cache: "no-store" }),
          fetch("/api/servicios", { cache: "no-store" }),
        ]);

        const sessionData = await sessionResponse.json();
        const serviciosData = await serviciosResponse.json();

        if (sessionData.ok && sessionData.usuario) setUsuario(sessionData.usuario);
        if (serviciosData.ok) setServicios(serviciosData.datos || []);
      } catch (error) {
        console.error("Error inicializando la aplicación:", error);
      } finally {
        setCargandoSesion(false);
        setCargandoServicios(false);
      }
    };

    iniciar();
  }, []);

  const categorias = useMemo(() => {
    return ["Todos", ...new Set(servicios.map((servicio) => servicio.categoria))];
  }, [servicios]);

  const serviciosFiltrados = useMemo(() => {
    if (categoria === "Todos") return servicios;
    return servicios.filter((servicio) => servicio.categoria === categoria);
  }, [categoria, servicios]);

  const navegar = (destino) => {
    setPantalla(destino);
    setMensajeAuth("");
    setMensajeReserva("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const abrirServicios = () => navegar("servicios");

  const elegirServicio = (servicio) => {
    setServicioSeleccionado(servicio);
    setReserva({ fecha: "", hora: "", notas: "" });
    setMensajeReserva("");

    if (!usuario) {
      setModoAuth("login");
      navegar("auth");
      return;
    }

    navegar("checkout");
  };

  const completarAuth = async (evento) => {
    evento.preventDefault();
    setEnviandoAuth(true);
    setMensajeAuth("");

    const endpoint = modoAuth === "login" ? "/api/auth/login" : "/api/auth/register";
    const datos = modoAuth === "login" ? login : registro;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const result = await response.json();

      if (!result.ok) {
        setMensajeAuth(result.mensaje || "No fue posible continuar.");
        return;
      }

      setUsuario(result.usuario);
      setLogin({ rut: "", contrasena: "" });
      setRegistro({ nombre: "", rut: "", telefono: "", correo: "", contrasena: "" });

      if (servicioSeleccionado) {
        navegar("checkout");
      } else {
        navegar("servicios");
      }
    } catch (error) {
      console.error(error);
      setMensajeAuth("No pudimos conectar con el servidor. Intenta nuevamente.");
    } finally {
      setEnviandoAuth(false);
    }
  };

  const cerrarSesion = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUsuario(null);
      setReservas([]);
      setServicioSeleccionado(null);
      navegar("inicio");
    }
  };

  const enviarReserva = async (evento) => {
    evento.preventDefault();
    if (!servicioSeleccionado) return;

    setEnviandoReserva(true);
    setMensajeReserva("");

    try {
      const response = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          servicioId: servicioSeleccionado._id,
          ...reserva,
        }),
      });
      const result = await response.json();

      if (!result.ok) {
        if (response.status === 401) {
          setUsuario(null);
          setModoAuth("login");
          navegar("auth");
          return;
        }
        setMensajeReserva(result.mensaje || "No fue posible enviar la reserva.");
        return;
      }

      setReservaConfirmada(result.reserva);
      navegar("confirmacion");
    } catch (error) {
      console.error(error);
      setMensajeReserva("No pudimos conectar con el servidor. Intenta nuevamente.");
    } finally {
      setEnviandoReserva(false);
    }
  };

  const verReservas = async () => {
    if (!usuario) {
      setModoAuth("login");
      navegar("auth");
      return;
    }

    setCargandoReservas(true);
    navegar("mis-reservas");
    try {
      const response = await fetch("/api/reservas", { cache: "no-store" });
      const result = await response.json();
      if (result.ok) setReservas(result.datos || []);
    } catch (error) {
      console.error(error);
    } finally {
      setCargandoReservas(false);
    }
  };

  const volverInicio = () => {
    setServicioSeleccionado(null);
    setReservaConfirmada(null);
    navegar("inicio");
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="container topbar-inner">
          <div onClick={volverInicio}>
            <Logo compact />
          </div>
          <nav className="desktop-nav" aria-label="Navegación principal">
            <button onClick={volverInicio}>Inicio</button>
            <button onClick={abrirServicios}>Servicios</button>
            {usuario && <button onClick={verReservas}>Mis reservas</button>}
          </nav>
          <div className="nav-actions">
            {cargandoSesion ? (
              <span className="session-loading"><Spinner /></span>
            ) : usuario ? (
              <>
                <button className="user-pill" onClick={verReservas}>
                  <span className="avatar">{usuario.nombre?.charAt(0)?.toUpperCase() || "C"}</span>
                  <span>{usuario.nombre?.split(" ")[0]}</span>
                </button>
                <button className="link-button desktop-only" onClick={cerrarSesion}>Salir</button>
              </>
            ) : (
              <button className="button button-small button-outline" onClick={() => navegar("auth")}>
                Ingresar
              </button>
            )}
          </div>
        </div>
      </header>

      {pantalla === "inicio" && (
        <>
          <section className="hero">
            <div className="container hero-grid">
              <div className="hero-copy">
                <span className="eyebrow">Belleza personalizada, agenda simple</span>
                <h1>Tu próxima cita comienza aquí.</h1>
                <p>
                  Descubre servicios pensados para ti, solicita tu horario en pocos pasos
                  y recibe la confirmación de la profesional.
                </p>
                <div className="hero-actions">
                  <button className="button button-primary" onClick={abrirServicios}>
                    Ver servicios
                  </button>
                  {!usuario && (
                    <button
                      className="button button-ghost"
                      onClick={() => {
                        setModoAuth("registro");
                        navegar("auth");
                      }}
                    >
                      Crear mi cuenta
                    </button>
                  )}
                </div>
                <div className="hero-points">
                  <span><i>01</i> Elige tu servicio</span>
                  <span><i>02</i> Solicita un horario</span>
                  <span><i>03</i> Recibe confirmación</span>
                </div>
              </div>

              <div className="hero-visual" aria-label="Presentación de Hair Book">
                <div className="visual-card visual-main">
                  <span className="visual-label">Hair Book</span>
                  <div className="hair-lines" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="visual-copy">
                    <small>Experiencia personalizada</small>
                    <strong>Reserva tu momento</strong>
                  </div>
                </div>
                <div className="floating-card floating-top">
                  <span className="floating-icon">✓</span>
                  <div><small>Proceso simple</small><strong>Reserva online</strong></div>
                </div>
                <div className="floating-card floating-bottom">
                  <small>Desde</small>
                  <strong>{servicios[0] ? formatoPrecio(servicios[0].precioDesde) : "$25.000"}</strong>
                  <span>Valores referenciales</span>
                </div>
              </div>
            </div>
          </section>

          <section className="section section-soft">
            <div className="container">
              <div className="section-heading">
                <div>
                  <span className="eyebrow">Servicios destacados</span>
                  <h2>Encuentra lo que tu cabello necesita</h2>
                </div>
                <button className="text-arrow" onClick={abrirServicios}>Ver todos <span>→</span></button>
              </div>

              <div className="service-grid home-services">
                {(servicios.length ? servicios.slice(0, 3) : [1, 2, 3]).map((servicio, index) =>
                  typeof servicio === "number" ? (
                    <div className="service-card skeleton-card" key={servicio} />
                  ) : (
                    <article className="service-card" key={servicio._id}>
                      <div className={`service-art art-${index + 1}`}>
                        <span>{servicio.categoria}</span>
                        <strong>{String(index + 1).padStart(2, "0")}</strong>
                      </div>
                      <div className="service-body">
                        <div className="service-meta"><span>{servicio.duracionMin} min aprox.</span><span>Desde {formatoPrecio(servicio.precioDesde)}</span></div>
                        <h3>{servicio.nombre}</h3>
                        <p>{servicio.descripcion}</p>
                        <button className="service-link" onClick={() => elegirServicio(servicio)}>Solicitar hora <span>→</span></button>
                      </div>
                    </article>
                  )
                )}
              </div>
            </div>
          </section>

          <section className="how-section">
            <div className="container how-grid">
              <div>
                <span className="eyebrow eyebrow-light">Una agenda hecha para ti</span>
                <h2>Menos mensajes. Más claridad.</h2>
                <p>
                  Hair Book centraliza la solicitud de horas para que puedas revisar servicios,
                  elegir una fecha y saber siempre en qué estado está tu reserva.
                </p>
              </div>
              <div className="how-list">
                <div><b>01</b><span><strong>Explora</strong><small>Revisa servicios y valores referenciales.</small></span></div>
                <div><b>02</b><span><strong>Solicita</strong><small>Elige fecha, hora y agrega una nota si la necesitas.</small></span></div>
                <div><b>03</b><span><strong>Confirma</strong><small>La administradora revisa tu solicitud y define el valor final.</small></span></div>
              </div>
            </div>
          </section>
        </>
      )}

      {pantalla === "servicios" && (
        <section className="page-section">
          <div className="container">
            <div className="page-heading">
              <button className="back-link" onClick={volverInicio}>← Inicio</button>
              <span className="eyebrow">Catálogo</span>
              <h1>Servicios</h1>
              <p>Elige el servicio que quieres solicitar. El valor final será confirmado después de revisar tu caso.</p>
            </div>

            <div className="category-tabs" role="tablist" aria-label="Categorías de servicio">
              {categorias.map((item) => (
                <button
                  key={item}
                  className={categoria === item ? "active" : ""}
                  onClick={() => setCategoria(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            {cargandoServicios ? (
              <div className="center-state"><Spinner /> Cargando servicios...</div>
            ) : (
              <div className="service-grid catalog-grid">
                {serviciosFiltrados.map((servicio, index) => (
                  <article className="service-card" key={servicio._id}>
                    <div className={`service-art art-${(index % 3) + 1}`}>
                      <span>{servicio.categoria}</span>
                      <strong>{String(index + 1).padStart(2, "0")}</strong>
                    </div>
                    <div className="service-body">
                      <div className="service-meta">
                        <span>{servicio.duracionMin} min aprox.</span>
                        <span>Desde {formatoPrecio(servicio.precioDesde)}</span>
                      </div>
                      <h3>{servicio.nombre}</h3>
                      <p>{servicio.descripcion}</p>
                      <button className="button button-dark full" onClick={() => elegirServicio(servicio)}>
                        Reservar este servicio
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {pantalla === "auth" && (
        <section className="auth-section">
          <div className="auth-decoration" aria-hidden="true"><span>HAIR</span><span>BOOK</span></div>
          <div className="auth-card">
            <button className="back-link" onClick={() => navegar(servicioSeleccionado ? "servicios" : "inicio")}>← Volver</button>
            <Logo />
            <div className="auth-copy">
              <h1>{modoAuth === "login" ? "Qué bueno verte de nuevo" : "Crea tu cuenta"}</h1>
              <p>
                {modoAuth === "login"
                  ? "Ingresa para continuar con tu reserva y revisar tus solicitudes."
                  : "Regístrate para solicitar horas y mantener tus reservas en un solo lugar."}
              </p>
            </div>

            <div className="auth-tabs">
              <button className={modoAuth === "login" ? "active" : ""} onClick={() => { setModoAuth("login"); setMensajeAuth(""); }}>Ingresar</button>
              <button className={modoAuth === "registro" ? "active" : ""} onClick={() => { setModoAuth("registro"); setMensajeAuth(""); }}>Registrarme</button>
            </div>

            <form className="form-stack" onSubmit={completarAuth}>
              {modoAuth === "registro" && (
                <>
                  <label className="field">
                    <span>Nombre completo</span>
                    <input
                      type="text"
                      value={registro.nombre}
                      onChange={(e) => setRegistro({ ...registro, nombre: e.target.value })}
                      placeholder="Ej. Camila Soto"
                      required
                    />
                  </label>
                  <div className="field-row">
                    <label className="field">
                      <span>Teléfono</span>
                      <input
                        type="tel"
                        value={registro.telefono}
                        onChange={(e) => setRegistro({ ...registro, telefono: e.target.value })}
                        placeholder="+56 9..."
                      />
                    </label>
                    <label className="field">
                      <span>Correo</span>
                      <input
                        type="email"
                        value={registro.correo}
                        onChange={(e) => setRegistro({ ...registro, correo: e.target.value })}
                        placeholder="tu@correo.cl"
                      />
                    </label>
                  </div>
                </>
              )}

              <label className="field">
                <span>RUT</span>
                <input
                  type="text"
                  value={modoAuth === "login" ? login.rut : registro.rut}
                  onChange={(e) =>
                    modoAuth === "login"
                      ? setLogin({ ...login, rut: e.target.value })
                      : setRegistro({ ...registro, rut: e.target.value })
                  }
                  placeholder="12.345.678-9"
                  autoComplete="username"
                  required
                />
              </label>

              <label className="field">
                <span>Contraseña</span>
                <input
                  type="password"
                  value={modoAuth === "login" ? login.contrasena : registro.contrasena}
                  onChange={(e) =>
                    modoAuth === "login"
                      ? setLogin({ ...login, contrasena: e.target.value })
                      : setRegistro({ ...registro, contrasena: e.target.value })
                  }
                  placeholder="Mínimo 6 caracteres"
                  autoComplete={modoAuth === "login" ? "current-password" : "new-password"}
                  minLength={6}
                  required
                />
              </label>

              {mensajeAuth && <p className="form-message error">{mensajeAuth}</p>}

              <button className="button button-primary full" type="submit" disabled={enviandoAuth}>
                {enviandoAuth ? <><Spinner /> Procesando...</> : modoAuth === "login" ? "Ingresar" : "Crear cuenta y continuar"}
              </button>
            </form>
            <p className="privacy-note">Tus datos se utilizarán únicamente para gestionar tu cuenta y tus reservas.</p>
          </div>
        </section>
      )}

      {pantalla === "checkout" && servicioSeleccionado && (
        <section className="page-section checkout-section">
          <div className="container">
            <button className="back-link" onClick={() => navegar("servicios")}>← Volver a servicios</button>
            <div className="checkout-heading">
              <span className="eyebrow">Solicitud de reserva</span>
              <h1>Agenda tu servicio</h1>
              <p>Completa tus preferencias. La administradora revisará disponibilidad antes de confirmar.</p>
            </div>

            <div className="checkout-grid">
              <form className="checkout-card" onSubmit={enviarReserva}>
                <div className="step-heading"><span>1</span><div><strong>Elige tu horario</strong><small>Selecciona una fecha y hora preferente.</small></div></div>
                <div className="field-row">
                  <label className="field">
                    <span>Fecha</span>
                    <input
                      type="date"
                      min={fechaMinima()}
                      value={reserva.fecha}
                      onChange={(e) => setReserva({ ...reserva, fecha: e.target.value })}
                      required
                    />
                  </label>
                  <label className="field">
                    <span>Hora preferente</span>
                    <select
                      value={reserva.hora}
                      onChange={(e) => setReserva({ ...reserva, hora: e.target.value })}
                      required
                    >
                      <option value="">Seleccionar</option>
                      {horarios.map((hora) => <option key={hora} value={hora}>{hora}</option>)}
                    </select>
                  </label>
                </div>

                <div className="step-heading second"><span>2</span><div><strong>Cuéntanos algo más</strong><small>Opcional: déjanos información útil para preparar tu atención.</small></div></div>
                <label className="field">
                  <span>Notas</span>
                  <textarea
                    rows="4"
                    value={reserva.notas}
                    onChange={(e) => setReserva({ ...reserva, notas: e.target.value })}
                    placeholder="Ej. Mi cabello está teñido, quiero mantener el largo..."
                  />
                </label>

                {mensajeReserva && <p className="form-message error">{mensajeReserva}</p>}

                <button className="button button-primary full" type="submit" disabled={enviandoReserva}>
                  {enviandoReserva ? <><Spinner /> Enviando...</> : "Enviar solicitud de reserva"}
                </button>
                <p className="checkout-disclaimer">No se realizará ningún cobro en esta etapa.</p>
              </form>

              <aside className="summary-card">
                <span className="summary-tag">Tu selección</span>
                <div className="summary-art">
                  <span>{servicioSeleccionado.categoria}</span>
                  <b>HB</b>
                </div>
                <h2>{servicioSeleccionado.nombre}</h2>
                <p>{servicioSeleccionado.descripcion}</p>
                <div className="summary-lines">
                  <div><span>Duración estimada</span><strong>{servicioSeleccionado.duracionMin} min</strong></div>
                  <div><span>Valor referencial</span><strong>Desde {formatoPrecio(servicioSeleccionado.precioDesde)}</strong></div>
                  <div><span>Estado inicial</span><strong className="status pending">Pendiente</strong></div>
                </div>
                <div className="summary-note"><b>Importante</b><span>El valor final y la disponibilidad se confirman después de revisar tu solicitud.</span></div>
              </aside>
            </div>
          </div>
        </section>
      )}

      {pantalla === "confirmacion" && reservaConfirmada && (
        <section className="success-section">
          <div className="success-card">
            <div className="success-icon">✓</div>
            <span className="eyebrow">Solicitud enviada</span>
            <h1>¡Tu hora está en revisión!</h1>
            <p>Recibimos tu solicitud correctamente. La administradora debe revisar disponibilidad y confirmar el valor final.</p>

            <div className="success-summary">
              <div><span>Servicio</span><strong>{reservaConfirmada.servicio}</strong></div>
              <div><span>Fecha solicitada</span><strong>{reservaConfirmada.fecha}</strong></div>
              <div><span>Hora</span><strong>{reservaConfirmada.hora}</strong></div>
              <div><span>Estado</span><strong className="status pending">Pendiente de aprobación</strong></div>
            </div>

            <div className="success-actions">
              <button className="button button-primary" onClick={verReservas}>Ver mis reservas</button>
              <button className="button button-ghost" onClick={volverInicio}>Volver al inicio</button>
            </div>
          </div>
        </section>
      )}

      {pantalla === "mis-reservas" && (
        <section className="page-section reservations-section">
          <div className="container narrow-container">
            <button className="back-link" onClick={volverInicio}>← Inicio</button>
            <div className="page-heading align-left">
              <span className="eyebrow">Mi cuenta</span>
              <h1>Mis reservas</h1>
              <p>Revisa las solicitudes asociadas a tu cuenta.</p>
            </div>

            {cargandoReservas ? (
              <div className="center-state"><Spinner /> Cargando reservas...</div>
            ) : reservas.length === 0 ? (
              <div className="empty-state">
                <span className="empty-mark">HB</span>
                <h2>Aún no tienes reservas</h2>
                <p>Cuando solicites un servicio, podrás revisar su estado desde aquí.</p>
                <button className="button button-primary" onClick={abrirServicios}>Explorar servicios</button>
              </div>
            ) : (
              <div className="reservation-list">
                {reservas.map((item) => (
                  <article className="reservation-item" key={item.id}>
                    <div className="reservation-date">
                      <strong>{item.fecha?.slice(-2)}</strong>
                      <span>{item.fecha?.slice(5, 7)}/{item.fecha?.slice(0, 4)}</span>
                    </div>
                    <div className="reservation-copy">
                      <span className="reservation-label">Servicio</span>
                      <h3>{item.servicio}</h3>
                      <p>{item.hora} hrs · Desde {formatoPrecio(item.precioReferencial)}</p>
                    </div>
                    <span className={`status ${item.estado === "pendiente" ? "pending" : ""}`}>{item.estado}</span>
                  </article>
                ))}
              </div>
            )}

            <button className="link-button mobile-logout" onClick={cerrarSesion}>Cerrar sesión</button>
          </div>
        </section>
      )}

      <footer className="footer">
        <div className="container footer-inner">
          <Logo compact />
          <p>Proyecto Capstone · Ingeniería en Informática · Duoc UC</p>
          <span>Hair Book 2026</span>
        </div>
      </footer>
    </main>
  );
}
