# 📋 Backlog — AgroDatos

Listado maestro de tareas del proyecto, ordenadas por dependencias y agrupadas en olas de ejecución paralela.

**Última actualización:** 2026-11-09

---

## Estado del proyecto

- Monorepo `pnpm workspaces` inicializado.
- Paquetes base creados: `@agrodatos/frontend`, `@agrodatos/worker-etl`, `@agrodatos/shared-types`.
- Repositorio público: https://github.com/jairolopezlon/agrodatos
- Commits iniciales: `docs: add project README`, `docs: add project backlog`.
- Contratos compartidos (T01), esquema D1 (T02), scaffolding (T03), provisión D1 (T04) y extracción Socrata (T05) implementados.
- D1 `agrodatos` activa en ENAM; esquema aplicado en local y remoto.
- Ola 4 implementada: versionado/hash/gzip y API pública.
- Ola 5 completa: orquestador ETL y cliente offline implementados.
- Ola 6 completa: cron, PWA y visualización implementados.
- Ola 7 completa: vista admin y pruebas implementadas.
- Ola 8 completa: producción desplegada y CI/CD configurado.
- Ola 9: normalización de cultivos, 2006 parcial, cobertura híbrida y aprobación manual de versiones.
- Ola 10 completa: filtros multi-selección y tablero comparativo (T20).
- Versión activa en producción: `2026.11.09-4fde9c028aae` (25 909 registros, 107 cultivos, 57 periodos).
- Frontend: https://agrodatos.pages.dev · Worker: https://agrodatos-worker-etl.jairolop88.workers.dev

---

## Cambios de esta revisión

Se validó el backlog propuesto y se aplicaron estos ajustes:

1. **T06/T07 reordenados lógicamente:** la validación de calidad se ejecuta sobre `AgroDataNormalized[]`, antes de compactar. No se validan tuplas comprimidas.
2. **Tupla comprimida corregida:** incluye `periodo`; `fuente` queda pendiente de decisión para no perder la distinción histórico/vigente.
3. **Dependencia inválida corregida:** T10 (orquestador) ahora depende de T09. En la propuesta original T09 y T10 estaban en la misma ola, pero T10 dependía de T09.
4. **T11 API desacoplada del orquestador:** los endpoints públicos solo dependen del repositorio (T08). El trigger administrativo se mueve a T12.
5. **T16 corregida:** la vista admin depende de T12 (endpoint protegido) además de T13.
6. **Testing recuperado:** se agrega T17, que la propuesta había eliminado.
7. **Despliegue agregado:** se agrega T18 para Cloudflare Pages/Workers y CI/CD.
8. **Hash determinista:** se calcula sobre `{ schema_version, dicts, data }`, excluyendo `generated_at`, `version_id` y otros metadatos volátiles. Así no se descarga el payload si los datos no cambiaron.
9. **`schema_version` agregado** a `data_versions` y `VersionMetadata` para invalidar cachés del frontend.
10. **Una sola versión activa garantizada** con índice único parcial en D1.
11. **Auditoría de calidad:** se agregan `records_rejected` y `validation_report` a `etl_logs`.
12. **Shadcn UI descartado por defecto:** contradice la decisión inicial de “Tailwind CSS puro”. Se usarán componentes nativos + Tailwind; Shadcn queda como evaluación futura.
13. **Dexie no es síncrono:** la lectura se hará con React Query o `useLiveQuery`, nunca de forma síncrona.
14. **Vista admin con logs:** se agrega `GET /api/admin/etl/:id` para que la UI pueda consultar el estado y los logs del trigger.

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
| 3 | T06, T07, T08 | Transformación, Data Quality (Circuit Breaker) y Repositorio D1 |
| 4 | T09, T11 | Versionado (gzip/hash) y API pública de Hono |
| 5 | T10, T13 | Orquestador ETL y cliente offline del frontend |
| 6 | T12, T14, T15 | Cron/trigger seguro, PWA y visualización |
| 7 | T16, T17 | Vista Admin y pruebas/smoke tests |
| 8 | T18 | Despliegue y CI/CD |
| 9 | T19 | Aprobación manual de versiones |
| 10 | T20 | Filtros multi-selección y tablero comparativo |

**Próxima ola a ejecutar:** todas las olas planificadas están completas; siguiente alcance pendiente de definir.

---

## Listado maestro de tareas

