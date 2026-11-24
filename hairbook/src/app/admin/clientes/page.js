
import Link from "next/link";
import { redirect } from "next/navigation";
import { obtenerUsuarioAdmin } from "@/lib/session";
import ListaClientes from "./ListaClientes";

export const dynamic = "force-dynamic";

export default async function ClientesPage() {
  const admin = await obtenerUsuarioAdmin();

  if (!admin) {
    redirect("/");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#faf7f3",
        padding: "40px 24px",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
        }}
      >
        {/* VOLVER AL PANEL */}

        <Link
          href="/admin"
          style={{
            display: "inline-block",
            marginBottom: 50,
            color: "#5e2635",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          ← Volver al panel de administración
        </Link>

        {/* ENCABEZADO */}

        <header style={{ marginBottom: 35 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: 2,
              color: "#b77a88",
            }}
          >
            HAIRBOOK · ADMINISTRACIÓN
          </span>

          <h1
            style={{
              fontFamily: "Georgia, serif",
              fontSize: "clamp(40px, 5vw, 65px)",
              fontWeight: 400,
              color: "#281e21",
              margin: "20px 0",
            }}
          >
            Clientes
          </h1>

          <p
            style={{
              fontSize: 17,
              color: "#786b6e",
              lineHeight: 1.6,
            }}
          >
            Consulta los clientes registrados,
            sus reservas y el historial de notas
            técnicas de sus atenciones.
          </p>
        </header>

        {/* LISTADO DE CLIENTES */}

        <ListaClientes />
      </div>
    </main>
  );
}
