import clientPromise from "@/lib/mongodb";
import { profesionalPublico } from "@/lib/profesionales";

export const dynamic = "force-dynamic";
export async function GET(request) {
  try {
    const servicioId = new URL(request.url).searchParams.get("servicioId");
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    const filtro = { activo: { $ne: false }, $or: [{ roles: "profesional" }, { rol: "profesional" }] };
    if (servicioId) filtro.serviciosIds = servicioId;
    const datos = await db.collection("usuarios").find(filtro, { projection: { nombre: 1, especialidad: 1, serviciosIds: 1 } }).sort({ nombre: 1 }).toArray();
    return Response.json({ ok: true, datos: datos.map(profesionalPublico) });
  } catch (error) {
    console.error("Error listando profesionales:", error);
    return Response.json({ ok: false, mensaje: "No fue posible obtener profesionales." }, { status: 500 });
  }
}
