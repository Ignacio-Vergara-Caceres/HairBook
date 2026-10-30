import { redirect } from "next/navigation";
import { obtenerUsuarioProfesional } from "@/lib/session";
export const dynamic = "force-dynamic";
export default async function ProfesionalLayout({ children }) {
  if (!await obtenerUsuarioProfesional()) redirect("/");
  return children;
}
