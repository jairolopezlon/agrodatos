# 🌱 AgroDatos

AgroDatos es una plataforma web (PWA) Offline-First para visualizar y explorar los datos abiertos de producción agrícola del **Valle del Cauca, Colombia**.

El proyecto implementa un motor ETL en el Edge que extrae, valida, normaliza y comprime los datos de Socrata, los almacena versionados en Cloudflare D1 y los expone a una PWA que funciona sin conexión mediante IndexedDB.

## 🌐 Producción

| Recurso | URL |
|---|---|
| Frontend | https://agrodatos.pages.dev |
| Panel admin | https://agrodatos.pages.dev/admin |
| Worker ETL / API | https://agrodatos-worker-etl.jairolop88.workers.dev |
| Health check | https://agrodatos-worker-etl.jairolop88.workers.dev/api/health |

## ✅ Estado

Backlog **T00–T19** implementado:

- Contratos compartidos, esquema D1, Worker Hono, extracción Socrata.
- Transformación, normalización de cultivos, Data Quality y cobertura.
- Versionado con hash SHA-256 y gzip.
- API pública, cron, trigger admin y aprobación manual de versiones.
- PWA offline, Dexie, TanStack Query, Chart.js y vista admin.
- Pruebas unitarias, smoke contra Socrata, cobertura y CI/CD.

## 🏗 Arquitectura

```text
Socrata (2 datasets)
        │
        ▼
Cloudflare Worker ETL
  extracción → validación → cobertura → normalización
  → hash/gzip → versión PENDING
        │
        ▼
Cloudflare D1 (etl_logs + data_versions)
        │
        ▼
API Hono
  /api/version · /api/data/:versionId · /api/admin/*
        │
        ▼
PWA React + Dexie + TanStack Query + Chart.js
```

Documentación detallada y diagramas Mermaid: [docs/ARQUITECTURA.md](docs/ARQUITECTURA.md).

## 🧰 Stack

| Capa | Tecnología |
|---|---|
| Backend | Cloudflare Workers, Hono, TypeScript |
| Base de datos | Cloudflare D1 (SQLite) |
| Frontend | React 19, Vite, TypeScript |
| Estado offline | Dexie.js (IndexedDB), TanStack Query |
| Gráficas | Chart.js + react-chartjs-2 |
| PWA | vite-plugin-pwa, Workbox |
| Pruebas | `node:test` con `--experimental-strip-types` |
| Monorepo | pnpm workspaces |
| Despliegue | Cloudflare Workers, Pages y GitHub Actions |

## 📂 Estructura

```text
agrodatos/
├── packages/
│   └── shared-types/      # Contratos DTO compartidos
├── apps/
│   ├── frontend/          # React PWA + panel admin
│   └── worker-etl/        # Worker ETL + API Hono
├── docs/
│   ├── ARQUITECTURA.md    # Stack, flujos y diagramas Mermaid
│   └── DEPLOY.md          # Despliegue, secretos y migraciones
└── .github/workflows/     # CI, deploy y cobertura manual
```

## 📊 Fuentes de datos

Se consumen **2 datasets** de Socrata y se filtra únicamente **Valle del Cauca (código 76)**.

| Fuente | Dataset | Nacional | Valle | Años |
|---|---|---:|---:|---|
| Histórica EVA | `2pnw-mmge` | 206.068 | 15.774 | 2006–2018 |
| Vigente EVA 2019–2025 | `uejq-wxrr` | 166.732 | 10.589 | 2019–2025 |
| **Total** | | **372.800** | **26.363** | |

Validaciones realizadas con `DISTINCT`:

- Todo nombre tipo Valle usa el código `76`; no hay `076` ni variantes de nombre.
- Los 42 municipios son los mismos en ambas fuentes y suman exactamente el total departamental.
- No hay municipios nulos o vacíos.
- Los años cubren 2006–2025 sin solapamiento entre fuentes.

### 2006 es un año parcial

2006 se incluye con una aclaración visible en la app:

- 374 registros.
- 42 municipios.
- 24 cultivos (frente a 65–79 de los demás años).
- Solo periodo `2006B`.

### Normalización de cultivos

Los nombres de cultivos vienen con mayúsculas/minúsculas y con/sin tildes. El ETL:

- Genera una **clave canónica**: mayúsculas, espacios normalizados, sin tildes y preservando la **Ñ**.
- Genera una **etiqueta visible**: mayúsculas y con tildes cuando alguna variante las tenga.
- Unifica variantes: `CAFE` / `Café` → clave `CAFE`, etiqueta `CAFÉ`.

Resultado: se pasa de **172 etiquetas crudas a 107 cultivos canónicos**.

## 🔄 Pipeline ETL

1. Crear `etl_logs` en `RUNNING`.
2. Extraer histórica y vigente con paginación `$limit=10000`, `$offset`, `$order=:id`, reintentos y timeout.
3. Validar cobertura: 42 municipios, años 2006–2025, mínimo de registros y cultivos por año.
4. Validar filas: rangos, negativos, áreas, municipios, nombres y outliers.
5. Transformar a diccionarios y tuplas posicionales.
6. Normalizar cultivos.
7. Construir hash SHA-256 y payload gzip.
8. Comparar con la versión activa:
   - Si el hash es igual, no hay cambios.
   - Si cambió, calcular diff y crear una versión **PENDING**.
9. Mantener la versión activa anterior hasta que un admin apruebe.
10. Guardar el reporte de validación y cobertura en `etl_logs.validation_report`.

### Resultado esperado con 2006

