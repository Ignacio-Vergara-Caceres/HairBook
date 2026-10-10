/**
 * Envío de acuses de solicitudes mediante WhatsApp Cloud API (Meta).
 * Este módulo solo se importa desde el servidor. Nunca llevar el token al navegador.
 */

export function normalizarTelefonoWhatsapp(telefono) {
  const digitosOriginales = String(telefono || "").replace(/\D/g, "");
  const digitos = digitosOriginales.startsWith("00")
    ? digitosOriginales.slice(2)
    : digitosOriginales;

  // Móviles chilenos: 9XXXXXXXX, +56 9XXXXXXXX o 569XXXXXXXX.
  if (/^9\d{8}$/.test(digitos)) return `56${digitos}`;
  if (/^569\d{8}$/.test(digitos)) return digitos;
  return null;
}

export async function enviarWhatsappReservaRecibida(telefono) {
  const numero = normalizarTelefonoWhatsapp(telefono);
  if (!numero) return { estado: "sin_telefono_valido" };

  if (process.env.WHATSAPP_ENVIO_ACTIVO !== "true") {
    return { estado: "desactivado" };
  }

  const token = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const plantilla = process.env.WHATSAPP_TEMPLATE_NAME;
  const idioma = process.env.WHATSAPP_TEMPLATE_LANGUAGE;
  const version = process.env.WHATSAPP_GRAPH_API_VERSION;

  if (!token || !phoneNumberId || !plantilla || !idioma || !version) {
    return { estado: "no_configurado" };
  }

  if (!/^v\d+\.\d+$/.test(version) || !/^\d+$/.test(phoneNumberId)) {
    throw new Error("Configuración incorrecta de WhatsApp Graph API");
  }

  // Debe existir en WhatsApp Manager una plantilla aprobada con ese nombre,
  // idioma y SIN variables. El mensaje debe decir que la reserva sigue pendiente.
  const response = await fetch(
    `https://graph.facebook.com/${version}/${phoneNumberId}/messages`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        recipient_type: "individual",
        to: numero,
        type: "template",
        template: {
          name: plantilla,
          language: { code: idioma },
        },
      }),
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    }
  );

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    // No guardar ni imprimir tokens o números personales en los logs.
    throw new Error(`WhatsApp API HTTP ${response.status}; código ${data?.error?.code ?? "sin_codigo"}`);
  }

  const mensajeId = data?.messages?.[0]?.id;
  if (!mensajeId) throw new Error("WhatsApp no entregó identificador del mensaje");
  // 'aceptado' NO significa entregado: la confirmación de entrega requiere webhook.
  return { estado: "aceptado", mensajeId };
}
