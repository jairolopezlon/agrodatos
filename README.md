# 🌱 AgroDatos

AgroDatos es una plataforma web (PWA) Offline-First diseñada para visualizar e interactuar con los datos abiertos de producción agrícola del Valle del Cauca, Colombia.

Dada la intermitencia de conectividad en zonas rurales, la arquitectura de AgroDatos implementa un motor ETL en el Edge que consolida, limpia y comprime millones de registros gubernamentales, permitiendo a la aplicación cliente descargar un único archivo consolidado y operar de manera 100% offline mediante IndexedDB.

## 🏗 Arquitectura del Proyecto

Este proyecto está construido como un **Monorepo** utilizando `pnpm workspaces`, dividido en dos aplicaciones principales y un paquete de tipos compartidos:

### 1. Motor ETL & API (Backend)

- **Tecnologías:** Cloudflare Workers, Hono, Cloudflare D1 (SQLite).
- **Responsabilidad:** Un *Cron Trigger* extrae periódicamente los datos históricos y vigentes desde la API de Socrata (Datos.gov.co), los transforma (Patrón Adapter), ejecuta pruebas de integridad (Data Quality) y almacena una versión JSON ultracomprimida.

### 2. Aplicación Cliente (Frontend)

- **Tecnologías:** React, Vite, Tailwind CSS, Dexie.js (IndexedDB), TanStack Query, Cloudflare Pages.
- **Responsabilidad:** PWA instalable que sincroniza la última versión de los datos solo cuando hay conexión, almacenándolos localmente para alimentar las gráficas (Chart.js) sin latencia ni dependencia de internet.

## 📂 Estructura del Monorepo

```text
agrodatos/
├── packages/
│   └── shared-types/      # Interfaces DTO y esquemas compartidos entre backend y frontend
└── apps/
    ├── frontend/          # Aplicación React PWA
    └── worker-etl/        # Cloudflare Worker con el pipeline ETL y endpoints de Hono
```

## 🚀 Inicio Rápido (Desarrollo)

### Prerrequisitos

- Node.js 24 (recomendado)
- pnpm 10
- Cuenta de Cloudflare (para despliegue y base de datos D1 local con Wrangler)

### Instalación

1. Clona el repositorio:

```bash
git clone https://github.com/jairolopezlon/agrodatos.git
cd agrodatos
```

2. Instala las dependencias en todo el monorepo:

```bash
pnpm install
```

3. Levanta el entorno de desarrollo (Frontend y Worker simultáneamente):

```bash
pnpm dev
```

### Pruebas

```bash
pnpm typecheck
pnpm --filter @agrodatos/worker-etl test
pnpm --filter @agrodatos/worker-etl smoke
```

`smoke` consulta Socrata real y verifica volumen, gzip y `schema_version`; es opcional.

## 🌐 Despliegue

- **Frontend:** https://agrodatos.pages.dev
- **Panel admin:** https://agrodatos.pages.dev/admin
- **Worker ETL / API:** https://agrodatos-worker-etl.jairolop88.workers.dev
- **Health check:** https://agrodatos-worker-etl.jairolop88.workers.dev/api/health

El Worker corre con un Cron Trigger semanal y expone `/api/version`, `/api/data/:versionId` y rutas administrativas protegidas. El frontend se despliega en Cloudflare Pages y funciona offline con Dexie.

Consulta [docs/DEPLOY.md](docs/DEPLOY.md) para variables, secretos, migraciones de D1 y comandos de despliegue.

## 📊 Fuentes de Datos (Open Data)

AgroDatos consume y normaliza información bajo la Ley 1712 de 2014 (Transparencia y Acceso a la Información Pública) proveniente de:

- **UPRA**: Evaluaciones Agropecuarias Municipales (EVA) 2019-2025.
- **MADR**: Serie histórica EVA 2007-2018.
- **Gobernación del Valle del Cauca**: Consolidados de cultivos permanentes y transitorios.

## 🛡 Licencia

Distribuido bajo la Licencia MIT.
