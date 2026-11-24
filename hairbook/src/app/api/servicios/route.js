import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB || "capstone_peluqueria");
    const collection = db.collection("servicios");

    const servicios = await collection
      .find({ activo: { $ne: false } })
      .sort({ destacado: -1, nombre: 1 })
      .toArray();

    return Response.json({
      ok: true,
      datos: servicios.map((servicio) => ({
        ...servicio,
        _id: servicio._id.toString(),
      })),
    });
  } catch (error) {
    console.error("Error obteniendo servicios:", error);
    return Response.json(
      { ok: false, mensaje: "No fue posible cargar los servicios." },
      { status: 500 }
    );
  }
}
