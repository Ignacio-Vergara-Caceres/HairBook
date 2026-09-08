# Hair Book

**Hair Book** es una plataforma web desarrollada como Proyecto Capstone 2026 de Ingeniería en Informática en DuocUC.

Su objetivo es digitalizar y centralizar la gestión de una peluquería, facilitando la administración de disponibilidad, reservas, servicios y fichas de clientas, sin perder el carácter personalizado de la atención.

La solución está pensada para ser utilizada desde celular o computador mediante navegador web, sin necesidad de instalar una aplicación.

---

## Problema que aborda

Actualmente, gran parte de la gestión de horas se realiza de forma manual mediante WhatsApp y un calendario personal.

Esto obliga a revisar constantemente la disponibilidad, responder horarios, registrar reservas y mantener información de clientas de forma dispersa.

Hair Book busca reducir estas tareas repetitivas mediante una plataforma centralizada, manteniendo a la administradora como responsable final de aprobar y gestionar las reservas.

---

## Objetivo del proyecto

Desarrollar una solución web que permita gestionar de manera centralizada:

- disponibilidad semanal;
- reservas y estados de citas;
- servicios y precios;
- fichas e historial de clientas;
- comunicación asistida mediante WhatsApp;
- recordatorios de citas;
- generación de horarios disponibles para compartir en redes sociales.

El proyecto se desarrolla de forma incremental por iteraciones, pero contempla completar los requisitos principales definidos para la versión actual.

---

## Funcionalidades principales

### Sitio público

- Página de inicio con identidad visual de la peluquería.
- Información de ubicación, horarios y redes sociales.
- Catálogo de servicios por categorías.
- Descripción, precio e imagen referencial de servicios.
- Agenda semanal con disponibilidad visible.
- Selección de uno o más servicios.
- Botón de asesoría personalizada.
- Continuación del proceso mediante WhatsApp con información prellenada.

### Gestión de clientas

- Registro simple con nombre, apellido, RUT y teléfono.
- Consulta de próximas citas.
- Historial simplificado de atenciones.
- Ficha interna con información técnica privada.
- Registro de observaciones, tratamientos y fórmulas utilizadas.

### Panel administrativo

- Gestión de disponibilidad y bloqueos.
- Gestión de reservas.
- Aprobación, confirmación, reprogramación y cancelación de citas.
- Administración de servicios, precios y ofertas.
- Gestión de fichas de clientas.
- Registro del estado de abonos.
- Generación de una pieza visual con horas disponibles para redes sociales.
- Gestión de recordatorios de citas.

---

## Reglas principales del sistema

- La administradora mantiene la decisión final sobre la aceptación de una reserva.
- Una clienta puede seleccionar varios servicios en una misma solicitud.
- La atención debe mantener un canal personalizado de comunicación.
- Las solicitudes pueden quedar pendientes de aprobación.
- Las reservas manejarán estados como:
  - pendiente;
  - reservada;
  - confirmada;
  - cancelada;
  - realizada;
  - no asistencia.
- Las notas técnicas internas no son visibles para las clientas.
- La administradora puede bloquear días, semanas o rangos horarios.
- Los recordatorios se contemplan principalmente mediante WhatsApp.

---

## Arquitectura propuesta

Hair Book se organiza mediante una arquitectura web por capas:

```text
Clienta
   │
   ▼
Frontend Web
   │
   ▼
API / Backend
   │
   ├──────────────► Integración WhatsApp
   │
   ▼
Base de Datos
```

La administradora accede a un panel restringido que utiliza la misma API para gestionar agenda, reservas, clientas y servicios.

---

## Tecnologías propuestas

### Frontend

- React
- HTML5
- CSS3
- JavaScript

### Backend

- Node.js
- Express
- API REST

### Base de datos

- PostgreSQL

### Integraciones

- WhatsApp mediante enlaces con mensajes prellenados.
- Evaluación de WhatsApp Business API para automatización de recordatorios.

### Herramientas de trabajo

- Git
- GitHub

> Las tecnologías pueden ajustarse durante el desarrollo si el equipo identifica una alternativa que responda mejor a los requisitos del proyecto.

---

## Estructura del repositorio

```text
hair-book/
│
├── README.md
├── .gitignore
├── .env.example
│
├── docs/
│   ├── 01-requerimientos/
│   ├── 02-diseno/
│   ├── 03-modelo-datos/
│   ├── 04-planificacion/
│   └── 05-pruebas/
│
├── frontend/
│
├── backend/
│
├── database/
│
├── tests/
│
└── .github/
    └── workflows/
```

### `docs/`

Contiene la documentación y evidencias del Proyecto Capstone.

Ejemplos:

- entrevista de levantamiento de requerimientos;
- requerimientos funcionales y no funcionales;
- historias de usuario;
- documento de diseño de la solución;
- diagramas;
- modelo de datos;
- backlog;
- carta Gantt;
- fichas de avance semanal;
- casos y resultados de pruebas.

### `frontend/`

Aplicación web utilizada por clientas y administradora.

### `backend/`

API, reglas de negocio, validaciones e integraciones externas.

### `database/`

Migraciones, scripts y datos iniciales de la base de datos.

### `tests/`

Pruebas de frontend, backend y pruebas de flujo completo.

---

## Alcance actual

La versión actual contempla como núcleo del proyecto:

- catálogo de servicios;
- agenda y disponibilidad;
- reservas;
- registro de clientas;
- fichas e historial;
- panel administrativo;
- administración de servicios y precios;
- integración asistida con WhatsApp;
- recordatorios;
- generación visual de horarios disponibles.

---

## Evolución posterior

Las siguientes funcionalidades se consideran una posible evolución de Hair Book y no forman parte del núcleo actual:

- gestión completa de múltiples empleados o profesionales;
- agendas independientes por profesional;
- permisos diferenciados por empleado;
- venta de productos;
- control de stock;
- despacho;
- módulo financiero avanzado;
- cálculo de sueldo, reinversión y análisis administrativo extendido.

---

## Instalación

La configuración de ejecución se documentará a medida que se implemente el proyecto.

La estructura esperada será:

```bash
git clone <https://github.com/Ignacio-Vergara-Caceres/HairBook.git>
cd hair-book
```

Para el frontend:

```bash
cd frontend
npm install
npm run dev
```

Para el backend:

```bash
cd backend
npm install
npm run dev
```

---

## Variables de entorno

Las credenciales y configuraciones privadas no deben subirse al repositorio.

Se utilizará un archivo `.env` local y un archivo `.env.example` con los nombres de las variables necesarias.

Ejemplo:

```env
PORT=
DATABASE_URL=
JWT_SECRET=
WHATSAPP_NUMBER=
```

---

## Estado del proyecto

**En desarrollo — Capstone 2026**

Actualmente el equipo se encuentra trabajando en la definición, diseño e implementación incremental de la solución.

---

## Equipo

**Proyecto:** Hair Book  
**Asignatura:** Proyecto de Título / Capstone  
**Carrera:** Ingeniería en Informática  
**Sección:** 003D  
**Equipo:** Equipo 1  

### Integrantes

- Francisco Venegas
- Ignacio Vergara
- Benjamin Zamora

**Docente guía:** Reginaldo Salinas

---

## Licencia

Proyecto desarrollado con fines académicos.

El uso, distribución o reutilización del código y material del proyecto queda sujeto a las decisiones del equipo desarrollador.