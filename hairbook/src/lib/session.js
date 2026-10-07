import { ObjectId } from "mongodb";
import { cookies } from "next/headers";
import { obtenerRolesUsuario, verificarTokenSesion } from "./auth";
import clientPromise from "./mongodb";

export async function obtenerUsuarioSesion() {
  const cookieStore = await cookies();
  const token = cookieStore.get("hairbook_session")?.value;
  const sesion = verificarTokenSesion(token);

  if (!sesion) return null;

  // Compatibilidad temporal con cookies antiguas que aún guardaban `rol`.
  return {
    ...sesion,
    roles: obtenerRolesUsuario(sesion),
  };
}

export async function obtenerUsuarioAdmin() {
  const sesion = await obtenerUsuarioSesion();

  if (!sesion?.id || !ObjectId.isValid(sesion.id)) {
    return null;
  }

  const dbName = process.env.MONGODB_DB || "capstone_peluqueria";
  const client = await clientPromise;
  const db = client.db(dbName);

  const usuario = await db.collection("usuarios").findOne({
    _id: new ObjectId(sesion.id),
    activo: { $ne: false },
    $or: [
      { roles: "admin" },
      { rol: "admin" }, // compatibilidad temporal con documentos antiguos
    ],
  });

  if (!usuario) {
    return null;
  }

  return {
    id: usuario._id.toString(),
    nombre: usuario.nombre,
    rut: usuario.rut,
    roles: obtenerRolesUsuario(usuario),
  };
}
