# 📋 Backlog — AgroDatos

Listado maestro de tareas del proyecto, ordenadas por dependencias y agrupadas en olas de ejecución paralela.

**Última actualización:** 2026-11-08

---

## Estado del proyecto

- Monorepo `pnpm workspaces` inicializado.
- Paquetes base creados: `@agrodatos/frontend`, `@agrodatos/worker-etl`, `@agrodatos/shared-types`.
- Repositorio público: https://github.com/jairolopezlon/agrodatos
- Primer commit: `docs: add project README`.
- Aún no hay código de aplicación, esquema D1 ni configuración de Wrangler.

---

## Convenciones

### Estados

| Estado | Significado |
|---|---|
| `Hecho` | Tarea completada, verificada y commiteada |
| `En curso` | Tarea siendo implementada |
| `Pendiente` | Tarea lista para iniciar cuando sus dependencias estén hechas |
| `Bloqueada` | Dependencia externa pendiente (credenciales, cuenta, decisión) |

### Reglas de ejecución

- No se trabaja en oneshot: cada ola se ejecuta y se detiene hasta que se pida la siguiente.
- Máximo 3 tareas en paralelo por ola.
- Una tarea solo inicia cuando todas sus dependencias están en `Hecho`.
- Cada tarea debe cerrar con typecheck, verificación funcional cuando aplique y commit propio.

### Definition of Done

1. Archivos entregables creados o modificados.
2. `pnpm --filter <paquete> typecheck` pasa.
3. Verificación funcional descrita en la tarea ejecutada.
4. Cambios commiteados con mensaje descriptivo.
5. Estado actualizado en este backlog.

---

## Resumen de olas

| Ola | Tareas | Objetivo |
|---|---|---|
| 0 | T00 | Crear y versionar el backlog |
| 1 | T01, T02, T03 | Fundaciones: contratos, esquema D1 y scaffolding del Worker |
| 2 | T04, T05 | Base D1 provisionada y módulo de extracción Socrata |
| 3 | T06, T07 | Repositorio D1 y construcción de versiones comprimidas |
| 4 | T08, T09 | Orquestador ETL y API Hono |
| 5 | T10, T11 | Automatización con Cron y pruebas |
| 6 | T12 | Cliente de datos offline en el frontend |
| 7 | T13, T14 | PWA offline y visualización |

**Próxima ola a ejecutar:** Ola 1 (T01 + T02 + T03).

---

## Listado maestro de tareas

| ID | Tarea | Épica | Depende de | Ola | Estado |
|---|---|---|---|---|---|
| T00 | Crear `BACKLOG.md` | A. Fundaciones | — | 0 | Hecho |
| T01 | Contratos compartidos | A. Fundaciones | — | 1 | Pendiente |
| T02 | Esquema D1 | A. Fundaciones | — | 1 | Pendiente |
| T03 | Scaffolding del Worker | A. Fundaciones | — | 1 | Pendiente |
| T04 | Provisión de D1 | A. Fundaciones | T02, T03 | 2 | Pendiente |
| T05 | Módulo de extracción Socrata | A. Fundaciones | T01, T03 | 2 | Pendiente |
| T06 | Repositorio D1 | B. Persistencia | T01, T02, T04 | 3 | Pendiente |
| T07 | Versionado, hash y gzip | B. Persistencia | T01, T05 | 3 | Pendiente |
| T08 | Orquestador ETL + Load | B. Persistencia | T05, T06, T07 | 4 | Pendiente |
| T09 | API Hono | C. API y automatización | T06 | 4 | Pendiente |
| T10 | Cron + trigger manual | C. API y automatización | T08 | 5 | Pendiente |
| T11 | Pruebas y smoke tests | C. API y automatización | T08, T09 | 5 | Pendiente |
| T12 | Cliente frontend + Dexie | D. Frontend offline | T09 | 6 | Pendiente |
| T13 | PWA y sincronización offline | D. Frontend offline | T12 | 7 | Pendiente |
| T14 | Visualización de datos | D. Frontend offline | T12 | 7 | Pendiente |

---

## Épica A — Fundaciones

