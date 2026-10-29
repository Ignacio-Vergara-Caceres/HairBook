import { actualizarReserva } from "@/lib/gestionarReserva";
export async function PATCH(request, context) { return actualizarReserva(request, context, "profesional"); }
