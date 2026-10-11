
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";

export async function GET() {
  try {
    // 1. Verificar permisos
    const usuario = await obtenerUsuarioAdmin();

    if (!usuario) {
      return Response.json(
        { ok: false, mensaje: "Acceso no autorizado." },
        { status: 403 }
      );
    }

    // 2. Conectar con MongoDB
    const client = await clientPromise;
    const dbName = process.env.MONGODB_DB;

    if (!dbName) {
      throw new Error("Falta configurar MONGODB_DB.");
    }

    const db = client.db(dbName);

    // 3. Consultar las reservas
    const reservas = await db
      .collection("reservas")
      .find({})
      .sort({ fechaCreacion: -1 })
      .limit(100)
      .toArray();

    // 4. Preparar los datos para la interfaz
    const datos = reservas.map((reserva) => ({
      id: reserva._id.toString(),
      cliente: reserva.clienteNombre,
      servicio: reserva.servicioNombre,
      fecha: reserva.fecha,
      hora: reserva.hora,
      estado: reserva.estado || "pendiente",
      notas: reserva.notas || "",
    }));

    return Response.json({ ok: true, datos });
  } catch (error) {
    console.error("Error obteniendo reservas admin:", error);

    return Response.json(
      { ok: false, mensaje: "No fue posible cargar las reservas." },
      { status: 500 }
    );
  }
}
