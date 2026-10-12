# HairBook — notificación de reservas con WhatsApp Cloud API

## Alcance de este cambio

- Cuando se **guarda correctamente** una solicitud de reserva, y la clienta marcó la casilla de autorización, HairBook solicita a Meta el envío de una plantilla genérica **aprobada** al número registrado.
- La reserva permanece en estado `pendiente`: no implica aprobación por la administradora.
- El teléfono se lee en el servidor de `usuarios.telefono`; no se acepta un número arbitrario del navegador.
- El envío requiere la API oficial de WhatsApp Business. Tener instalada la aplicación WhatsApp Business, por sí sola, **no** permite mensajes automáticos desde Next.js.
- La notificación es opcional. El rechazo del permiso nunca impide reservar.
- El fallo de WhatsApp no elimina la reserva. Se guarda en MongoDB un estado de solicitud de envío (aceptado/error/no_configurado/etc.). `aceptado` NO garantiza entrega en el celular.

## 1. Preparar Meta

1. Ingresa a https://developers.facebook.com/ y crea/selecciona una app empresarial con acceso al producto WhatsApp.
2. En WhatsApp / API Setup obtén el `Phone Number ID` y un access token válido con permisos para mensajes (`whatsapp_business_messaging`). Para producción configura un token de usuario de sistema con gestión segura de credenciales; el temporal sirve solo para pruebas.
3. Usa un número de prueba proporcionado por Meta y agrega explícitamente el número del destinatario de prueba cuando tu cuenta aún esté en modo test. Para producción registra y configura el número de la peluquería en la plataforma de WhatsApp Business.
4. En WhatsApp Manager crea una plantilla de categoría **Utility** (transaccional) en español con nombre `hairbook_reserva_recibida` y **sin variables**. Texto sugerido:

   > Hola. Recibimos tu solicitud de reserva en HairBook. La solicitud está pendiente de revisión por nuestra administradora. Te avisaremos cuando sea confirmada. ¡Gracias por preferirnos!

5. Espera su aprobación antes de activar el envío. El código del idioma debe coincidir exactamente con el de la plantilla aprobada (por ejemplo `es` o `es_CL`).

## 2. Configurar variables privadas

En la raíz del proyecto Next.js, agrega en `.env.local` **sin borrar** MONGODB_URI, MONGODB_DB ni SESSION_SECRET:

```env
WHATSAPP_ENVIO_ACTIVO=false
WHATSAPP_GRAPH_API_VERSION=v24.0
WHATSAPP_PHONE_NUMBER_ID=ID_NUMERICO_DEL_TELEFONO_META
WHATSAPP_ACCESS_TOKEN=TOKEN_PRIVADO_META
WHATSAPP_TEMPLATE_NAME=hairbook_reserva_recibida
WHATSAPP_TEMPLATE_LANGUAGE=es
```

- Cambia a `WHATSAPP_ENVIO_ACTIVO=true` **solo** cuando todo esté configurado y la plantilla esté aprobada.
- Sustituye `WHATSAPP_GRAPH_API_VERSION` por una versión válida disponible para tu app si difiere del ejemplo.
- No uses `NEXT_PUBLIC_` en las variables de WhatsApp.
- Nunca subas `.env.local` a GitHub ni compartas el token en capturas.
- Configura las mismas variables privadas en **Vercel → Proyecto → Settings → Environment Variables** para el entorno de despliegue. Después de cambiarlas, genera un despliegue nuevo para que apliquen.

## 3. Prueba de extremo a extremo

1. Crea una clienta NUEVA con un celular chileno real (+56 9 XXXX XXXX). Para cuentas antiguas sin teléfono válido, habrá que actualizar el dato con consentimiento o agregar un editor de perfil más adelante.
2. Inicia sesión como esa clienta y solicita un servicio con fecha/hora disponible.
3. Marca explícitamente la casilla de autorización de WhatsApp.
4. Presiona «Enviar solicitud de reserva» **una vez**.
5. Comprueba que HairBook muestra «Tu hora está en revisión» y que se insertó una reserva `pendiente`.
6. Revisa el campo `whatsapp.estado` de esa reserva. `aceptado` significa que la API aceptó la solicitud. La entrega real requiere un webhook de estados de Meta, no implementado aquí.
7. Para verificar que el consentimiento funciona, prueba otra reserva distinta sin marcar la casilla: el estado será `sin_consentimiento` y no se enviará un WhatsApp.
8. Si falla, revisa los logs del servidor o Vercel y los códigos de error de Meta, sin compartir tokens ni datos personales.

## 4. Restricciones y mejoras siguientes

- Por ahora **solo celulares chilenos**: 9XXXXXXXX, +56 9XXXXXXXX o 569XXXXXXXX. Se valida en el registro nuevo.
- Mensaje **genérico**, sin fecha ni hora. Para personalizarlo, crea una nueva plantilla con variables y actualiza `src/lib/whatsapp.js`.
- Personas registradas anteriormente no reciben notificaciones sin autorizar explícitamente cada solicitud de reserva.
- No hay un módulo de perfil para corregir teléfonos existentes: esa mejora queda pendiente.
- Esta integración hace un intento síncrono al guardar la reserva (timeout 8 segundos). No incluye cola de reintentos ni webhook de entrega, necesarios si se desea trazabilidad fuerte en producción.
- El teléfono se registra sin confirmar que el usuario sea su propietario. Para producción considera una verificación del número por OTP o un mecanismo de verificación equivalente.
- Deben ofrecerse medios para retirar el consentimiento/no recibir mensajes, respetando solicitudes por WhatsApp y otros canales.
- La plantilla no debe afirmar que la hora está confirmada hasta que exista aprobación real en HairBook.

## Archivos modificados

- `src/lib/whatsapp.js` — nuevo cliente servidor de WhatsApp API y validación de teléfonos
- `src/app/api/reservas/route.js` — intento de envío tras guardar y registro del resultado
- `src/app/api/auth/register/route.js` — teléfono chileno obligatorio para cuentas nuevas
- `src/app/page.js` — casilla de autorización y estado en pantalla de confirmación
- `src/app/globals.css` — estilos de la casilla

## Fuentes

- API oficial Meta (colección Postman): https://www.postman.com/meta/whatsapp-business-platform/collection/wlk6lh4/whatsapp-cloud-api
- Política de mensajes: https://business.whatsapp.com/policy/
- Variables de Vercel: https://vercel.com/docs/environment-variables/managing-environment-variables