| ID | Tarea | Épica | Depende de | Ola | Estado |
|---|---|---|---|---|---|
| T00 | Crear `BACKLOG.md` | A. Fundaciones | — | 0 | Hecho |
| T01 | Contratos compartidos | A. Fundaciones | — | 1 | Hecho |
| T02 | Esquema D1 | A. Fundaciones | — | 1 | Hecho |
| T03 | Scaffolding del Worker | A. Fundaciones | — | 1 | Hecho |
| T04 | Provisión de D1 | A. Fundaciones | T02, T03 | 2 | Hecho |
| T05 | Módulo de extracción Socrata | A. Fundaciones | T01, T03 | 2 | Hecho |
| T06 | Transformación y compactación de payload | B. Procesamiento | T01, T05 | 3 | Hecho |
| T07 | Data Quality y Circuit Breaker | B. Procesamiento | T01, T05 | 3 | Hecho |
| T08 | Repositorio D1 | B. Procesamiento | T01, T02, T04 | 3 | Hecho |
| T09 | Versionado, hash y gzip | B. Procesamiento | T06, T07 | 4 | Hecho |
| T10 | Orquestador ETL + Load | B. Procesamiento | T05, T06, T07, T08, T09 | 5 | Hecho |
| T11 | API Hono y endpoints públicos | C. API y automatización | T08 | 4 | Hecho |
| T12 | Cron + trigger manual seguro | C. API y automatización | T10, T11 | 6 | Hecho |
| T13 | Cliente frontend + Dexie | D. Frontend offline | T11 | 5 | Hecho |
| T14 | PWA y sincronización offline | D. Frontend offline | T13 | 6 | Hecho |
| T15 | Visualización de datos (Chart.js) | D. Frontend offline | T13 | 6 | Hecho |
| T16 | Vista Admin y UI del Trigger ETL | D. Frontend offline | T12, T13 | 7 | Hecho |
| T17 | Pruebas y smoke tests | C. API y automatización | T06, T07, T08, T09, T10, T11 | 7 | Hecho |
| T18 | Despliegue y CI/CD | E. Operación | T14, T16, T17 | 8 | Hecho |
| T19 | Aprobación manual de versiones | E. Operación | T08, T10, T16 | 9 | Hecho |
| T20 | Filtros multi-selección y tablero comparativo | D. Frontend offline | T15 | 10 | Hecho |

---

## Épica A — Fundaciones

### T00 — Crear `BACKLOG.md` ✅

- **Entregable:** este archivo.
- **Estado:** Hecho.
- **Criterio de aceptación:** backlog versionado con tareas, dependencias y olas.

### T01 — Contratos compartidos

- **Estado:** Hecho.
- **Depende de:** —
- **Ola:** 1.
- **Archivos:**
  - `packages/shared-types/src/index.ts`
  - `packages/shared-types/tsconfig.json`
- **Descripción:** definir los DTO de extracción, las interfaces Raw de Socrata, los tipos de persistencia D1 y el contrato del payload compactado.
- **Tipos implementados:**
  - `EtlLogStatus`, `EtlTriggerSource`, `EtlLogRecord`.
  - `DataVersionRecord`, `VersionMetadata`.
  - `RawSocrataHistorical`, `RawSocrataCurrent`.
  - `AgroDataNormalized`.
  - `AgroTuple`, `CompressedAgroPayload`.
- **Contrato implementado:**

```ts
export type AgroTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface CompressedAgroPayload {
  metadata: {
    version: string;
    schema_version: number;
    updated_at: string;
    total_records: number;
  };
  dicts: {
    municipios: Record<number, string>;
    cultivos: Record<number, string>;
    periodos: Record<number, string>;
  };
  data: AgroTuple[];
}
```

- **Criterios de aceptación:**
  - `pnpm --filter @agrodatos/shared-types typecheck` pasa.
  - `AgroDataNormalized` usa `number` estricto para métricas.
  - Fechas tipadas como `string`.
  - `is_active` tipado como `0 | 1`.
  - `payload_gzip` tipado como `number[] | Uint8Array`.
  - `VersionMetadata` es un `Pick` de `DataVersionRecord` y excluye el payload.
- **Nota de implementación (refactor 2026-11-08):**
  - `AgroTuple` tiene 8 números: `id_mun`, `id_cultivo`, `id_periodo`, `año`, `a_semb`, `a_cose`, `prod`, `rend`.
  - `metadata` incluye `version`, `schema_version`, `updated_at` y `total_records`.
  - `dicts` incluye `municipios`, `cultivos` y `periodos`.
  - `AgroDataNormalized` incluye `periodo`.
  - `DataVersionRecord` y `VersionMetadata` incluyen `schema_version`.
  - `EtlLogRecord` incluye `records_rejected` y `validation_report`.
  - `RawSocrataCurrent` usa las llaves reales de UPRA: `rea_sembrada`, `rea_cosechada`, `producci_n` y `rendimiento`.
  - `fuente` no forma parte del contrato actual; si se requiere distinguir histórico/vigente, se debe agregar en una revisión posterior.

### T02 — Esquema D1

- **Estado:** Hecho.
- **Depende de:** —
- **Ola:** 1.
- **Archivo:** `apps/worker-etl/src/db/schema.sql`
- **Descripción:** crear las tablas `etl_logs` y `data_versions` con sus índices.
- **Criterios de aceptación:**
  - `etl_logs` con estados `SUCCESS | FAILED | RUNNING`, origen `CRON | MANUAL`, `records_extracted`, `records_rejected`, `validation_report`, `error_message` y `execution_time_ms`.
  - `data_versions` con `version_id` PK, `hash`, `total_records`, `schema_version`, `payload_gzip BLOB`, `is_active` 0/1 y FK a `etl_logs`.
  - Fechas con `DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`.
  - Índices `idx_data_versions_active` sobre `is_active` e `idx_etl_logs_status` sobre `status`.
  - El schema aplica sin errores en SQLite/D1 local.
