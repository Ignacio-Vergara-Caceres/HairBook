
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";
import { normalizarTelefonoWhatsapp } from "@/lib/whatsapp";

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

    const idsClientes = [...new Set(reservas.map((r) => r.clienteId?.toString()).filter(Boolean))];
    const usuarios = await db.collection("usuarios").find({
      _id: { $in: idsClientes.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id)) },
    }, { projection: { telefono: 1 } }).toArray();
    const telefonos = new Map(usuarios.map((u) => [u._id.toString(), normalizarTelefonoWhatsapp(u.telefono)]));

    // 4. Preparar los datos para la interfaz
    const datos = reservas.map((reserva) => ({
      id: reserva._id.toString(),
      cliente: reserva.clienteNombre,
      servicio: reserva.servicioNombre,
      fecha: reserva.fecha,
      hora: reserva.hora,
      estado: reserva.estado || "pendiente",
      notas: reserva.notas || "",
      telefono: reserva.whatsapp?.consentimiento ? (reserva.whatsapp.numero || telefonos.get(reserva.clienteId?.toString()) || null) : null,
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
