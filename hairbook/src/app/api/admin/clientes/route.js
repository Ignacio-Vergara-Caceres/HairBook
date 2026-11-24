
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

// Normalizar nombres para facilitar la búsqueda.
function normalizarTexto(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Calcular pequeñas diferencias de escritura.
function distanciaTexto(a, b) {
  if (a === b) return 0;

  let anterior = Array.from(
    { length: b.length + 1 },
    (_, i) => i
  );

  for (let i = 1; i <= a.length; i++) {
    const actual = [i];

    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;

      actual[j] = Math.min(
        anterior[j] + 1,
        actual[j - 1] + 1,
        anterior[j - 1] + costo
      );
    }

    anterior = actual;
  }

  return anterior[b.length];
}

// Comprobar si el nombre coincide con la búsqueda.
function coincideNombre(nombre, busqueda) {
  const nombreNormalizado = normalizarTexto(nombre);
  const textoBuscado = normalizarTexto(busqueda);

  if (!textoBuscado) return true;

  if (nombreNormalizado.includes(textoBuscado)) {
    return true;
  }

  const palabrasNombre = nombreNormalizado.split(" ");
  const palabrasBusqueda = textoBuscado.split(" ");

  return palabrasBusqueda.every((buscada) => {
    return palabrasNombre.some((palabra) => {
      if (palabra.includes(buscada)) {
        return true;
      }

      // Evitar coincidencias demasiado amplias
      // cuando se escriben pocas letras.
      if (buscada.length < 4) {
        return false;
      }

      const tolerancia =
        buscada.length >= 6 ? 2 : 1;

      return (
        distanciaTexto(palabra, buscada) <= tolerancia
      );
    });
  });
}

// ==========================================
// OBTENER CLIENTES
// ==========================================

export async function GET(request) {
  try {
    // Solo el administrador puede consultar clientes.
    const admin = await obtenerUsuarioAdmin();

    if (!admin) {
      return Response.json(
        {
          ok: false,
          mensaje: "Acceso no autorizado.",
        },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);

    const busqueda = (
      searchParams.get("buscar") || ""
    ).trim().slice(0, 80);

    const paginaSolicitada = Number.parseInt(
      searchParams.get("pagina") || "1",
      10
    );

    const pagina =
      Number.isSafeInteger(paginaSolicitada) &&
      paginaSolicitada > 0
        ? paginaSolicitada
        : 1;

    const limite = 20;

    const db = (await clientPromise).db(
      process.env.MONGODB_DB || "capstone_peluqueria"
    );

    // Incluir usuarios que tienen rol cliente.
    // También se admiten cuentas con varios roles.
    const filtro = {
      $or: [
        { roles: "cliente" },
        { rol: "cliente" },
      ],
    };

    const clientesRegistrados = await db
      .collection("usuarios")
      .find(filtro, {
        projection: {
          nombre: 1,
          rut: 1,
          correo: 1,
          email: 1,
          telefono: 1,
        },
      })
      .toArray();

    // Búsqueda flexible por nombre.
    const clientesFiltrados = clientesRegistrados
      .filter((cliente) =>
        coincideNombre(cliente.nombre, busqueda)
      )
      .sort((a, b) =>
        String(a.nombre || "").localeCompare(
          String(b.nombre || ""),
          "es",
          { sensitivity: "base" }
        )
      );

    const total = clientesFiltrados.length;

    const inicio = (pagina - 1) * limite;

    const clientesPagina = clientesFiltrados.slice(
      inicio,
      inicio + limite
    );

    return Response.json({
      ok: true,

      clientes: clientesPagina.map((cliente) => ({
        id: String(cliente._id),
        nombre: cliente.nombre || "",
        rut: cliente.rut || "",
        correo:
          cliente.correo || cliente.email || "",
        telefono: cliente.telefono || "",
      })),

      total,
      pagina,
      totalPaginas: Math.ceil(total / limite),
    });

  } catch (error) {
    console.error(
      "Error al obtener clientes:",
      error
    );

    return Response.json(
      {
        ok: false,
        mensaje: "No se pudieron cargar los clientes.",
      },
      { status: 500 }
    );
  }
}
