# Funcionalidades de AgroDatos

Inventario de capacidades implementadas en la plataforma. Para el detalle técnico y los diagramas de flujo, consulta [ARQUITECTURA.md](ARQUITECTURA.md); para despliegue y secretos, [DEPLOY.md](DEPLOY.md).

## Alcance de datos

- Consume dos datasets de Socrata:
  - EVA histórica (`2pnw-mmge`), años 2006–2018.
  - EVA vigente (`uejq-wxrr`), años 2019–2025.
- Filtra únicamente el Valle del Cauca (código `76`).
- Procesa 26.363 registros extraídos y 25.909 aceptados.
- Cubre 42 municipios, 107 cultivos normalizados y 57 periodos.
- 2006 se trata como año parcial piloto: 374 registros, 24 cultivos y solo el periodo `2006B`.
- La interfaz está en español.

## Tablero público

### Navegación

- Cabecera fija con **AgroDatos** y secciones **Resumen**, **Cultivos**, **Municipios** y **Evolución**.
- Resaltado automático de la sección con mayor área visible.
- En móvil, barra inferior sticky con accesos a secciones y botón **Filtros**.
- Panel inferior de filtros con backdrop, cierre con `Escape` o botón y bloqueo temporal del scroll.
- Enlaces con desplazamiento suave y margen de scroll para no quedar tapados por la cabecera.

### Filtros

- Multi-selección de municipios, cultivos y años.
- Buscador dentro de cada menú, insensible a mayúsculas y tildes.
- Mensaje “No se encontraron opciones” cuando la búsqueda no tiene coincidencias.
- Municipios y cultivos incluyen todos por defecto, con las casillas desmarcadas.
- Acciones **Seleccionar todos** y **Limpiar selección**.
- Resumen y contador de selección parcial.
- Chips de filtros activos con eliminación individual.
- Botón **Limpiar filtros** para volver al estado predeterminado.
- Años con estado predeterminado **Sin año seleccionado (2007–2025)**.
- Acciones **Sin año** y **Todos los años**.
- 2006 se marca como **Datos parciales** cuando se selecciona.
- Interruptor **Ocultar caña**, bloqueado solo si todos los cultivos seleccionados son caña.

### Tarjetas KPI

- Producción total.
- Cultivo principal o cultivos seleccionados.
- Municipio principal o municipios seleccionados.
- Productividad promedio.
- Periodo y contexto como texto secundario.
- Insignia de datos parciales cuando aplica.

### Visualizaciones

- Composición de la producción por cultivo o municipio, en barras horizontales.
- Tendencia anual 2007–2025; una línea por cultivo cuando hay varios seleccionados.
- Otros cultivos sin caña, excluyendo también los cultivos seleccionados.
- Productividad t/ha por cultivo o municipio.
- Ranking y comparación de municipios.
- Porcentaje del área sembrada efectivamente cosechada.
- Comparación semestral A/B para 2019–2025.
- Tabla de datos en cada gráfico.
- Insights, notas, unidades y periodo visibles.
- Estados vacíos con acción para limpiar filtros.
- Alternativa tabular y etiquetas ARIA en las gráficas.

### Reglas de agregación

- Deduplicación anual/semestral por municipio, cultivo y año.
- Se prioriza el registro anual cuando existen ambos.
- Las subcategorías del mismo cultivo y periodo se suman.
- Rendimiento ponderado = producción / área cosechada.
- Totalidad comparable 2007–2025.
- 2006 se excluye de la totalidad y de la tendencia, salvo selección explícita.
- Varios años se agregan y la etiqueta indica “N años seleccionados”.
- Comparación entre varios municipios, cultivos y años.
- “Otros cultivos” excluye la caña y los cultivos seleccionados.

### Accesibilidad y UX

- Navegación por teclado y foco visible.
- Etiquetas ARIA en navegación, gráficos y controles.
- Tablas alternativas para todas las gráficas.
- Objetivos táctiles en móvil.
- Layout responsive con `flex-wrap`, `flex-basis` y `max-width: 100%`.
- Diálogo **Fuente de datos** con datasets, conteos, tratamiento de 2006 y licencia.

## PWA y modo offline

- PWA instalable con manifest, iconos y `display: standalone`.
- Service worker con:
  - `NetworkFirst` para `/api/version`.
  - `CacheFirst` para `/api/data/*`.
  - Precache del app shell.
  - Sin caché para rutas administrativas.
- Caché local con Dexie/IndexedDB:
  - Guarda la versión activa y la anterior.
  - Elimina versiones antiguas.
  - Reutiliza el payload si coinciden hash y `schema_version`.
- Consultas y caché remota con TanStack Query.
- Fallback a la versión cacheada cuando falla la red.
- Aviso de actualización del service worker.
- Manejo de `schema_version` incompatible.
- Estados de carga, error con reintento, ausencia de versión activa y “sin datos publicados”.

