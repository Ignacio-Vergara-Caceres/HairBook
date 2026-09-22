import { MongoClient } from "mongodb";

const coleccionesPermitidas = [
  "negocios",
  "clientes",
  "profesionales",
];

export async function POST(request) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return Response.json(
      {
        ok: false,
        mensaje: "Falta MONGODB_URI",
      },
      {
        status: 500,
      }
    );
  }

  const client = new MongoClient(uri);

  try {
    const body = await request.json();

    // Esto permite que el formulario actual de negocio
    // siga funcionando mientras hacemos los cambios.
    const tipo = body.tipo || "negocios";
    const datos = body.datos || body;

    if (!coleccionesPermitidas.includes(tipo)) {
      return Response.json(
        {
          ok: false,
          mensaje: "Tipo de registro no permitido",
        },
        {
          status: 400,
        }
      );
    }

    if (!datos.nombre) {
      return Response.json(
        {
          ok: false,
          mensaje: "El nombre es obligatorio",
        },
        {
          status: 400,
        }
      );
    }

    await client.connect();

    const db = client.db("capstone_peluqueria");

    const documento = {
      ...datos,
      fechaCreacion: new Date(),
    };

    const resultado = await db
      .collection(tipo)
      .insertOne(documento);

    return Response.json(
      {
        ok: true,
        mensaje: "Registro guardado correctamente",
        tipo,
        id: resultado.insertedId.toString(),
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Error MongoDB:", error);

    return Response.json(
      {
        ok: false,
        mensaje: "Error guardando el registro",
        error: error.message,
      },
      {
        status: 500,
      }
    );
  } finally {
    await client.close();
  }
}

export async function GET(request) {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return Response.json(
      {
        ok: false,
        mensaje: "Falta MONGODB_URI",
      },
      {
        status: 500,
      }
    );
  }

  const client = new MongoClient(uri);

  try {
    const { searchParams } = new URL(request.url);

    const tipo = searchParams.get("tipo");

    if (!coleccionesPermitidas.includes(tipo)) {
      return Response.json(
        {
          ok: false,
          mensaje: "Tipo de registro no permitido",
        },
        {
          status: 400,
        }
      );
    }

    await client.connect();

    const db = client.db("capstone_peluqueria");

    const registros = await db
      .collection(tipo)
      .find({})
      .sort({ fechaCreacion: -1 })
      .toArray();

    const datos = registros.map((registro) => ({
      ...registro,
      _id: registro._id.toString(),
    }));

    return Response.json({
      ok: true,
      datos,
    });
  } catch (error) {
    console.error("Error MongoDB:", error);

    return Response.json(
      {
        ok: false,
        mensaje: "Error obteniendo registros",
        error: error.message,
      },
      {
        status: 500,
      }
    );
  } finally {
    await client.close();
  }
}