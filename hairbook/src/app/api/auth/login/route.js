import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import {
  crearTokenSesion,
  normalizarRut,
  sessionCookieOptions,
  verificarContrasena,
} from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const rut = normalizarRut(body.rut);
    const contrasena = body.contrasena || "";

    if (!rut || !contrasena) {
      return Response.json(
        { ok: false, mensaje: "Ingresa tu RUT y contraseña." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("capstone_peluqueria");
    const usuario = await db.collection("clientes").findOne({ rut, activo: { $ne: false } });

    if (
      !usuario?.passwordHash ||
      !usuario?.passwordSalt ||
      !verificarContrasena(contrasena, usuario.passwordSalt, usuario.passwordHash)
    ) {
      return Response.json(
        { ok: false, mensaje: "RUT o contraseña incorrectos." },
        { status: 401 }
      );
    }

    const token = crearTokenSesion(usuario);
    const cookieStore = await cookies();
    cookieStore.set("hairbook_session", token, sessionCookieOptions);

    return Response.json({
      ok: true,
      usuario: {
        id: usuario._id.toString(),
        nombre: usuario.nombre,
        rut: usuario.rut,
        rol: usuario.rol || "cliente",
      },
    });
  } catch (error) {
    console.error("Error iniciando sesión:", error);
    return Response.json(
      { ok: false, mensaje: "No fue posible iniciar sesión." },
      { status: 500 }
    );
  }
}
