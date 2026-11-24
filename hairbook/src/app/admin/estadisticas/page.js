
import { redirect } from "next/navigation";
import { obtenerUsuarioAdmin } from "@/lib/session";
import EstadisticasCliente from "./EstadisticasCliente";

export const dynamic = "force-dynamic";

export default async function EstadisticasPage() {
  const admin = await obtenerUsuarioAdmin();

  if (!admin) {
    redirect("/");
  }

  return <EstadisticasCliente />;
}
