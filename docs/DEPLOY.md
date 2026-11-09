# Despliegue de AgroDatos

## URLs de producción

| Recurso | URL |
|---|---|
| Frontend (Cloudflare Pages) | https://agrodatos.pages.dev |
| Panel admin | https://agrodatos.pages.dev/admin |
| Worker ETL / API | https://agrodatos-worker-etl.jairolop88.workers.dev |
| Health check | https://agrodatos-worker-etl.jairolop88.workers.dev/api/health |

## Recursos actuales

- Cuenta Cloudflare: `5ccd3e3c51906229945c32bdf1260d9e`
- Base D1: `agrodatos` (`e348edb1-e8b0-486d-9f7f-c2f1dec7529d`, región ENAM)
- Worker: `agrodatos-worker-etl`
- Pages: `agrodatos`
- Cron: `0 3 * * 1` (03:00 UTC del domingo; Cloudflare usa 1 = domingo)

## Prerrequisitos

- Node.js 24
- pnpm 10
- Wrangler autenticado (`wrangler login`)
- Permisos de Workers, Pages y D1 en la cuenta

## Base de datos D1

Crear la base (solo la primera vez):

```bash
pnpm --filter @agrodatos/worker-etl exec wrangler d1 create agrodatos
```

Copiar el `database_id` resultante en `apps/worker-etl/wrangler.toml`.

Aplicar el esquema en remoto:

```bash
pnpm --filter @agrodatos/worker-etl exec wrangler d1 execute agrodatos --remote --file=src/db/schema.sql
```

Verificar tablas e índices:

```bash
pnpm --filter @agrodatos/worker-etl exec wrangler d1 execute agrodatos --remote --command="SELECT type, name FROM sqlite_master WHERE name IN ('etl_logs','data_versions','idx_etl_logs_status','idx_data_versions_active','idx_data_versions_status','idx_data_versions_one_active') ORDER BY type, name;"
```

## Migración de aprobación de versiones

Para una base existente creada antes del flujo de aprobación, aplicar una sola vez:

```bash
pnpm --filter @agrodatos/worker-etl exec wrangler d1 execute agrodatos --remote --file=src/db/migrations/001_version_approval.sql
```

La migración agrega `status`, `change_summary`, `applied_at` y `discarded_at`, marca la versión activa actual como `ACTIVE` y crea el índice único de una sola versión activa. Aplicarla **antes** de desplegar el Worker nuevo.

## Secretos del Worker

```bash
pnpm --filter @agrodatos/worker-etl exec wrangler secret put ADMIN_API_KEY
pnpm --filter @agrodatos/worker-etl exec wrangler secret put SOCRATA_APP_TOKEN  # opcional
```

`SOCRATA_APP_TOKEN` es opcional; sin token la API de Socrata aplica límites de tasa más bajos.

`ADMIN_API_KEY` se genera fuera del repositorio y no se versiona. Para producción se recomienda proteger `/admin` y `/api/admin/*` con Cloudflare Access.

## Despliegue manual

Worker:

```bash
pnpm --filter @agrodatos/worker-etl run deploy
```

Frontend:

```bash
VITE_API_BASE_URL=https://agrodatos-worker-etl.jairolop88.workers.dev pnpm --filter @agrodatos/frontend build
pnpm --filter @agrodatos/worker-etl exec wrangler pages deploy "$PWD/apps/frontend/dist" --project-name agrodatos --branch main
```

El proyecto de Pages se crea una sola vez. Con Wrangler 4.158 la creación inicial requiere `--force` para evitar la delegación a Workers:

```bash
pnpm --filter @agrodatos/worker-etl exec wrangler pages project create agrodatos --production-branch main --force
```

## Aprobación de versiones

El ETL ya no activa automáticamente. Si el hash cambia, crea una versión `PENDING` con un diff y mantiene la versión activa anterior. La decisión se toma en `https://agrodatos.pages.dev/admin` o por API:

