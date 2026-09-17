# Hair Book

**Hair Book** es una plataforma web desarrollada como Proyecto Capstone 2026 de la carrera de **Ingeniería en Informática de Duoc UC**.

Su objetivo es digitalizar y centralizar la gestión de una peluquería, facilitando la administración de disponibilidad, reservas, servicios y fichas de clientas, sin perder el carácter personalizado de la atención.

La solución está diseñada para ser utilizada desde computadores y dispositivos móviles mediante un navegador web, sin necesidad de instalar una aplicación.

---

## Problema que aborda

Actualmente, gran parte de la gestión de horas de la peluquería se realiza de manera manual mediante **WhatsApp** y un calendario personal.

Esto obliga a la administradora a revisar constantemente su disponibilidad, responder consultas de horarios, registrar reservas y mantener información de las clientas de manera dispersa.

Además, información importante como tratamientos realizados, fórmulas utilizadas, observaciones técnicas y antecedentes de cada clienta puede quedar distribuida entre conversaciones, notas u otros medios.

**Hair Book** busca centralizar estos procesos en una única plataforma, disminuyendo tareas repetitivas y facilitando la gestión diaria de la peluquería.

La administradora mantiene en todo momento el control final sobre la aprobación y gestión de las reservas.

---

## Objetivo del proyecto

Desarrollar una solución web que permita gestionar de manera centralizada:

- disponibilidad semanal.
- reservas y estados de citas.
- servicios y precios.
- información de clientas.
- fichas técnicas e historial de atenciones.
- comunicación asistida mediante WhatsApp.
- recordatorios de citas.
- horarios disponibles.
- administración general de la agenda.

El proyecto se desarrolla de manera incremental, incorporando progresivamente las funcionalidades definidas durante el levantamiento de requerimientos.

---

# Funcionalidades principales

## Sitio público

La plataforma contempla una sección accesible para las clientas que permitirá:

- visualizar información de la peluquería.
- consultar ubicación, horarios y redes sociales.
- revisar el catálogo de servicios.
- visualizar servicios organizados por categorías.
- consultar descripciones y precios.
- visualizar disponibilidad semanal.
- seleccionar uno o más servicios.
- solicitar una reserva.
- solicitar asesoría personalizada.
- continuar determinadas solicitudes mediante WhatsApp con información prellenada.

---

## Gestión de clientas

El sistema permitirá mantener información centralizada de las clientas.

Entre sus funcionalidades se consideran:

- registro de nombre y apellido.
- registro de RUT.
- registro de número telefónico.
- consulta de próximas citas.
- historial de atenciones.
- ficha técnica interna.
- registro de observaciones.
- registro de tratamientos realizados.
- registro de fórmulas y productos utilizados.

La información técnica será de uso interno y no estará disponible para las clientas.

---

## Panel administrativo

La administradora contará con un panel restringido desde el cual podrá gestionar la operación de la peluquería.

Entre las funcionalidades contempladas se encuentran:

- gestión de disponibilidad.
- creación de bloqueos de agenda.
- gestión de reservas.
- aprobación de solicitudes.
- confirmación de citas.
- reprogramación de citas.
- cancelación de citas.
- gestión de servicios.
- modificación de precios.
- gestión de promociones u ofertas.
- consulta de clientas.
- actualización de fichas técnicas.
- consulta del historial de atenciones.
- registro del estado de abonos.
- gestión de recordatorios.
- generación de información de horarios disponibles para compartir en redes sociales.

---

# Reglas principales del sistema

Hair Book considera las siguientes reglas de negocio:

- La administradora mantiene la decisión final sobre la aceptación de una reserva.
- Una clienta puede seleccionar uno o más servicios dentro de una misma solicitud.
- Las solicitudes de reserva deben quedar pendientes de aprobación.
- La atención debe mantener un canal de comunicación personalizado.
- La administradora puede modificar o reprogramar una reserva.
- La administradora puede bloquear días completos o rangos horarios.
- Las notas técnicas internas no son visibles para las clientas.
- Los precios de los servicios pueden ser modificados por la administradora.
- Determinados servicios pueden requerir evaluación previa antes de confirmar un precio definitivo.
- Los recordatorios de citas se contemplan principalmente mediante WhatsApp.

---

## Estados de una reserva

Las reservas podrán manejar diferentes estados durante su ciclo de vida:

- `pendiente`
- `reservada`
- `confirmada`
- `cancelada`
- `realizada`
- `no_asistencia`

Esto permitirá mantener trazabilidad sobre las solicitudes y citas registradas en el sistema.

---

# Arquitectura