- **Notas:** `payload_json TEXT` se reemplaza por `payload_gzip BLOB` porque el payload supera el límite de fila de 2 MB de D1. El índice único parcial para una sola versión activa y el índice de `hash` no se incluyeron en esta especificación; quedan como mejora futura. `etl_log_id` es nullable en SQL aunque el tipo TypeScript lo declare `number`.

### T03 — Scaffolding del Worker

- **Estado:** Hecho.
- **Depende de:** —
- **Ola:** 1.
- **Archivos:**
  - `apps/worker-etl/tsconfig.json`
  - `apps/worker-etl/wrangler.toml`
  - `apps/worker-etl/src/index.ts`
- **Descripción:** preparar la configuración mínima para compilar y ejecutar el Worker con Hono.
- **Criterios de aceptación:**
  - TypeScript estricto con `@cloudflare/workers-types`, `strict` y `noEmit`.
  - `wrangler.toml` con `name = "agrodatos-worker-etl"`, `main = "src/index.ts"` y `compatibility_date = "2024-03-20"`.
  - Binding D1 y Cron comentados hasta T04/T12.
  - `wrangler deploy --dry-run` genera el bundle sin errores.
  - `GET /api/health` responde `{"status":"ok","service":"AgroDatos ETL"}`.
- **Notas:** `compatibility_date` se fijó en `2024-03-20` según la especificación; puede actualizarse en T18. La app exporta `Env` con `DB: D1Database` y la instancia de Hono por defecto.

### T04 — Provisión de D1

- **Estado:** Hecho.
- **Depende de:** T02, T03.
- **Ola:** 2.
- **Descripción:** crear la base D1 `agrodatos`, configurar el binding y aplicar el esquema.
- **Criterios de aceptación:**
  - Base creada en Cloudflare y `database_id` registrado en `wrangler.toml`.
  - Schema aplicado en local y remoto.
  - `sqlite_master` muestra tablas e índices.
  - El Worker puede acceder a `env.DB`.
- **Riesgos:** requiere autenticación y permisos de Cloudflare. Si no están disponibles, se aplica solo en local y la tarea queda `Bloqueada` para remoto.
- **Notas:** Base `agrodatos` creada con ID `e348edb1-e8b0-486d-9f7f-c2f1dec7529d` en ENAM. Esquema aplicado con `wrangler d1 execute --local` y vía API remota; `sqlite_master` confirmó tablas e índices. `wrangler deploy --dry-run` muestra `env.DB (agrodatos)` como D1 Database.

### T05 — Módulo de extracción Socrata

- **Estado:** Hecho.
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
- **Notas:** Smoke test real: 26 363 registros (15 774 históricos + 10 589 vigentes), 42 municipios, 107 cultivos canónicos y 57 periodos. 2006 se incluye como año parcial (374 registros, 42 municipios, 24 cultivos, periodo 2006B). Reintentos con backoff exponencial y `Retry-After`; timeout con `AbortSignal.timeout`. `index.ts` extiende `Env` para exigir `DB` y mantener `SOCRATA_APP_TOKEN` opcional.

---

## Épica B — Procesamiento y Persistencia

### T06 — Transformación y compactación de payload

- **Estado:** Hecho.
- **Depende de:** T01, T05.
- **Ola:** 3.
- **Archivo:** `apps/worker-etl/src/etl/transform.ts`
- **Descripción:** convertir `AgroDataNormalized[]` en `CompressedAgroPayload` con diccionarios y tuplas posicionales.
- **Reglas:**
  - `dicts.municipios`: `Record<number, string>` (índice → nombre), único, ordenado por `id`.
  - `dicts.cultivos`: `Record<number, string>` (índice → nombre), único, ordenado alfabéticamente.
  - `dicts.periodos`: `Record<number, string>` (índice → periodo), único, ordenado cronológicamente.
  - `data`: tuplas `[municipioIdx, cultivoIdx, periodoIdx, anio, areaSembrada, areaCosechada, produccion, rendimiento]`.
  - Diccionarios deterministas para que el hash sea estable.
- **Criterios de aceptación:**
  - El payload incluye `periodo` en cada registro.
  - No se pierden registros semestrales (`2019A`, `2019B`).
  - Entrada vacía produce un payload válido con diccionarios y data vacíos.
  - Pruebas de determinismo: mismo input produce mismo output.
- **Notas:** Implementado `buildCompressedPayload(rows, options)`. Los cultivos se agrupan por clave canónica (mayúsculas, sin tildes, Ñ preservada) y la etiqueta visible se mantiene en mayúsculas con tildes. Se pasa de 172 etiquetas crudas a 107 cultivos canónicos. Smoke test con 25 909 aceptados: 42 municipios, 107 cultivos y 57 periodos; dos ejecuciones con el mismo input produjeron payloads idénticos. Los diccionarios se ajustaron al tipo `Record<number, string>` de `@agrodatos/shared-types`.

### T07 — Data Quality y Circuit Breaker

