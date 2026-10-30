import { listarReservas } from "@/lib/gestionarReserva";
export const dynamic = "force-dynamic";
export async function GET() { return listarReservas("profesional"); }