### T00 — Crear `BACKLOG.md` ✅

- **Entregable:** este archivo.
- **Estado:** Hecho.
- **Criterio de aceptación:** backlog versionado en el repositorio con tareas, dependencias y olas.

### T01 — Contratos compartidos

- **Estado:** Pendiente.
- **Depende de:** —
- **Ola:** 1.
- **Archivos:**
  - `packages/shared-types/src/index.ts`
  - `packages/shared-types/tsconfig.json`
- **Descripción:** definir los DTO de extracción, las interfaces Raw de Socrata y los tipos de persistencia D1.
- **Tipos requeridos:**
  - `AgroDataSource`, `AgroDataNormalized`.
  - `RawSocrataHistorical`, `RawSocrataCurrent`.
  - `EtlLogStatus`, `EtlTriggerSource`, `EtlLogRecord`.
  - `D1Blob`, `DataVersionRecord`, `VersionMetadata`.
- **Criterios de aceptación:**
  - `pnpm --filter @agrodatos/shared-types typecheck` pasa.
  - `AgroDataNormalized` usa `number` estricto para métricas.
  - Fechas tipadas como `string` ISO-8601.
  - `is_active` tipado como `0 | 1`.
  - `payload_gzip` tipado como `number[]` (D1 devuelve BLOB como array de bytes).
  - `VersionMetadata` excluye el payload.

### T02 — Esquema D1

- **Estado:** Pendiente.
- **Depende de:** —
- **Ola:** 1.
- **Archivo:** `apps/worker-etl/src/db/schema.sql`
- **Descripción:** crear las tablas `etl_logs` y `data_versions` con sus índices.
- **Criterios de aceptación:**
  - `etl_logs` con estados `SUCCESS | FAILED | RUNNING` y origen `CRON | MANUAL`.
  - `data_versions` con `version_id` PK, `hash`, `total_records`, `payload_gzip BLOB`, `is_active` 0/1 y FK a `etl_logs`.
  - Fechas con `DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`.
  - Índices `idx_data_versions_active` e `idx_etl_logs_status`.
  - El schema aplica sin errores en SQLite/D1 local.
- **Notas:** `payload_json TEXT` se reemplaza por `payload_gzip BLOB` porque el payload supera el límite de fila de 2 MB de D1.

### T03 — Scaffolding del Worker

- **Estado:** Pendiente.
- **Depende de:** —
- **Ola:** 1.
- **Archivos:**
  - `apps/worker-etl/tsconfig.json`
  - `apps/worker-etl/wrangler.toml`
  - `apps/worker-etl/src/index.ts` (stub)
- **Descripción:** preparar la configuración mínima para compilar y ejecutar el Worker.
- **Criterios de aceptación:**
  - TypeScript con `@cloudflare/workers-types`, `strict` y `noEmit`.
  - `wrangler.toml` con `name`, `main` y `compatibility_date`.
  - Binding D1 y Cron comentados hasta T04/T10.
  - `wrangler deploy --dry-run` genera el bundle sin errores.
  - El stub responde un health check básico.

### T04 — Provisión de D1

- **Estado:** Pendiente.
- **Depende de:** T02, T03.
- **Ola:** 2.
- **Descripción:** crear la base D1 `agrodatos`, configurar el binding y aplicar el esquema.
- **Criterios de aceptación:**
  - Base creada en Cloudflare y `database_id` registrado en `wrangler.toml`.
  - Schema aplicado en local y remoto.
  - `sqlite_master` muestra ambas tablas y ambos índices.
  - El Worker puede acceder a `env.DB`.
- **Riesgos:** requiere autenticación y permisos de Cloudflare. Si no están disponibles, se aplica solo en local y la tarea queda `Bloqueada` para remoto.

### T05 — Módulo de extracción Socrata

- **Estado:** Pendiente.
- **Depende de:** T01, T03.
- **Ola:** 2.
- **Archivo:** `apps/worker-etl/src/etl/extract.ts`
- **Descripción:** implementar el patrón Adapter y la paginación robusta de Socrata.
- **Componentes:**
  - `Env` con `SOCRATA_APP_TOKEN?` y `DB?`.
  - `toNumber(value: unknown): number`.
  - `adaptHistorical`, `adaptCurrent`.
  - `fetchSocrataPaginated<T>`.
  - `extractValleDelVaucaData(env)`.