- **Estado:** Hecho.
- **Depende de:** T01, T05.
- **Ola:** 3.
- **Archivo:** `apps/worker-etl/src/etl/validate.ts`
- **Descripción:** validar `AgroDataNormalized[]` antes de transformar y compactar.
- **Reglas fatales (abortan el ETL):**
  - Cero registros extraídos.
  - Campos estructurales faltantes o schema inesperado.
  - Tasa de rechazo superior al umbral configurado (por defecto 5%).
- **Reglas por fila (rechazan el registro y cuentan):**
  - `areaCosechada > areaSembrada`.
  - `areaSembrada`, `areaCosechada`, `produccion` o `rendimiento` negativos.
  - `anio` fuera de `2007–2025`.
  - `municipioId` con longitud distinta de 5 o que no empiece por `76`.
  - `municipioNombre` o `cultivo` vacíos.
  - Outlier de área sembrada por encima del umbral configurable (por defecto 150 000 ha).
- **Salida:** `ValidationResult` con `accepted`, `rejected`, `fatalErrors` y `report`.
- **Criterios de aceptación:**
  - El orquestador recibe filas aceptadas y un reporte serializable.
  - Un dato atípico aislado no bloquea toda la actualización.
  - El reporte se guarda en `etl_logs.validation_report`.
  - Umbrales definidos como constantes configurables.
- **Notas:** Implementado `validateAgroData(rows, thresholds)` con `minYear = 2006`. Smoke test real: 26 363 registros → 25 909 aceptados y 454 rechazados (1,72%), sin errores fatales. El único motivo de rechazo es `area_cosechada_mayor_que_area_sembrada`. Se agregó el guard de cobertura en `coverage.ts`: fatal para faltantes graves y advertencia para años parciales como 2006 (24 cultivos).

### T08 — Repositorio D1

- **Estado:** Hecho.
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
  - `getEtlLog(env, id)`
  - `listEtlLogs(env, limit)`
- **Criterios de aceptación:**
  - Activación atómica con `env.DB.batch()`: desactivar la anterior y activar la nueva.
  - `getVersionPayload` convierte `number[]` a `Uint8Array`.
  - `listEtlLogs` soporta la vista admin.
  - Integración verificada contra D1 local.
- **Notas:** Integración local verificada: creación y cierre de log, staging de versión `PENDING` con `change_summary`, activación atómica, listado de pendientes, aplicar/omitir, historial, lectura de metadata y payload (`Uint8Array`), y listado de logs. El índice único parcial garantiza una sola versión activa.

### T09 — Versionado, hash y gzip

- **Estado:** Hecho.
- **Depende de:** T06, T07.
- **Ola:** 4.
- **Archivo:** `apps/worker-etl/src/etl/version.ts`
- **Descripción:** construir el payload consolidado, su hash y su versión comprimida.
- **Funciones propuestas:**
  - `canonicalize(payload)`
  - `sha256Hex(input)`
  - `gzipJson(input)`
  - `buildVersionId(date, hash)`
  - `buildVersion(payload)`
- **Criterios de aceptación:**
  - Hash SHA-256 sobre `{ schema_version, dicts, data }`, excluyendo `generated_at`, `version_id` y metadatos volátiles.
  - Compresión con `CompressionStream("gzip")`.
  - `version_id` con formato `YYYY.MM.DD-<hash corto>`.
  - Guardia: si el gzip supera 1,8 MB, lanzar error descriptivo (límite D1 de 2 MB).
  - Pruebas de determinismo: mismo contenido produce mismo hash.
- **Notas:** `buildVersion` devuelve `BuiltVersion` (sin `etl_log_id`/`is_active`); el orquestador T10 completa el `DataVersionRecord`. `version_id` usa `YYYY.MM.DD-<12 hex>`. El hash se calcula sobre el JSON canónico y el gzip sobre el payload completo. Verificado: SHA-256 de `abc` correcto, hash estable, gzip estable, round-trip correcto y guardia de 1,8 MB.

### T10 — Orquestador ETL + Load

- **Estado:** Hecho.
- **Depende de:** T05, T06, T07, T08, T09.
- **Ola:** 5.
- **Archivo:** `apps/worker-etl/src/etl/run.ts`
- **Descripción:** ejecutar el pipeline completo y registrar la auditoría.
- **Flujo:**
  1. Crear `etl_logs` en `RUNNING`.
  2. Extraer datos de ambas fuentes.
  3. Validar con T07. Si hay error fatal, marcar `FAILED` y terminar.
  4. Transformar y compactar con T06.
  5. Construir versión con T09.
  6. Comparar hash con la versión activa. Si es igual, no crear versión nueva.
  7. Insertar `data_versions` y activarla atómicamente.
  8. Marcar el log como `SUCCESS`.
- **Manejo de errores:**
  - Cualquier excepción marca el log como `FAILED`.
  - La versión activa anterior se conserva.
  - Se registran `records_extracted`, `records_rejected`, `validation_report`, `execution_time_ms` y `error_message`.
