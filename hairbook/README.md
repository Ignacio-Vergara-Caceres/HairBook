# HairBook

Prototipo web del Proyecto Capstone 2026 de Ingeniería en Informática en Duoc UC.

HairBook centraliza la gestión de una peluquería y permite que una clienta cree su cuenta, inicie sesión, revise servicios y envíe una solicitud de reserva. La solicitud queda pendiente para que la administradora confirme disponibilidad y defina el valor final.

## Flujo implementado

1. Inicio / landing de HairBook.
2. Catálogo de servicios.
3. Registro de clienta con RUT y contraseña.
4. Inicio y cierre de sesión.
5. Selección de un servicio.
6. Selección de fecha y hora preferente.
7. Envío de solicitud de reserva.
8. Reserva guardada en MongoDB con estado `pendiente`.
9. Vista de "Mis reservas" para la clienta.

No se realiza un pago real en esta etapa. El valor mostrado es referencial y queda preparado para que el valor definitivo se gestione posteriormente.

## Tecnologías

- Next.js 16
- React 19
- MongoDB Atlas
- Tailwind CSS 4
- Route Handlers de Next.js
- Sesión mediante cookie HTTP-only firmada
- Contraseñas almacenadas con `scrypt` y salt

## Colecciones utilizadas

- `clientes`
- `servicios`
- `reservas`
- `negocios` (prototipo anterior)
- `profesionales` (prototipo anterior)

La primera consulta al catálogo crea automáticamente servicios de demostración si la colección `servicios` está vacía.

## Variables de entorno

El archivo `.env.local` requiere:

```env
MONGODB_URI=tu_cadena_de_conexion
SESSION_SECRET=un_secreto_largo_y_aleatorio
```

El ZIP preparado conserva el `.env.local` del prototipo y agrega `SESSION_SECRET` si no existía. No subas este archivo a un repositorio público.

## Levantar el proyecto

Desde la carpeta `peluqueria-prototipo`:

```bash
npm install
npm run dev
```

Luego abre:

```text
http://localhost:3000
```

Si copias el proyecto a otro computador, no es necesario copiar `node_modules` ni `.next`: ejecuta `npm install` nuevamente.

## Nota del prototipo

Los horarios mostrados son opciones de preferencia y todavía no validan una agenda real de disponibilidad. La siguiente evolución natural es conectar las reservas con la disponibilidad de la administradora y crear el módulo donde ella pueda aprobar, rechazar o modificar una solicitud.
