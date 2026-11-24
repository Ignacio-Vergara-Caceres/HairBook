
"use client";

import { useEffect, useState } from "react";
import HistorialCliente from "./HistorialCliente";

export default function ListaClientes() {
  const [clientes, setClientes] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  // ==========================================
  // OBTENER CLIENTES DESDE MONGODB
  // ==========================================

  useEffect(() => {
    const controller = new AbortController();

    const temporizador = setTimeout(async () => {
      setCargando(true);
      setError("");

      try {
        const parametros = new URLSearchParams({
          buscar: busqueda,
          pagina: String(pagina),
        });

        const respuesta = await fetch(
          `/api/admin/clientes?${parametros}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const datos = await respuesta.json();

        if (!respuesta.ok || !datos.ok) {
          throw new Error(
            datos.mensaje ||
              "No se pudieron cargar los clientes."
          );
        }

        setClientes(datos.clientes || []);
        setTotal(datos.total || 0);
        setTotalPaginas(
          Math.max(1, datos.totalPaginas || 1)
        );
      } catch (err) {
        if (err.name !== "AbortError") {
          setError(err.message);
          setClientes([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    }, 300);

    return () => {
      clearTimeout(temporizador);
      controller.abort();
    };
  }, [busqueda, pagina]);

  // ==========================================
  // BUSCAR CLIENTES
  // ==========================================

  function buscarCliente(texto) {
    setBusqueda(texto);
    setPagina(1);
  }

  // ==========================================
  // INTERFAZ PRINCIPAL
  // ==========================================

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #e8dcd6",
        borderRadius: 20,
        padding: "30px",
      }}
    >
      {/* ENCABEZADO */}

      <div style={{ marginBottom: 25 }}>
        <h2
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 28,
            fontWeight: 400,
            color: "#5e2635",
            margin: "0 0 8px",
          }}
        >
          Clientes registrados
        </h2>

        <p
          style={{
            color: "#786b6e",
            fontSize: 14,
            margin: 0,
          }}
        >
          Consulta los clientes registrados
          en HairBook y su historial de atención.
        </p>
      </div>

      {/* BUSCADOR DE CLIENTES */}

      <div style={{ marginBottom: 25 }}>
        <label
          htmlFor="buscar-cliente"
          style={{
            display: "block",
            marginBottom: 10,
            fontSize: 14,
            fontWeight: 600,
            color: "#5e2635",
          }}
        >
          Buscar cliente
        </label>

        <input
          id="buscar-cliente"
          type="search"
          value={busqueda}
          onChange={(e) =>
            buscarCliente(e.target.value)
          }
          placeholder="Escribe el nombre del cliente..."
          style={{
            width: "100%",
            padding: "15px 18px",
            border: "1px solid #e4d7d2",
            borderRadius: 12,
            background: "#fcfaf8",
            fontSize: 15,
            fontFamily: "inherit",
            color: "#31272b",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* CANTIDAD DE CLIENTES */}

      {!cargando && !error && (
        <p
          style={{
            marginBottom: 20,
            fontSize: 13,
            color: "#87767a",
          }}
        >
          {total === 1
            ? "1 cliente encontrado"
            : `${total} clientes encontrados`}
        </p>
      )}

      {/* ESTADO DE CARGA */}

      {cargando && (
        <p role="status">
          Cargando clientes...
        </p>
      )}

      {/* ERRORES */}

      {error && (
        <p
          role="alert"
          style={{
            color: "#b42318",
          }}
        >
          {error}
        </p>
      )}

      {/* SIN RESULTADOS */}

      {!cargando &&
        !error &&
        clientes.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              background: "#fcfaf8",
              borderRadius: 14,
            }}
          >
            <p style={{ color: "#786b6e" }}>
              {busqueda
                ? "No se encontraron clientes con ese nombre."
                : "Todavía no hay clientes registrados."}
            </p>
          </div>
        )}

      {/* LISTADO DE CLIENTES */}

      {!cargando &&
        !error &&
        clientes.length > 0 && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(min(100%, 300px), 1fr))",
              gap: 16,
              alignItems: "start",
            }}
          >
            {clientes.map((cliente) => (
              <article
                key={cliente.id}
                style={{
                  padding: 22,
                  border: "1px solid #e8dcd6",
                  borderRadius: 14,
                  background: "#ffffff",
                  minWidth: 0,
                }}
              >
                {/* NOMBRE DEL CLIENTE */}

                <h3
                  style={{
                    fontSize: 18,
                    color: "#5e2635",
                    margin: "0 0 12px",
                    fontWeight: 600,
                  }}
                >
                  {cliente.nombre}
                </h3>

                {/* DATOS DEL CLIENTE */}

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    color: "#786b6e",
                    fontSize: 14,
                    overflowWrap: "anywhere",
                  }}
                >
                  {cliente.correo && (
                    <span>
                      {cliente.correo}
                    </span>
                  )}

                  {cliente.telefono && (
                    <span>
                      {cliente.telefono}
                    </span>
                  )}
                </div>

                {/* HISTORIAL DE RESERVAS Y NOTAS */}

                <HistorialCliente
                  clienteId={cliente.id}
                />
              </article>
            ))}
          </div>
        )}

      {/* PAGINACIÓN */}

      {!cargando &&
        !error &&
        totalPaginas > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 15,
              marginTop: 30,
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              disabled={pagina === 1}
              onClick={() =>
                setPagina((actual) => actual - 1)
              }
              style={{
                ...estiloBoton,
                opacity: pagina === 1 ? 0.5 : 1,
              }}
            >
              Anterior
            </button>

            <span
              style={{
                fontSize: 13,
                color: "#786b6e",
              }}
            >
              Página {pagina} de {totalPaginas}
            </span>

            <button
              type="button"
              disabled={pagina >= totalPaginas}
              onClick={() =>
                setPagina((actual) => actual + 1)
              }
              style={{
                ...estiloBoton,
                opacity:
                  pagina >= totalPaginas ? 0.5 : 1,
              }}
            >
              Siguiente
            </button>
          </div>
        )}
    </section>
  );
}

// ==========================================
// ESTILO DE BOTONES DE PAGINACIÓN
// ==========================================

const estiloBoton = {
  padding: "10px 18px",
  border: "1px solid #5e2635",
  borderRadius: 10,
  background: "#ffffff",
  color: "#5e2635",
  cursor: "pointer",
  fontWeight: 600,
  fontFamily: "inherit",
};