- **Criterios de aceptación:**
  - Re-ejecutar sin cambios no genera una versión nueva.
  - Un fallo de validación no inserta ni activa versiones.
  - Retorna un resumen de la ejecución.
- **Notas:** El orquestador ahora crea una versión `PENDING` con diff y no activa automáticamente. E2E local: primera ejecución con 26 363 extraídos, 25 909 aceptados, 454 rechazados y gzip de 190 836 bytes; la versión `2026.11.09-4fde9c028aae` quedó `PENDING` y se aplicó desde la API. La segunda ejecución devolvió `NO_CHANGES`. Los logs guardan `validation_report` con cobertura y decisión.

---

## Épica C — API y automatización

### T11 — API Hono y endpoints públicos

- **Estado:** Hecho.
- **Depende de:** T08.
- **Ola:** 4.
- **Archivos:** `apps/worker-etl/src/routes/{health,version,data,api}.ts`, `apps/worker-etl/src/index.ts`
- **Descripción:** exponer metadata y payload al frontend.
- **Endpoints:**
  - `GET /api/health`
  - `GET /api/version` → `VersionMetadata` de la versión activa.
  - `GET /api/data/:versionId` → payload gzip con `Content-Encoding: gzip`.
  - `HEAD /api/data/:versionId`.
- **Criterios de aceptación:**
  - `/api/version` no descarga el payload.
  - ETag basado en `hash`.
  - `Cache-Control: no-cache` para metadata y `immutable` para URLs versionadas.
  - CORS habilitado para el dominio de Pages.
  - Respuesta 404 clara si no hay versión activa.
- **Notas:** Integración local verificada: health 200, version 200 con `Cache-Control: no-cache` y ETag, version 304 con `If-None-Match`, data 200 con `Content-Encoding: gzip` y `immutable`, HEAD 200 sin body, 404 para versión inexistente y CORS con `PAGES_ORIGIN` (default `*`). El endpoint de datos usa `encodeBody: "manual"` para evitar doble compresión; el runtime negocia `identity` descomprimiendo el payload.

### T12 — Cron + trigger manual seguro

- **Estado:** Hecho.
- **Depende de:** T10, T11.
- **Ola:** 6.
- **Descripción:** automatizar la ejecución del ETL y exponer un trigger administrativo protegido.
- **Criterios de aceptación:**
  - El entrypoint del Worker exporta `fetch` (Hono) y `scheduled`.
  - `scheduled()` invoca `runEtl(env, "CRON")`.
  - Cron configurado en `wrangler.toml`.
  - `POST /api/admin/trigger` valida `Authorization: Bearer <ADMIN_API_KEY>`.
  - El trigger responde `202 Accepted` con `etl_log_id` y ejecuta el ETL con `ctx.waitUntil`.
  - `GET /api/admin/etl/:id` devuelve el `EtlLogRecord` para que la UI consulte estado y logs.
  - Secreto configurado con `wrangler secret put ADMIN_API_KEY`.
  - Comparación de token sin filtrar tiempos (hash o comparación constante).
  - Nota: `scheduled` no es un método de Hono; es un handler del Worker.
- **Notas:** `src/index.ts` exporta `fetch` y `scheduled`; `wrangler.toml` activa `crons = ["0 3 * * 1"]` (Cloudflare usa 1 = domingo). `src/routes/admin.ts` implementa el trigger, logs, pendientes, aplicar/omitir e historial, protegidos con Bearer y comparación constante sobre SHA-256. Prueba local: 401 sin token/incorrecto, 202 con `etl_log_id`, polling hasta `SUCCESS` y log `CRON` `SUCCESS` vía `/__scheduled`. `ADMIN_API_KEY` está configurada como secreto en producción.

### T17 — Pruebas y smoke tests

- **Estado:** Hecho.
- **Depende de:** T06, T07, T08, T09, T10, T11.
- **Ola:** 7.
- **Descripción:** cubrir las piezas críticas del pipeline y la API.
- **Criterios de aceptación:**
  - Unitarias: `toNumber`, adaptadores, transformación, reglas de validación, hash determinista y gzip.
  - Integración: repositorio D1 local y rutas Hono con Miniflare/Wrangler.
  - Smoke opcional contra Socrata real: > 20 000 registros, gzip < 2 MB, `schema_version` correcto.
  - Framework: `node:test` con `--experimental-strip-types`.
  - No se exige cobertura alta; sí cubrir los caminos que pueden corromper datos.
- **Notas:** 41 pruebas unitarias en `apps/worker-etl/test/` con `node:test` (sin dependencias nuevas): `toNumber`, adaptadores, paginación/reintentos/errores, normalización de cultivos, determinismo y entrada vacía de transformación, reglas y errores fatales de validación, cobertura, diff con duplicados, SHA-256, gzip y `buildVersion`. Script `smoke` contra Socrata real: 26 363 registros, 25 909 aceptados, 454 rechazados, gzip de 190 836 bytes, 107 cultivos y 57 periodos. Script `coverage` con modo estricto y snapshot. La integración D1/Hono se verificó con Wrangler local en T04, T08, T11, T12, T16 y T19.

---

## Épica D — Frontend offline