- **Criterios de aceptación:**
  - Paginación con `$limit=10000`, `$offset` y `$order=:id`.
  - Verificación de `res.ok`, JSON array y errores descriptivos.
  - Reintentos para `429`/`5xx` y timeout por request.
  - Filtros: `c_d_dep=76` y `c_digo_dane_departamento='76'`.
  - Fallbacks para los nombres reales de la fuente vigente (`rea_sembrada`, `rea_cosechada`, `producci_n`, `rendimiento`).
  - Smoke test con ~26 363 registros.
  - Sin dependencias externas adicionales.

---

## Épica B — Persistencia y versionado

### T06 — Repositorio D1

- **Estado:** Pendiente.
- **Depende de:** T01, T02, T04.
- **Ola:** 3.
- **Archivo:** `apps/worker-etl/src/db/repositories.ts`
- **Descripción:** encapsular todas las consultas D1 del pipeline.
- **Funciones propuestas:**
  - `createEtlLog(env, triggerSource)`
  - `finishEtlLog(env, id, result)`
  - `insertDataVersion(env, record)`
  - `getActiveVersionMetadata(env)`
  - `getVersionMetadata(env, versionId)`
  - `getVersionPayload(env, versionId)`
  - `activateVersion(env, versionId)`
- **Criterios de aceptación:**
  - Activación atómica con `env.DB.batch()`.
  - `getVersionPayload` convierte `number[]` a `Uint8Array`.
  - Integración verificada contra D1 local.

### T07 — Versionado, hash y gzip

- **Estado:** Pendiente.
- **Depende de:** T01, T05.
- **Ola:** 3.
- **Archivo:** `apps/worker-etl/src/etl/version.ts`
- **Descripción:** construir el payload consolidado y su metadata.
- **Funciones propuestas:**
  - `buildPayload(records)`
  - `sha256Hex(input)`
  - `gzipJson(input)`
  - `buildVersionId(date, hash)`
  - `buildVersion(records)`
- **Criterios de aceptación:**
  - Hash SHA-256 calculado sobre el JSON sin comprimir.
  - Compresión con `CompressionStream("gzip")`.
  - `version_id` con formato `YYYY.MM.DD-<hash corto>`.
  - Payload comprimido < 2 MB.
  - Pruebas unitarias de determinismo.

### T08 — Orquestador ETL + Load

- **Estado:** Pendiente.
- **Depende de:** T05, T06, T07.
- **Ola:** 4.
- **Archivo:** `apps/worker-etl/src/etl/run.ts`
- **Descripción:** ejecutar el pipeline completo y registrar la auditoría.
- **Flujo:**
  1. Crear `etl_logs` en `RUNNING`.
  2. Extraer datos de ambas fuentes.
  3. Construir versión comprimida y hash.
  4. Insertar `data_versions`.
  5. Activar la nueva versión.
  6. Marcar el log como `SUCCESS` o `FAILED`.
- **Criterios de aceptación:**
  - Si falla la extracción o el guardado, la versión activa anterior no se pierde.
  - Se registran `records_extracted`, `execution_time_ms` y `error_message`.
  - Retorna un resumen de la ejecución.

---

## Épica C — API y automatización

### T09 — API Hono

- **Estado:** Pendiente.
- **Depende de:** T06.
- **Ola:** 4.
- **Archivos:** `apps/worker-etl/src/routes/*.ts`, `apps/worker-etl/src/index.ts`
- **Descripción:** exponer metadata y payload al frontend.
- **Endpoints propuestos:**
  - `GET /api/health`
  - `GET /api/version` → `VersionMetadata` de la versión activa.
  - `GET /api/data/:versionId` → payload gzip con `Content-Encoding: gzip`.
  - `HEAD /api/data/:versionId` para validación de caché.
