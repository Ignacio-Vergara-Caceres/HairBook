import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { obtenerUsuarioAdmin } from "@/lib/session";
import { validarServicio } from "@/lib/validarServicio";

export const dynamic = "force-dynamic";
const dbServicios = async () => (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria").collection("servicios");
export async function GET() {
  try {
    if (!await obtenerUsuarioAdmin()) return Response.json({ ok: false, mensaje: "Acceso no autorizado." }, { status: 403 });
    const datos = await (await dbServicios()).find({}).sort({ activo: -1, destacado: -1, nombre: 1 }).toArray();
    return Response.json({ ok: true, datos: datos.map(s => ({ ...s, _id: String(s._id) })) });
  } catch (error) { console.error("Error listando servicios:", error); return Response.json({ ok: false, mensaje: "No se pudieron cargar los servicios." }, { status: 500 }); }
}
export async function POST(request) {
  try {
    if (!await obtenerUsuarioAdmin()) return Response.json({ ok: false, mensaje: "Acceso no autorizado." }, { status: 403 });
    const { campos, error } = validarServicio(await request.json());
    if (error) return Response.json({ ok: false, mensaje: error }, { status: 400 });
    const col = await dbServicios();
    // MongoDB genera un identificador único; derivamos de él un código estable
    // para conservar la compatibilidad con las reservas y servicios existentes.
    const _id = new ObjectId();
    const doc = { _id, ...campos, codigo: `SRV_${_id.toHexString().toUpperCase()}`, activo: campos.activo ?? true, destacado: campos.destacado ?? false, fechaCreacion: new Date() };
    await col.insertOne(doc);
    return Response.json({ ok: true, datos: { ...doc, _id: String(_id) } }, { status: 201 });
  } catch (error) { console.error("Error creando servicio:", error); return Response.json({ ok: false, mensaje: "No se pudo crear el servicio." }, { status: 500 }); }
}
