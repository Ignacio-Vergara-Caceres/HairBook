import { cookies } from "next/headers";
import clientPromise from "@/lib/mongodb";
import {
  crearHashContrasena,
  crearTokenSesion,
  normalizarRut,
  sessionCookieOptions,
} from "@/lib/auth";

export async function POST(request) {
  try {
    const body = await request.json();
    const nombre = body.nombre?.trim();
    const rut = normalizarRut(body.rut);
    const telefono = body.telefono?.trim() || "";
    const correo = body.correo?.trim().toLowerCase() || "";
    const contrasena = body.contrasena || "";

    if (!nombre || !rut || !contrasena) {
      return Response.json(
        { ok: false, mensaje: "Nombre, RUT y contraseña son obligatorios." },
        { status: 400 }
      );
    }

    if (contrasena.length < 6) {
      return Response.json(
        { ok: false, mensaje: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db("capstone_peluqueria");
    const clientes = db.collection("clientes");

    const existente = await clientes.findOne({ rut });
    if (existente) {
      return Response.json(
        { ok: false, mensaje: "Ya existe una cuenta asociada a ese RUT." },
        { status: 409 }
      );
    }

    const { salt, hash } = crearHashContrasena(contrasena);
    const documento = {
      nombre,
      rut,
      telefono,
      correo,
      rol: "cliente",
      passwordSalt: salt,
      passwordHash: hash,
      activo: true,
      fechaCreacion: new Date(),
    };

    const resultado = await clientes.insertOne(documento);
    const usuario = { ...documento, _id: resultado.insertedId };
    const token = crearTokenSesion(usuario);

    const cookieStore = await cookies();
    cookieStore.set("hairbook_session", token, sessionCookieOptions);

    return Response.json(
      {
        ok: true,
        usuario: {
          id: resultado.insertedId.toString(),
          nombre,
          rut,
          rol: "cliente",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error registrando cliente:", error);
    return Response.json(
      { ok: false, mensaje: "No fue posible crear la cuenta." },
      { status: 500 }
    );
  }
}