## Panel administrativo (`/admin`)

- Clave API en memoria, sin persistencia en `localStorage`.
- Mostrar y ocultar la clave.
- Consulta de la versión activa y sus metadatos.
- Disparo manual del ETL, con opción `force`.
- Polling del estado de la ejecución.
- Visualización de la última ejecución y advertencias de cobertura.
- Revisión de cambios pendientes:
  - Altas, bajas, modificaciones y registros sin cambios.
  - Municipios, cultivos y periodos nuevos o eliminados.
  - Cultivos normalizados.
  - Muestra de cambios de campos.
  - Claves duplicadas y cambio de `schema_version`.
- Aplicar u omitir una versión pendiente.
- Historial de versiones con estados.
- Actividad reciente y logs del ETL.
- Mensajes de error amigables para 401, 403 y 5xx.

## API y Worker

- API Hono con endpoints:
  - `GET /api/health`
  - `GET /api/version` con ETag y 304.
  - `GET|HEAD /api/data/:versionId` con gzip, ETag y caché inmutable.
  - `POST /api/admin/trigger`
  - `GET /api/admin/etl/:id`
  - `GET /api/admin/etl`
  - `GET /api/admin/pending`
  - `POST /api/admin/pending/:versionId/apply`
  - `POST /api/admin/pending/:versionId/omit`
  - `GET /api/admin/versions`
- Autenticación Bearer para admin con comparación constante sobre SHA-256.
- CORS configurable por `PAGES_ORIGIN`, con soporte para localhost.
- Cron semanal: domingo 03:00 UTC.
- Trigger manual seguro.

## ETL y calidad de datos

- Extracción paginada de Socrata con `$limit`, `$offset` y `$order=:id`.
- Reintentos, timeout y token opcional de Socrata.
- Validación de cobertura:
  - Mínimo 20.000 registros.
  - 42 municipios.
  - Años 2006–2025.
  - Mínimo 42 municipios y 20 cultivos por año.
  - Advertencia si hay menos de 50 cultivos por año.
- Validación de filas:
  - `areaCosechada <= areaSembrada`.
  - Valores no negativos.
  - Año dentro de rango.
  - Código de municipio de 5 dígitos que empieza por 76.
  - Nombre de municipio y cultivo no vacíos.
  - Área sembrada máxima de 150.000.
  - Tasa de rechazo máxima del 5 %.
  - Validación estructural.
- Normalización de cultivos:
  - Clave canónica sin tildes, preservando la Ñ.
  - Etiqueta visible con tildes.
  - Unificación de variantes.
- Transformación a diccionarios y tuplas posicionales.
- Hash SHA-256 determinista.
- Compresión gzip.
- Identificador de versión `YYYY.MM.DD-hash`.
- Diff entre versión activa y nueva.
- Manejo de claves duplicadas sin pérdida de datos.

## Versionado y aprobación

- El ETL no activa cambios automáticamente.
- Estados: `PENDING`, `ACTIVE`, `DISCARDED`, `SUPERSEDED`.
- Solo una versión `PENDING` a la vez.
- Una nueva ejecución reemplaza la pendiente anterior.
- Una versión omitida no se vuelve a proponer, salvo `?force=true`.
- Activación atómica y conservación de la versión anterior.
- Índice único parcial para garantizar una sola versión activa.
- Decisiones del ETL:
  - `NO_CHANGES`
  - `PENDING_CREATED`
  - `DISCARDED_HASH_MATCH`
  - `FAILED`

## Operación, pruebas y CI/CD

- Schema D1 y migración de aprobación.
- Despliegue manual y automatizado a Workers y Pages.
- Secretos: `ADMIN_API_KEY` y `SOCRATA_APP_TOKEN`.
- CI con install, typecheck, tests y build.
- Deploy condicionado por `DEPLOY_ENABLED`.
- Workflow manual de cobertura con modo estricto.
- 41 pruebas backend y 11 pruebas frontend.
- Smoke real contra Socrata.
- Snapshot de cobertura.
- Documentación de despliegue, migraciones y secretos.

## Monorepo y contratos

- pnpm workspaces.
- `@agrodatos/shared-types` con DTOs compartidos.
- Frontend React 19 + Vite + Chart.js.
- Worker Cloudflare + Hono + D1.
- TypeScript en todo el monorepo.

## Límites conocidos

- No hay autenticación de usuarios públicos.
- La clave admin vive solo en memoria y no hay sesión persistente.
- El filtrado y las agregaciones ocurren en el cliente sobre el payload completo.
- Solo se cubre Valle del Cauca y los años 2006–2025.
- No hay exportación de datos a CSV o Excel.
- No hay backups o restauración automática documentados.
- No hay pruebas E2E de navegador ni auditoría automatizada de accesibilidad o performance.
- La aplicación está solo en español y no tiene modo oscuro.
