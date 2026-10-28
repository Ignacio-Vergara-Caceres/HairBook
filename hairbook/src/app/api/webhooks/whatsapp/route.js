import crypto from "node:crypto";
import clientPromise from "@/lib/mongodb";
import { registrarMensajeEntrante, registrarEstadoEntrega } from "@/lib/whatsappInbox";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Meta valida el endpoint antes de enviar eventos. */
export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const token = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  if (token && params.get("hub.mode") === "subscribe" &&
      params.get("hub.verify_token") === token && params.has("hub.challenge")) {
    return new Response(params.get("hub.challenge"), { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("No autorizado", { status: 403 });
}

export async function POST(request) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return new Response("Webhook no configurado", { status: 503 });
  const raw = await request.text();
  if (Buffer.byteLength(raw, "utf8") > 3 * 1024 * 1024) return new Response("Payload demasiado grande", { status: 413 });
  const firma = request.headers.get("x-hub-signature-256") || "";
  const esperada = "sha256=" + crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const a = Buffer.from(firma);
  const b = Buffer.from(esperada);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return new Response("Firma inválida", { status: 401 });
  }

  let evento;
  try { evento = JSON.parse(raw); } catch { return new Response("JSON inválido", { status: 400 }); }
  if (evento.object !== "whatsapp_business_account") return Response.json({ ok: true });

  try {
    const db = (await clientPromise).db(process.env.MONGODB_DB || "capstone_peluqueria");
    for (const entry of evento.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== "messages") continue;
        const value = change.value || {};
        // Nunca mezclar eventos de otro Phone Number ID en este buzón.
        if (String(value.metadata?.phone_number_id) !== process.env.WHATSAPP_PHONE_NUMBER_ID) continue;
        for (const item of value.messages || []) {
          const contacto = (value.contacts || []).find((c) => c.wa_id === item.from);
          const tipos = {
            text: item.text?.body,
            button: item.button?.text,
            interactive: item.interactive?.button_reply?.title || item.interactive?.list_reply?.title,
            image: "[Imagen recibida]", audio: "[Audio recibido]", video: "[Video recibido]",
            document: "[Documento recibido]", location: "[Ubicación recibida]",
            reaction: "[Reacción recibida]",
          };
          const timestamp = Number(item.timestamp);
          await registrarMensajeEntrante(db, {
            id: item.id, telefono: item.from, nombre: contacto?.profile?.name,
            tipo: item.type, texto: tipos[item.type] || `[${item.type || "mensaje"}]`,
            fecha: Number.isFinite(timestamp) && timestamp > 0 ? new Date(timestamp * 1000) : new Date(),
          });
        }
        for (const status of value.statuses || []) {
          await registrarEstadoEntrega(db, status.id, status.status);
        }
      }
    }
    return Response.json({ ok: true });
  } catch (error) {
    // Meta reintentará; cada mensaje entrante usa _id único para evitar duplicados.
    console.error("Error procesando webhook de WhatsApp:", error);
    return Response.json({ ok: false }, { status: 500 });
  }
}