```bash
# Listar pendientes
curl -H "Authorization: Bearer <ADMIN_API_KEY>" \
  https://agrodatos-worker-etl.jairolop88.workers.dev/api/admin/pending

# Aplicar una versión
curl -X POST -H "Authorization: Bearer <ADMIN_API_KEY>" \
  https://agrodatos-worker-etl.jairolop88.workers.dev/api/admin/pending/<version_id>/apply

# Omitir una versión
curl -X POST -H "Authorization: Bearer <ADMIN_API_KEY>" \
  https://agrodatos-worker-etl.jairolop88.workers.dev/api/admin/pending/<version_id>/omit

# Historial
curl -H "Authorization: Bearer <ADMIN_API_KEY>" \
  https://agrodatos-worker-etl.jairolop88.workers.dev/api/admin/versions
```

Si una versión fue omitida y el mismo hash vuelve a aparecer, el ETL no la propone de nuevo. Para forzar la comparación:

```bash
curl -X POST -H "Authorization: Bearer <ADMIN_API_KEY>" \
  "https://agrodatos-worker-etl.jairolop88.workers.dev/api/admin/trigger?force=true"
```

La versión `2026.11.09-4fde9c028aae` ya está activa con 25.909 registros, 107 cultivos y 57 periodos. La versión anterior `2026.11.09-f61c89984492` quedó `SUPERSEDED`. El flujo de aprobación queda disponible para futuras ejecuciones.

## GitHub Actions

El workflow `CI` ejecuta install, typecheck, tests y build en pushes y pull requests a `main`.

El workflow `Deploy` ejecuta install, typecheck, tests, build, deploy del Worker, configuración de secretos y deploy de Pages en `main` (o manualmente con `workflow_dispatch`).

### Secrets de GitHub

| Nombre | Uso |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Token con permisos de Workers Scripts, Pages y D1 |
| `CLOUDFLARE_ACCOUNT_ID` | `5ccd3e3c51906229945c32bdf1260d9e` |
| `ADMIN_API_KEY` | Clave del trigger administrativo |
| `SOCRATA_APP_TOKEN` | Opcional; token de Socrata |

### Variable de GitHub

| Nombre | Valor |
|---|---|
| `VITE_API_BASE_URL` | `https://agrodatos-worker-etl.jairolop88.workers.dev` |
| `DEPLOY_ENABLED` | `true` para habilitar el job de despliegue automático en `main` |

Si `VITE_API_BASE_URL` no existe, el workflow usa esa misma URL como valor por defecto. El job de despliegue se omite mientras `DEPLOY_ENABLED` no sea `true`, para no fallar en repositorios sin secretos configurados. Configura los secrets y la variable, y luego habilita `DEPLOY_ENABLED`.

## Verificación posterior al despliegue

```bash
curl https://agrodatos-worker-etl.jairolop88.workers.dev/api/health
curl https://agrodatos-worker-etl.jairolop88.workers.dev/api/version
```

Para disparar el ETL:

```bash
curl -X POST \
  -H "Authorization: Bearer <ADMIN_API_KEY>" \
  https://agrodatos-worker-etl.jairolop88.workers.dev/api/admin/trigger
```

El trigger responde `202` con `etl_log_id`; el estado se consulta en:

```bash
curl -H "Authorization: Bearer <ADMIN_API_KEY>" \
  https://agrodatos-worker-etl.jairolop88.workers.dev/api/admin/etl/<etl_log_id>
```

Cuando el log termine, revisar `/api/admin/pending` y aplicar u omitir la versión.

## Cobertura de fuentes

Validación estructural por defecto:

```bash
pnpm --filter @agrodatos/worker-etl coverage
```

Comparación estricta contra el snapshot:

```bash
pnpm --filter @agrodatos/worker-etl coverage:strict
```

Regenerar el snapshot después de un cambio intencional:

```bash
pnpm --filter @agrodatos/worker-etl coverage:update
```

El workflow `Coverage` es manual (`workflow_dispatch`) y permite ejecutar el modo estricto con un input booleano. No requiere secretos.

## Migraciones futuras

Aplicar cambios de esquema en remoto:

```bash
pnpm --filter @agrodatos/worker-etl exec wrangler d1 execute agrodatos --remote --file=src/db/schema.sql
```

Para cambios destructivos o evolutivos, crear migraciones versionadas y aplicarlas con `wrangler d1 migrations apply`.
