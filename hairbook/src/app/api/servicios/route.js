import clientPromise from "@/lib/mongodb";

const serviciosDemo = [
  {
    codigo: "BALAYAGE",
    nombre: "Balayage / Iluminación",
    categoria: "Color",
    descripcion: "Diagnóstico, diseño de iluminación y trabajo personalizado según tu base y objetivo.",
    precioDesde: 65000,
    duracionMin: 180,
    destacado: true,
    activo: true,
  },
  {
    codigo: "COLOR_GLOBAL",
    nombre: "Color global",
    categoria: "Color",
    descripcion: "Aplicación de color uniforme con evaluación previa del cabello y terminación profesional.",
    precioDesde: 45000,
    duracionMin: 120,
    destacado: false,
    activo: true,
  },
  {
    codigo: "CORTE_BRUSHING",
    nombre: "Corte + brushing",
    categoria: "Corte",
    descripcion: "Corte personalizado, lavado y brushing para terminar el look.",
    precioDesde: 25000,
    duracionMin: 75,
    destacado: true,
    activo: true,
  },
  {
    codigo: "TRATAMIENTO",
    nombre: "Tratamiento reparador",
    categoria: "Tratamiento",
    descripcion: "Rutina intensiva enfocada en hidratación, reparación y mejor apariencia de la fibra capilar.",
    precioDesde: 32000,
    duracionMin: 90,
    destacado: false,
    activo: true,
  },
  {
    codigo: "MECHAS",
    nombre: "Mechas / Visos",
    categoria: "Color",
    descripcion: "Servicio de aclarado localizado, adaptado al tono base y al resultado buscado.",
    precioDesde: 55000,
    duracionMin: 150,
    destacado: false,
    activo: true,
  },
  {
    codigo: "PEINADO",
    nombre: "Peinado",
    categoria: "Styling",
    descripcion: "Peinado social o terminación especial según ocasión y estilo deseado.",
    precioDesde: 22000,
    duracionMin: 60,
    destacado: false,
    activo: true,
  },
];

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("capstone_peluqueria");
    const collection = db.collection("servicios");

    const cantidad = await collection.countDocuments({ activo: { $ne: false } });
    if (cantidad === 0) {
      await collection.insertMany(
        serviciosDemo.map((servicio) => ({ ...servicio, fechaCreacion: new Date() }))
      );
    }

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
