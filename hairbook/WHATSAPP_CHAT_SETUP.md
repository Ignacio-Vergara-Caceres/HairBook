# HairBook — chat WhatsApp integrado al panel de administración

## Qué se agregó

- **`/admin/whatsapp`**: bandeja de conversaciones protegida por el rol `admin`, con actualización periódica, búsqueda, historial de mensajes y reservas relacionadas.
- **`GET/POST /api/webhooks/whatsapp`**: verificación inicial de Meta y recepción de mensajes y estados de entrega usando firma **HMAC-SHA256** con el App Secret.
- **`/api/admin/whatsapp/conversaciones`** y subrutas: consultas y respuestas de la administradora, con verificación de sesión y de ventana de atención.
- **`PATCH /api/admin/reservas/[id]`**: confirmar, rechazar y reprogramar fecha/hora. Tras guardar intenta informar el cambio solo cuando exista consentimiento y una ventana de conversación válida.
- Nuevas colecciones MongoDB: **`whatsapp_conversaciones`** y **`whatsapp_mensajes`**. La creación ocurre automáticamente al recibir mensajes o asociar nuevas solicitudes autorizadas, sin migraciones destructivas.
- Se mantiene el template existente de recepción de solicitud, configurado en `WHATSAPP_TEMPLATE_NAME` (en este proyecto, `datos_servicio`).

## Configurar en Meta y Vercel

1. Confirma que sigan operativas las variables **privadas** anteriores: `MONGODB_URI`, `MONGODB_DB`, `SESSION_SECRET`, `WHATSAPP_ENVIO_ACTIVO=true`, `WHATSAPP_GRAPH_API_VERSION`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_TEMPLATE_NAME=datos_servicio`, `WHATSAPP_TEMPLATE_LANGUAGE=es` (o el idioma exacto aprobado).
2. Define dos variables **adicionales**, tanto en `.env.local` como en el ambiente correcto de Vercel:

   ```env
   WHATSAPP_WEBHOOK_VERIFY_TOKEN=elige_una_cadena_larga_aleatoria_distinta_del_access_token
   WHATSAPP_APP_SECRET=el_app_secret_de_Meta_App_Settings_Basic
   ```

   **No** uses `NEXT_PUBLIC_` ni subas estos secretos a GitHub. El App Secret **no** es el access token ni el Verify Token.
3. Despliega la rama de pruebas a una URL HTTPS accesible desde Meta. En **Meta Developers → tu app → WhatsApp → Configuration / Webhooks**, configura la callback URL `https://TU-DOMINIO/api/webhooks/whatsapp` y el mismo Verify Token. Activa la suscripción al campo **`messages`**. En algunos paneles debes suscribir también la cuenta de WhatsApp Business (WABA) a la app.
4. Prueba enviando desde un celular cliente un WhatsApp al **número de Cloud API**, no a un número de aplicación WhatsApp normal sin conectar a Cloud API. Al escribir, debe aparecer la conversación en la bandeja admin y se habilita la respuesta durante las siguientes **24 horas desde el último mensaje entrante**.
5. Para probar aceptación, rechazo y reprogramación, inicia sesión como admin, abre `/admin/whatsapp`, elige una conversación con una reserva **futura** y usa los botones de la ficha de reserva. Comprueba que cambia el estado/horario en MongoDB y en `/admin/reservas`. Verifica separadamente si se envió y entregó una notificación.

## Limitaciones deliberadas (importantes)

- **La ventana de 24 horas es obligatoria.** Fuera de ella, solo puede enviarse una *plantilla de WhatsApp aprobada*, no texto libre. Las notificaciones de confirmación/rechazo/reprogramación no se envían fuera de ventana: la reserva se actualiza y la UI avisa claramente. Para habilitar avisos fuera de ventana, crear/aprobar nuevas plantillas en Meta y programar esos envíos; `datos_servicio` no reemplaza las plantillas de cambio de estado.
- El texto guardado para plantillas indica **nombre de plantilla y datos del agendamiento**, no simula el mensaje literal recibido por el cliente.
- **Historial anterior a activar webhooks no se recupera** automáticamente desde WhatsApp. Las conversaciones nuevas se registran desde ese momento. Las reservas antiguas que no registraron un número normalizado podrían no vincularse al chat; no se fuerza una coincidencia de identidad a partir de números sin verificar.
- Esta versión maneja textos y muestra un marcador para medios recibidos; **no descarga ni envía adjuntos**. Tampoco usa WebSockets: consulta mensajes cada 9 s y lista cada 12 s.
- **La disponibilidad se valida en servidor**, pero el proyecto heredado no impone aún un índice único transaccional contra dos solicitudes simultáneas por la misma hora. Antes de operación a gran escala, auditar duplicados y crear una estrategia de bloqueo o índice único parcial compatible con los documentos existentes. No se crea un índice sin validar la colección en producción.
- WhatsApp aceptó un mensaje ≠ mensaje entregado. Meta informa `sent`, `delivered`, `read` o `failed` en el webhook. Ante falla en la persistencia posterior al envío, revisar el chat y los logs antes de reintentar para no duplicar mensajes.
- El registro de usuarios vigente no comprueba propiedad del número por SMS/OTP. No presentar la coincidencia telefónica como verificación de identidad. Deben revisarse consentimiento, política de privacidad, retención de mensajes y mecanismos para dejar de recibir WhatsApps antes de uso productivo.

## Índices opcionales para crecer

Ejecutar solo tras revisar la base de datos; no se aplican automáticamente:

```javascript
db.whatsapp_mensajes.createIndex({ telefono: 1, fecha: -1 });
db.whatsapp_mensajes.createIndex({ metaId: 1 });
db.whatsapp_conversaciones.createIndex({ ultimoMensajeEn: -1 });
```

El identificador `_id` de los mensajes entrantes usa `meta:<id>`, por lo que sus reintentos no insertan duplicados.

## Archivos principales del cambio

- `src/lib/whatsapp.js`, `src/lib/whatsappInbox.js`, `src/lib/horarios.js`
- `src/app/api/webhooks/whatsapp/route.js`
- `src/app/api/admin/whatsapp/conversaciones/route.js`
- `src/app/api/admin/whatsapp/conversaciones/[telefono]/route.js`
- `src/app/api/admin/whatsapp/conversaciones/[telefono]/mensajes/route.js`
- `src/app/api/admin/reservas/[id]/route.js`, `src/app/api/admin/reservas/route.js`
- `src/app/api/reservas/route.js`, `src/app/api/disponibilidad/route.js`
- `src/app/admin/whatsapp/{page.js,ChatAdmin.js,whatsapp.module.css}`
- `src/app/admin/page.js`, `src/app/admin/reservas/page.js`

## Pruebas

- `node --test tests/*.test.mjs` — comprueba normalización de números, plantilla, ventana de 24 horas y deduplicación de mensajes.
- `npm ci && npm run lint && npm run build` — ejecutar en un entorno con acceso a las dependencias antes del despliegue. Sin variables de Mongo configuradas, el build puede fallar porque el código original inicializa el cliente de Mongo al importar.

**Advertencia:** crear un webhook sin registrar su callback y la suscripción a `messages` en Meta no hace llegar los mensajes por arte de magia. Este ZIP incluye el código listo para configurar, pero no modifica tu cuenta Meta ni tus variables Vercel.