| Métrica | Valor |
|---|---:|
| Extraídos | 26.363 |
| Aceptados | 25.909 |
| Rechazados | 454 |
| Municipios | 42 |
| Cultivos canónicos | 107 |
| Periodos | 57 |
| Gzip | 190.836 bytes |
| Registros con clave repetida | 1.640 |
| Versión | `2026.11.09-4fde9c028aae` |

Los 454 rechazos corresponden a `areaCosechada > areaSembrada`. La tasa de rechazo es 1,72 %, por debajo del 5 %.

## ✅ Aprobación manual de versiones

El ETL **no activa automáticamente** los cambios.

1. Si hay cambios, crea una versión `PENDING` con un diff.
2. La versión activa sigue sirviendo a la PWA.
3. En `/admin` se revisa:
   - Registros agregados, eliminados, modificados y sin cambios.
   - Municipios, cultivos y periodos nuevos/eliminados.
   - Cultivos normalizados.
   - Muestra de cambios de campos.
4. El admin pulsa **Aplicar** u **Omitir**.
5. Solo una versión `PENDING` existe a la vez; una nueva ejecución reemplaza la anterior.
6. Si un hash fue omitido, no se vuelve a proponer; se puede forzar con `?force=true`.

La fuente tiene 1.640 registros con la misma combinación municipio/cultivo/periodo. El diff los empareja por valores y las gráficas los agregan; no se pierden.

Estados de versión: `PENDING`, `ACTIVE`, `DISCARDED`, `SUPERSEDED`.

## 🔌 API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/version` | Metadata de la versión activa |
| GET | `/api/data/:versionId` | Payload gzip inmutable |
| HEAD | `/api/data/:versionId` | Headers del payload |
| POST | `/api/admin/trigger` | Dispara ETL; `?force=true` |
| GET | `/api/admin/etl/:id` | Estado de una ejecución |
| GET | `/api/admin/etl` | Últimos logs |
| GET | `/api/admin/pending` | Versiones pendientes con diff |
| POST | `/api/admin/pending/:versionId/apply` | Aplica una versión |
| POST | `/api/admin/pending/:versionId/omit` | Omite una versión |
| GET | `/api/admin/versions` | Historial de versiones |

Las rutas admin requieren `Authorization: Bearer <ADMIN_API_KEY>`.

## 🖥 Frontend

- PWA instalable con manifest e iconos.
- Descarga la versión activa y la guarda en Dexie.
- React Query para lectura asíncrona de IndexedDB.
- Descarga el payload solo si cambió el hash o `schema_version`.
- Conserva la versión activa y la anterior; poda las demás.
- Filtros por municipio, cultivo, año y periodo.
- Gráficas responsivas agregadas por periodo y top 10 de cultivos.
- Aviso de año parcial 2006.
- Funcionamiento offline con fallback a caché.
- Panel `/admin` con trigger, diff, aplicar/omitir e historial.

Estrategias PWA:

- `NetworkFirst` para `/api/version`.
- `CacheFirst` para `/api/data/*`.
- Precache del app shell y fallback offline.
- Sin caché para `/api/admin/*`.

## 🚀 Desarrollo

### Prerrequisitos

- Node.js 24
- pnpm 10
- Cuenta de Cloudflare para despliegue

### Instalación

```bash
git clone https://github.com/jairolopezlon/agrodatos.git
cd agrodatos
pnpm install
```

### Comandos

```bash
pnpm dev                                   # Worker + frontend
pnpm typecheck                             # TypeScript en todo el monorepo
pnpm --filter @agrodatos/worker-etl test   # 41 pruebas unitarias
pnpm --filter @agrodatos/worker-etl smoke  # Smoke real contra Socrata
pnpm --filter @agrodatos/worker-etl coverage
pnpm --filter @agrodatos/worker-etl coverage:strict
pnpm --filter @agrodatos/worker-etl coverage:update
pnpm build                                 # Build de Worker y frontend
```

`smoke` consulta Socrata real y verifica volumen, gzip, schema y cobertura. Es opcional.

## 🧪 Pruebas y cobertura

- Unitarias: normalización, adaptadores, paginación/reintentos, transformación, validación, cobertura, diff, hash/gzip y versión.
- Integración local con Wrangler y D1 para repositorio, API, trigger y aprobación.
- Smoke real: 26.363 registros, 25.909 aceptados, gzip 190.836 bytes.
- Cobertura híbrida:
  - Estructural por defecto.
  - `--strict` contra `coverage.snapshot.json`.
  - Workflow manual `Coverage` con input `strict`.

## 🚢 Despliegue

- Frontend en Cloudflare Pages.
- Worker en Cloudflare Workers con D1 remoto.
- Cron semanal `0 3 * * 1` (domingo 03:00 UTC; Cloudflare usa 1 = domingo).
- Secretos: `ADMIN_API_KEY` obligatorio; `SOCRATA_APP_TOKEN` opcional.
- CI en GitHub Actions: install, typecheck, tests y build.
- Deploy automático condicionado a `DEPLOY_ENABLED=true` y a los secrets de Cloudflare.

Instrucciones completas, migraciones y comandos: [docs/DEPLOY.md](docs/DEPLOY.md).

## 🛡 Seguridad

- `ADMIN_API_KEY` se mantiene solo en memoria en el panel admin; nunca en `localStorage`.
- El trigger y las rutas admin usan Bearer y comparación constante sobre SHA-256.
- Para producción se recomienda Cloudflare Access sobre `/admin` y `/api/admin/*`.
- El payload público es de solo lectura y las URLs de datos son inmutables.

## 📚 Documentación

- [Arquitectura y diagramas](docs/ARQUITECTURA.md)
- [Despliegue y operación](docs/DEPLOY.md)
- [Backlog y decisiones](BACKLOG.md)

## 🛡 Licencia

Distribuido bajo la Licencia MIT.