### T13 — Cliente frontend + Dexie

- **Estado:** Hecho.
- **Depende de:** T11.
- **Ola:** 5.
- **Descripción:** implementar la capa de datos offline en React.
- **Criterios de aceptación:**
  - Esquema Dexie para metadata y payload compactado.
  - Consulta de `/api/version` con TanStack Query.
  - Descarga del payload solo si el hash o `schema_version` cambiaron.
  - El navegador descomprime gzip automáticamente al usar `fetch().json()` con `Content-Encoding: gzip`.
  - Lectura asíncrona desde Dexie con React Query o `useLiveQuery`; nunca síncrona.
  - Limpieza de versiones antiguas (conservar la activa y opcionalmente la anterior).
  - Manejo de `schema_version` no soportado con aviso de actualización.
- **Notas:** el endpoint es `/api/version`, no un archivo estático `version.json`. Implementado `src/db/dexie.ts` (tablas `versions` y `payloads`), `src/api/client.ts`, `src/hooks/useAgroData.ts` (TanStack Query + Dexie, fallback a caché, poda de versiones y error `UnsupportedSchemaVersionError`) y una app mínima en `src/App.tsx`. `pnpm --filter @agrodatos/frontend typecheck` y `build` pasan.

### T14 — PWA y sincronización offline

- **Estado:** Hecho.
- **Depende de:** T13.
- **Ola:** 6.
- **Descripción:** configurar `vite-plugin-pwa` y las estrategias de caché.
- **Criterios de aceptación:**
  - Estrategia NetworkFirst para `/api/version`.
  - Estrategia CacheFirst para `/api/data/*` (URLs versionadas inmutables).
  - Precache del app shell y fallback offline.
  - Aviso de actualización disponible.
  - Instalable como PWA con manifest e iconos.
  - No se cachea el token de admin ni respuestas de `/api/admin/*`.
- **Notas:** `vite.config.ts` configura `registerType: "prompt"`, NetworkFirst para `/api/version`, CacheFirst para `/api/data/*`, precache del app shell y `navigateFallbackDenylist` para `/api/*`. `UpdatePrompt` usa `virtual:pwa-register/react`. Manifest con iconos SVG y PNG 192/512. `workbox-window` se agregó como dependencia explícita. El build genera `sw.js` y `manifest.webmanifest`.

### T15 — Visualización de datos (Chart.js)

- **Estado:** Hecho.
- **Depende de:** T13.
- **Ola:** 6.
- **Descripción:** construir las vistas y gráficas sobre el store local.
- **Criterios de aceptación:**
  - Agregar `chart.js` y `react-chartjs-2` a `apps/frontend/package.json`.
  - Filtros por municipio, cultivo y año; botón para limpiar filtros.
  - Agregar/agrupar datos antes de graficar para no renderizar 26 000 puntos.
  - Gráficas responsivas con Chart.js.
  - Estados de carga, vacío y error.
  - Funcionamiento completo sin conexión.
  - Navegación por anclas: Resumen, Cultivos, Municipios y Evolución.
  - Interruptor **Ocultar caña** y vista “Otros cultivos” sin caña.
  - “Ver datos en tabla” en cada gráfico.
  - Deduplicación anual/semestral, subcategorías aditivas y 2006 marcado como parcial.
- **Notas:** no se instala Shadcn UI por defecto porque el stack inicial definió “Tailwind CSS puro”. Si se necesita un combobox con búsqueda, se evalúa una alternativa ligera más adelante. Implementado con `chart.js` 4.6.1 y `react-chartjs-2` 5.3.1. El tablero se refactorizó a una sola página con secciones y anclas; incluye KPIs de insight, composición, tendencia 2007–2025, otros cultivos sin caña, productividad t/ha, municipios, éxito de cosecha y semestres. Las agregaciones viven en `lib/aggregations.ts` con pruebas en `apps/frontend/test`. El bundle supera 500 kB por Chart.js; se puede dividir en el futuro. `typecheck`, tests y `build` pasan.

### T16 — Vista Admin y UI del Trigger ETL

- **Estado:** Hecho.
- **Depende de:** T12, T13.
- **Ola:** 7.
- **Descripción:** crear la ruta `/admin` para disparar el ETL y consultar su estado.
- **Criterios de aceptación:**
  - Formulario con input de contraseña para `ADMIN_API_KEY`.
  - La clave se mantiene solo en memoria; nunca en `localStorage` ni en el bundle.
  - `POST /api/admin/trigger` con `Authorization: Bearer`.
  - Polling de `GET /api/admin/etl/:id` cada 2–3 s hasta que el estado deje de ser `RUNNING`.
  - Visualización de estado, registros extraídos, rechazados, duración y error.
  - Tabla con los últimos logs del ETL.
  - Nota de seguridad: para producción se recomienda Cloudflare Access sobre `/admin` y `/api/admin/*`.
- **Notas:** `main.tsx` enruta `/admin` a `AdminPage`. La clave vive solo en estado React; el trigger usa Bearer, el polling es cada 2.5 s y la UI muestra diff, aplicar/omitir, historial y logs. Incluye `PendingChanges`, confirmación antes de decidir y `?force=true` para reconsiderar un hash omitido. Probado el listado: 401 sin token y 200 con token. `typecheck` y `build` pasan.

