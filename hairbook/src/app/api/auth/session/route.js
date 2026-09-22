import { obtenerUsuarioSesion } from "@/lib/session";

export async function GET() {
  const usuario = await obtenerUsuarioSesion();
  return Response.json({ ok: true, usuario });
}