Hair Book utiliza una arquitectura web basada en la separación entre frontend, backend y base de datos.

```text
Clienta / Administradora
          │
          ▼
     Frontend Web
          │
          ▼
      API REST
     Node.js / Express
          │
          ├──────────────► Integración WhatsApp
          │
          ▼
     MongoDB Atlas
```

El frontend se comunica con el backend mediante una API REST.

El backend contiene las reglas de negocio, validaciones y acceso a la información almacenada en MongoDB.

---

# Tecnologías utilizadas

## Frontend

- React
- HTML5
- CSS3
- JavaScript

## Backend

- Node.js
- Express
- API REST

## Base de datos

- MongoDB
- MongoDB Atlas
- Mongoose

## Integraciones

- WhatsApp mediante enlaces con mensajes prellenados.
- Evaluación de WhatsApp Business API para futuras automatizaciones y recordatorios.

## Herramientas de desarrollo

- Git
- GitHub
- Visual Studio Code
- Postman

> Las tecnologías pueden ajustarse durante el desarrollo si el equipo identifica alternativas que respondan de mejor manera a los requerimientos del proyecto.

---

# Estructura del repositorio

El repositorio se encuentra organizado de la siguiente manera:

```text
HairBook/
│
├── Fase-1/
│   │
│   ├── Evidencias-Individuales/
│   │   ├── Venegas_Francisco_1.1_APT122_AutoevaluacionCompetenciasFase1.docx
│   │   ├── Venegas_Francisco_1.2_APT122_DiarioReflexionFase1.docx
│   │   ├── Venegas_Francisco_1.3_APT122_AutoevaluacionFase1.docx
│   │   │
│   │   ├── Vergara_Ignacio_1.1_APT122_AutoevaluacionCompetenciasFase1.pdf
│   │   ├── Vergara_Ignacio_1.2_APT122_DiarioReflexionFase1.docx
│   │   ├── Vergara_Ignacio_1.3_APT122_AutoevaluacionFase1.docx
│   │   │
│   │   ├── Zamora_Benjamin_1.1_APT122_AutoevaluacionCompetenciasFase1.docx
│   │   ├── Zamora_Benjamin_1.2_APT122_DiarioReflexionFase1.docx
│   │   └── Zamora_Benjamin_1.3_APT122_AutoevaluacionFase1.docx
│   │
│   └── Evidencias-Grupales/
│       ├── Presentacion_Idea_Proyecto_HairBook.pptx
│       ├── 1.4_APT122_FormativaFase1.docx
│       └── 1.5_GuiaEstudiante_Fase1_Definicion_Proyecto_APT_Espanol.pdf
│
├── docs/
│   ├── 01-requerimientos/
│   ├── 02-diseno/
│   ├── 03-modelo-datos/
│   ├── 04-flujo/
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
├── .github/
│   └── workflows/
│
├── .env.example
├── .gitignore
└── README.md
```

---

# Organización de la documentación

## `Fase-1/`

Contiene las evidencias académicas correspondientes a la **Fase 1 del Proyecto APT**.

Esta carpeta se encuentra directamente en la raíz del repositorio y se divide en evidencias individuales y grupales.

### `Evidencias-Individuales/`

Contiene los documentos desarrollados individualmente por cada integrante del equipo:

- Autoevaluación de Competencias Fase 1.
- Diario de Reflexión Fase 1.
- Autoevaluación Fase 1.

Los archivos deben seguir la nomenclatura definida para la asignatura.

### `Evidencias-Grupales/`

Contiene los documentos desarrollados como equipo:

- presentación de la idea de proyecto.
- documento Formativa Fase 1.
- Guía de Definición del Proyecto APT.
- versión en inglés de la guía, en caso de desarrollarse de manera optativa.

---

## `docs/`

Contiene la documentación técnica y de gestión asociada al desarrollo de Hair Book.

### `01-requerimientos/`

Documentación relacionada con el levantamiento y análisis de requerimientos.

---

### `02-diseno/`

Documentación correspondiente al diseño de la solución.

---

### `03-modelo-datos/`

Documentación relacionada con el diseño y estructura de la base de datos.

---

### `04-flujo/`

Contiene los flujos principales del sistema.

---

### `05-pruebas/`

Documentación relacionada con la validación de la solución.

---

# Código fuente

## `frontend/`

Contiene la aplicación web utilizada por clientas y administradora.

Desde esta aplicación se realizan las interacciones con los servicios entregados por el backend.

---

## `backend/`

Contiene:

- API REST;
- conexión con MongoDB;
- modelos de datos;
- controladores;
- rutas;
- validaciones;
- reglas de negocio;
- integraciones externas.

