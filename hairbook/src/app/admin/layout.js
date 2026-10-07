import { redirect } from "next/navigation";
import { obtenerUsuarioAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }) {
  const usuario = await obtenerUsuarioAdmin();

  if (!usuario) {
    redirect("/");
  }

  return children;
}
