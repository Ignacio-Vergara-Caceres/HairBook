import crypto from "crypto";

const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7;

export function normalizarRut(rut = "") {
  return rut.replace(/\./g, "").replace(/\s/g, "").toUpperCase();
}

export function crearHashContrasena(contrasena) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(contrasena, salt, 64).toString("hex");
  return { salt, hash };
}

export function verificarContrasena(contrasena, salt, hashGuardado) {
  try {
    const hash = crypto.scryptSync(contrasena, salt, 64);
    const guardado = Buffer.from(hashGuardado, "hex");
    return guardado.length === hash.length && crypto.timingSafeEqual(hash, guardado);
  } catch {
    return false;
  }
}

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("Falta SESSION_SECRET en .env.local");
  }
  return secret;
}

export function crearTokenSesion(usuario) {
  const payload = {
    id: usuario._id.toString(),
    rut: usuario.rut,
    nombre: usuario.nombre,
    rol: usuario.rol || "cliente",
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };

  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

export function verificarTokenSesion(token) {
  if (!token || !token.includes(".")) return null;

  try {
    const [body, signature] = token.split(".");
    const expected = crypto
      .createHmac("sha256", getSessionSecret())
      .update(body)
      .digest("base64url");

    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch {
    return null;
  }
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_DURATION_SECONDS,
};