---

## `database/`

Contiene recursos relacionados con la configuración inicial y documentación técnica de la base de datos.

---

## `tests/`

Contiene las pruebas automatizadas o recursos utilizados para verificar el correcto funcionamiento del sistema.

---

# Alcance actual

La versión actual de Hair Book contempla como núcleo del proyecto:

---

# Funcionalidades futuras

Las siguientes funcionalidades se consideran posibles extensiones del proyecto y no forman parte del núcleo actual:

- gestión de múltiples profesionales.
- agendas independientes por profesional.
- roles y permisos diferenciados.
- venta de productos.
- control de inventario.
- control de stock.
- despacho de productos.
- módulo financiero avanzado.
- cálculo automatizado de remuneraciones.
- análisis administrativo avanzado.
- reportes financieros.
- estadísticas avanzadas del negocio.

La arquitectura busca permitir que estas funcionalidades puedan incorporarse posteriormente sin necesidad de rediseñar completamente la solución.

---

# Instalación

## 1. Clonar el repositorio

```bash
git clone https://github.com/Ignacio-Vergara-Caceres/HairBook.git
```

Ingresar al proyecto:

```bash
cd HairBook
```

---

## 2. Configurar el backend

Ingresar a la carpeta:

```bash
cd backend
```

Instalar las dependencias:

```bash
npm install
```

Crear el archivo:

```text
.env
```

Utilizando como referencia:

```text
.env.example
```

Luego iniciar el servidor:

```bash
npm run dev
```

---

## 3. Configurar el frontend

Desde la raíz del proyecto:

```bash
cd frontend
```

Instalar las dependencias:

```bash
npm install
```

Iniciar la aplicación:

```bash
npm run dev
```

---

# Variables de entorno

Las credenciales, contraseñas y configuraciones privadas **no deben subirse a GitHub**.

Cada integrante debe mantener su propio archivo `.env` de manera local.

El repositorio utiliza un archivo `.env.example` para indicar qué variables son necesarias.

Ejemplo:

```env
PORT=

MONGODB_URI=

JWT_SECRET=

WHATSAPP_NUMBER=
```

El archivo `.env` debe estar incluido dentro del `.gitignore`.

---

# Base de datos

La base de datos de Hair Book utiliza **MongoDB Atlas**.

Cada integrante autorizado debe contar con acceso al proyecto correspondiente en MongoDB Atlas y utilizar una cadena de conexión válida.

La conexión es realizada desde el backend utilizando **Mongoose**.

Ejemplo conceptual:

```text
Frontend
   │
   ▼
Backend
   │
   ▼
Mongoose
   │
   ▼
MongoDB Atlas
```

Las credenciales de MongoDB nunca deben quedar escritas directamente en el código ni subirse al repositorio.

---

# Flujo general de reservas

De manera simplificada, el proceso de reserva considera:

```text
Clienta revisa disponibilidad
          │
          ▼
Selecciona servicio(s)
          │
          ▼
Envía solicitud
          │
          ▼
Reserva pendiente
          │
          ▼
Administradora revisa solicitud
          │
     ┌────┴────┐
     ▼         ▼
  Aprueba    Rechaza
     │
     ▼
Reserva confirmada
     │
     ▼
Atención
     │
     ▼
Registro en historial
```

La administradora mantiene el control final del proceso de reserva.

---

# Seguridad

El proyecto contempla como principios básicos:

- no almacenar contraseñas directamente en texto plano;
- utilizar variables de entorno para información sensible;
- no subir archivos `.env` al repositorio;
- restringir las funciones administrativas;
- validar información enviada por el frontend;
- mantener separada la información pública de la información interna;
- proteger las fichas técnicas de las clientas;
- controlar el acceso a las funcionalidades administrativas.

---

# Estado del proyecto

**En desarrollo — Proyecto Capstone 2026**

Actualmente el equipo se encuentra trabajando en el diseño, documentación e implementación incremental de la solución.

---

# Equipo

**Proyecto:** Hair Book  
**Asignatura:** Proyecto de Título / Capstone  
**Carrera:** Ingeniería en Informática  
**Institución:** Duoc UC  
**Sección:** 003D  
**Equipo:** Equipo 1  

## Integrantes

- Francisco Venegas
- Ignacio Vergara
- Benjamin Zamora

**Docente guía:** Reginaldo Salinas

---

# Licencia

Proyecto desarrollado con fines académicos como parte del Proyecto Capstone de Ingeniería en Informática de Duoc UC.

El uso, distribución o reutilización del código y material del proyecto queda sujeto a las decisiones del equipo desarrollador.
