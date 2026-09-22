import { MongoClient } from "mongodb";

export async function GET() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    return Response.json(
      {
        ok: false,
        mensaje: "No existe MONGODB_URI en .env.local",
      },
      {
        status: 500,
      }
    );
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();

    await client.db("admin").command({ ping: 1 });

    return Response.json({
      ok: true,
      mensaje: "Conectado correctamente a MongoDB Atlas",
    });
  } catch (error) {
    console.error("Error MongoDB:", error);

    return Response.json(
      {
        ok: false,
        mensaje: "No se pudo conectar a MongoDB",
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