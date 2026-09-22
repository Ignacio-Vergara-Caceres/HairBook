import { cookies } from "next/headers";
import { verificarTokenSesion } from "./auth";

export async function obtenerUsuarioSesion() {
  const cookieStore = await cookies();
  const token = cookieStore.get("hairbook_session")?.value;
  return verificarTokenSesion(token);
}