---

## Épica E — Operación

### T18 — Despliegue y CI/CD

- **Estado:** Hecho.
- **Depende de:** T14, T16, T17.
- **Ola:** 8.
- **Descripción:** publicar frontend y Worker, y automatizar verificaciones.
- **Criterios de aceptación:**
  - Frontend desplegado en Cloudflare Pages.
  - Worker desplegado con D1 remoto y secrets (`SOCRATA_APP_TOKEN`, `ADMIN_API_KEY`).
  - Cron activo en producción.
  - GitHub Actions: install, typecheck, tests, build y deploy en `main`.
  - Documentación de variables, secrets y comandos de migración.
  - Dominio personalizado opcional.
- **Notas:** Frontend en `https://agrodatos.pages.dev` y Worker en `https://agrodatos-worker-etl.jairolop88.workers.dev`. D1 remoto con migración `001_version_approval.sql` aplicada; cron activo `0 3 * * 1`. `ADMIN_API_KEY` configurada como secreto; `SOCRATA_APP_TOKEN` omitido por decisión del usuario. La versión activa es `2026.11.09-4fde9c028aae` con 25 909 registros, 107 cultivos canónicos, 57 periodos y gzip de 190 836 bytes; la anterior `2026.11.09-f61c89984492` (25 535) quedó `SUPERSEDED`. Se agregaron `ci.yml`, `deploy.yml`, `coverage.yml`, `docs/ARQUITECTURA.md` y `docs/DEPLOY.md`. La creación inicial de Pages requirió `--force`; el workflow `CI` pasó y el deploy automático sigue condicionado a `DEPLOY_ENABLED=true` y a los secrets de GitHub.

---

### T19 — Aprobación manual de versiones

- **Estado:** Hecho.
- **Depende de:** T08, T10, T16.
- **Ola:** 9.
- **Archivos:**
  - `apps/worker-etl/src/etl/diff.ts`
  - `apps/worker-etl/src/etl/coverage.ts`
  - `apps/worker-etl/src/etl/normalize.ts`
  - `apps/worker-etl/src/db/migrations/001_version_approval.sql`
  - `apps/worker-etl/src/routes/admin.ts`
  - `apps/frontend/src/components/PendingChanges.tsx`
  - `apps/frontend/src/components/AdminPage.tsx`
- **Descripción:** comparar la versión nueva con la activa y permitir aplicarla u omitirla.
- **Criterios de aceptación:**
  - Una sola versión `PENDING` a la vez.
  - Diff de altas, bajas, modificaciones, diccionarios y cultivos normalizados.
  - Aplicación atómica y conservación de la versión activa anterior.
  - Historial de versiones.
  - No re-proponer un hash omitido; `?force=true` para forzar.
- **Notas:** Implementado y verificado en producción: el ETL creó la versión `PENDING` `2026.11.09-4fde9c028aae` con diff de 374 agregados, 25 535 sin cambios, 0 modificados, 78 cultivos normalizados, 1 640 claves repetidas y periodo nuevo `2006B`; se aplicó desde la API y quedó `ACTIVE`. La versión anterior quedó `SUPERSEDED`. Omitir, forzar con `?force=true` y `NO_CHANGES` se probaron en local.

### T20 — Filtros multi-selección y tablero comparativo

- **Estado:** Hecho.
- **Depende de:** T15.
- **Ola:** 10.
- **Archivos:**
  - `apps/frontend/src/lib/aggregations.ts`
  - `apps/frontend/src/components/Filters.tsx`
  - `apps/frontend/src/components/Dashboard.tsx`
  - `apps/frontend/src/components/KpiCards.tsx`
  - `apps/frontend/src/components/charts/ProductionTrendChart.tsx`
  - `apps/frontend/src/components/sections/CultivosSection.tsx`
  - `apps/frontend/src/components/sections/ResumenSection.tsx`
  - `apps/frontend/src/components/sections/MunicipiosSection.tsx`
  - `apps/frontend/src/components/sections/EvolucionSection.tsx`
  - `apps/frontend/src/components/charts/MunicipalityChart.tsx`
  - `apps/frontend/src/components/charts/HarvestChart.tsx`
  - `apps/frontend/src/components/charts/OtherCropsChart.tsx`
  - `apps/frontend/src/styles.css`
  - `apps/frontend/test/aggregations.test.ts`
  - `README.md`, `docs/ARQUITECTURA.md`