- **Criterios de aceptación:**
  - `/api/version` no descarga el payload.
  - ETag basado en `hash`.
  - `Cache-Control: immutable` para URLs versionadas.
  - CORS habilitado para el dominio de Pages.

### T10 — Cron + trigger manual

- **Estado:** Pendiente.
- **Depende de:** T08.
- **Ola:** 5.
- **Descripción:** automatizar la ejecución del ETL.
- **Criterios de aceptación:**
  - `scheduled()` invoca `runEtl(env, "CRON")`.
  - Cron configurado en `wrangler.toml`.
  - Ruta manual protegida por token secreto.
  - El trigger manual registra `trigger_source = 'MANUAL'`.

### T11 — Pruebas y smoke tests

- **Estado:** Pendiente.
- **Depende de:** T08, T09.
- **Ola:** 5.
- **Descripción:** cubrir adaptadores, versionado, repositorio y endpoints.
- **Criterios de aceptación:**
  - Pruebas unitarias de `toNumber`, adaptadores y versionado.
  - Prueba de integración con D1 local.
  - Smoke test opcional contra Socrata real.
  - Framework de pruebas a definir (Vitest o `node:test`).

---

## Épica D — Frontend offline

### T12 — Cliente frontend + Dexie

- **Estado:** Pendiente.
- **Depende de:** T09.
- **Ola:** 6.
- **Descripción:** implementar la capa de datos offline en React.
- **Criterios de aceptación:**
  - Esquema Dexie para metadata y payload.
  - Hook/consulta de versión activa con TanStack Query.
  - Descarga del payload solo si el hash cambió.
  - Lectura de datos desde IndexedDB sin red.

### T13 — PWA y sincronización offline

- **Estado:** Pendiente.
- **Depende de:** T12.
- **Ola:** 7.
- **Descripción:** configurar `vite-plugin-pwa` y las estrategias de caché.
- **Criterios de aceptación:**
  - Estrategia network-first para `/api/version`.
  - Estrategia cache-first/immutable para `/api/data/*`.
  - Fallback offline y aviso de actualización disponible.
  - Instalable como PWA.

### T14 — Visualización de datos

- **Estado:** Pendiente.
- **Depende de:** T12.
- **Ola:** 7.
- **Descripción:** construir las vistas y gráficas sobre el store local.
- **Criterios de aceptación:**
  - Filtros por municipio, cultivo y año.
  - Gráficas responsivas con Chart.js.
  - Estados de carga, vacío y error.
  - Funcionamiento completo sin conexión.

---

## Decisiones técnicas registradas

| Tema | Decisión |
|---|---|
| Gestor de paquetes | pnpm workspaces, Node 20+ |
| Fechas en D1 | `TEXT` ISO-8601 con `strftime` |
| Payload | `payload_gzip BLOB` (~240 KB) en lugar de `payload_json TEXT` (~4,9 MB) |
| Límite D1 | 2 MB por fila; 50 MB por resultado de consulta |
| Lectura de BLOB | D1 devuelve `number[]`; convertir a `Uint8Array` al servir |
| Hash | SHA-256 sobre el JSON sin comprimir |
| Paginación Socrata | `$limit=10000`, `$offset`, `$order=:id` |
| Fuente vigente | Columnas reales: `rea_sembrada`, `rea_cosechada`, `producci_n`, `rendimiento` |
| Fuente histórica | Columnas: `rea_sembrada_ha`, `rea_cosechada_ha`, `producci_n_t`, `rendimiento_t_ha` |
| Periodos | La fuente vigente es semestral (`2019A`, `2019B`); incluir `periodo` |
| Datos faltantes | Normalizar a `0` para mantener `number` estricto |

---

## Ideas futuras (no comprometidas)

- Despliegue de frontend en Cloudflare Pages y Worker en producción.
- CI/CD con GitHub Actions.
- Observabilidad y alertas del ETL.
- Validaciones de calidad de datos (rangos, duplicados, municipios válidos).
- Expansión a nivel nacional y estrategia de payload (R2 o chunks si crece).
- Autenticación más robusta para el trigger manual.
- Historial de versiones y rollback desde el frontend.