- **Descripción:** permitir comparar varios municipios, cultivos y años, y corregir la lectura de “todos los años”.
- **Criterios de aceptación:**
  - `DashboardFilters` usa arrays `municipios`, `cultivos`, `anios`; vacío = todos.
  - Filtros multi-selección con checkboxes, resumen de selección y botón “Todos”.
  - Sin año seleccionado, las gráficas transversales agregan **2007–2025** y la dona indica **“Totalidad de años (2007–2025)”**.
  - 2006 se excluye de la totalidad comparable; si se selecciona, se marca **Datos parciales**.
  - La evolución indica el cultivo en el título; con varios cultivos muestra una línea por cultivo, leyenda y tabla.
  - Varios cultivos se reflejan en composición, “Cultivos seleccionados” y productividad.
  - Varios municipios muestran comparación de municipios seleccionados.
  - Varios años se agregan y la etiqueta indica “N años seleccionados”.
  - El interruptor de caña se bloquea solo si todos los cultivos seleccionados son caña.
  - Tests de agregaciones, typecheck y build pasan.
- **Notas:** Implementado y verificado con `pnpm --filter @agrodatos/frontend typecheck`, `test` (11 pruebas) y `build`. Los filtros usan arrays (`municipios`, `cultivos`, `anios`) y se presentan como desplegables nativos accesibles con buscador (normaliza mayúsculas y tildes). Municipios y cultivos incluyen todos por defecto con casillas desmarcadas; “Seleccionar todos” las marca y “Limpiar selección” vuelve al estado predeterminado. Años conserva “Sin año seleccionado (2007–2025)” y distingue “Todos los años”. El responsive se resuelve con `flex-wrap`, `flex-basis` y `max-width: 100%`; la barra inferior es sticky y el pie queda en el flujo normal. En móvil, los filtros se abren como panel inferior desde el botón **Filtros**. No se usó shadcn porque el proyecto no lo tiene instalado. La cabecera queda fija al hacer scroll con **AgroDatos**, el menú de secciones y resaltado de la sección mayormente visible; se ajustó `scroll-margin-top` para que las anclas no queden tapadas. Se mejoró la jerarquía de KPIs, la composición pasó a barras horizontales, los filtros activos se muestran como chips removibles y se reforzaron estados vacíos y accesibilidad. La totalidad comparable es 2007–2025 y 2006 se marca como parcial al seleccionarse. La evolución genera una línea por cultivo con leyenda y tabla; la composición, los KPIs y la productividad reflejan varios cultivos; los municipios seleccionados se comparan entre sí. El interruptor de caña solo se bloquea si todos los cultivos seleccionados son caña.

## Decisiones técnicas registradas

| Tema | Decisión |
|---|---|
| Gestor de paquetes | pnpm workspaces, Node 20+ |
| Fechas en D1 | `TEXT` ISO-8601 con `strftime` |
| Payload | `payload_gzip BLOB` (~240 KB) en lugar de `payload_json TEXT` (~4,9 MB) |
| Límite D1 | 2 MB por fila; 50 MB por resultado de consulta |
| Lectura de BLOB | D1 devuelve `number[]`; convertir a `Uint8Array` al servir |
| Hash | SHA-256 sobre `{ schema_version, dicts, data }`, sin metadatos volátiles |
| Versión activa | Índice único parcial `WHERE is_active = 1` implementado en T19 |
| Paginación Socrata | `$limit=10000`, `$offset`, `$order=:id` |
| Fuente vigente | Columnas reales: `rea_sembrada`, `rea_cosechada`, `producci_n`, `rendimiento` |
| Fuente histórica | Columnas: `rea_sembrada_ha`, `rea_cosechada_ha`, `producci_n_t`, `rendimiento_t_ha` |
| Periodos | La fuente vigente es semestral (`2019A`, `2019B`); la tupla incluye `periodo` |
| Datos faltantes | Normalizar a `0` para mantener `number` estricto |
| Validación | Fatal vs. por fila; abortar por tasa de rechazo, no por un outlier aislado |
| UI | Tailwind puro + componentes nativos; Shadcn UI solo si se justifica |
| Dexie | Lectura asíncrona con React Query o `useLiveQuery` |
| Admin | `ADMIN_API_KEY` en memoria; Cloudflare Access recomendado en producción |
| Producción | Frontend `https://agrodatos.pages.dev`; Worker `https://agrodatos-worker-etl.jairolop88.workers.dev` |
| Cron | `0 3 * * 1` (Cloudflare usa 1 = domingo; `0` es inválido) |
| Producción activa | `2026.11.09-4fde9c028aae`: 25 909 registros, 107 cultivos, 57 periodos |
| Cultivos | Clave canónica mayúsculas sin tildes (Ñ preservada); etiqueta con tildes; 172 etiquetas → 107 claves |
| 2006 | Año parcial: 374 registros, 42 municipios, 24 cultivos, periodo `2006B` |
| Aprobación | Versión `PENDING` + diff; una sola pendiente; aplicar/omitir; hash omitido no se re-propone |

---

## Ideas futuras (no comprometidas)

- Observabilidad y alertas del ETL (duración, tasa de rechazo, errores).
- Expansión a nivel nacional y estrategia de payload (R2 o chunks si crece).
- Historial de versiones y rollback desde el frontend.
- Validaciones estadísticas de outliers (IQR/z-score) en lugar de umbrales fijos.
- Autenticación más robusta para el panel admin.
- Compresión de payload con diccionarios más agresivos o formato columnar.
- Pruebas de rendimiento de las gráficas con el dataset completo.
