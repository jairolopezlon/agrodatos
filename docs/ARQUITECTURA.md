# Arquitectura de AgroDatos

## Stack utilizado

| Capa | Tecnología | Uso |
|---|---|---|
| Backend | Cloudflare Workers | Ejecución en el Edge |
| Framework API | Hono | Rutas públicas y admin |
| Base de datos | Cloudflare D1 | Logs, versiones y payload gzip |
| Frontend | React 19 + Vite | PWA y panel admin |
| Estado remoto | TanStack Query | Consultas y caché |
| Estado offline | Dexie.js | IndexedDB local |
| Gráficas | Chart.js + react-chartjs-2 | Visualización agregada |
| PWA | vite-plugin-pwa + Workbox | Instalación y offline |
| Tipos | TypeScript + `@agrodatos/shared-types` | Contratos compartidos |
| Pruebas | `node:test` + `--experimental-strip-types` | Unitarias y smoke |
| Monorepo | pnpm workspaces | Frontend, Worker y tipos |
| CI/CD | GitHub Actions | Checks, deploy y cobertura |
| Hosting | Cloudflare Pages + Workers | Frontend y API |

## Fuentes de datos

| Fuente | Dataset | Nacional | Valle | Años |
|---|---|---:|---:|---|
| Histórica EVA | `2pnw-mmge` | 206.068 | 15.774 | 2006–2018 |
| Vigente EVA | `uejq-wxrr` | 166.732 | 10.589 | 2019–2025 |
| Total | | 372.800 | 26.363 | |

El filtro es siempre `c_d_dep=76` o `c_digo_dane_departamento=76`. No se procesan otras regiones.

## Arquitectura general

```mermaid
flowchart LR
  S[(Socrata)] --> E[Worker ETL]
  Cron[Cron / Admin] --> E
  E --> D1[(D1)]
  D1 --> API[API Hono]
  API --> PWA[React PWA]
  PWA --> Dexie[(Dexie)]
  PWA --> Charts[Chart.js]
  AdminUI["/admin"] --> API
  GH[GitHub Actions] --> E
  GH --> Pages[Cloudflare Pages]
  Pages --> PWA
```

## Flujo ETL y aprobación

```mermaid
flowchart TD
  A[Crear etl_log RUNNING] --> B[Extraer histórica 2pnw-mmge]
  A --> C[Extraer vigente uejq-wxrr]
  B --> D[Validar cobertura]
  C --> D
  D --> E{Cobertura fatal?}
  E -- Sí --> F[Log FAILED]
  E -- No --> G[Validar filas]
  G --> H{Fatal?}
  H -- Sí --> F
  H -- No --> I[Transformar y normalizar cultivos]
  I --> J[Hash SHA-256 + gzip]
  J --> K{Hash igual a activa?}
  K -- Sí --> L[Log SUCCESS / NO_CHANGES]
  K -- No --> M[Calcular diff]
  M --> N[Guardar versión PENDING]
  N --> O[Log SUCCESS / PENDING_CREATED]
  O --> P[Admin revisa /admin]
  P --> Q{Aplicar?}
  Q -- Sí --> R[Activar versión]
  Q -- No --> S[Marcar DISCARDED]
```

### Normalización de cultivos

```mermaid
flowchart LR
  A[Etiquetas crudas] --> B[Clave canónica]
  A --> C[Etiqueta visible]
  B --> D[Mayúsculas + sin tildes + Ñ]
  C --> E[Mayúsculas + tildes]
  D --> F[Diccionario único]
  E --> F
  F --> G[Tuplas por índice]
```

- Clave: `CAFE`, `MAIZ`, `TOMATE DE ARBOL`.
- Etiqueta: `CAFÉ`, `MAÍZ`, `TOMATE DE ÁRBOL`.
- Se unifican variantes como `CAFE`/`Café` y `REPOLLO`/`Repollo`.

## Modelo de datos

```mermaid
erDiagram
  etl_logs {
    INTEGER id PK
    DATETIME started_at
    DATETIME completed_at
    TEXT status
    TEXT trigger_source
    INTEGER records_extracted
    INTEGER records_rejected
    TEXT error_message
    TEXT validation_report
    INTEGER execution_time_ms
  }

  data_versions {
    TEXT version_id PK
    DATETIME created_at
    INTEGER schema_version
    TEXT hash
    INTEGER total_records
    BLOB payload_gzip
    INTEGER is_active
    TEXT status
    TEXT change_summary
    DATETIME applied_at
    DATETIME discarded_at
    INTEGER etl_log_id FK
  }

  etl_logs ||--o{ data_versions : "genera"
```

Estados de `data_versions.status`:

```mermaid
stateDiagram-v2
  [*] --> PENDING: ETL detecta cambios
  PENDING --> ACTIVE: Admin aplica
  PENDING --> DISCARDED: Admin omite
  PENDING --> SUPERSEDED: Nueva ejecución
  ACTIVE --> SUPERSEDED: Se activa otra versión
  DISCARDED --> [*]
  SUPERSEDED --> [*]
```

## Aprobación manual

```mermaid
sequenceDiagram
  participant Admin
  participant UI as Panel admin
  participant API as Worker API
  participant D1

  Admin->>UI: Introduce ADMIN_API_KEY
  Admin->>UI: Disparar ETL
  UI->>API: POST /api/admin/trigger
  API->>D1: Crear etl_log RUNNING
  API-->>UI: 202 etl_log_id
  loop Polling
    UI->>API: GET /api/admin/etl/:id
    API->>D1: Leer log
    API-->>UI: RUNNING / SUCCESS
  end
  UI->>API: GET /api/admin/pending
  API->>D1: Leer PENDING + change_summary
  API-->>UI: Diff
  Admin->>UI: Aplicar u Omitir
  UI->>API: POST /api/admin/pending/:id/apply
  API->>D1: Batch activar + superseder
  API-->>UI: applied true
```

Reglas:

- Solo una versión `PENDING` a la vez.
- Una nueva ejecución marca la pendiente anterior como `SUPERSEDED`.
- Si un hash fue omitido, no se vuelve a proponer.
- `?force=true` permite forzar una nueva comparación.
- La versión activa no cambia hasta que el admin aplica.
- La fuente tiene 1.640 registros con clave repetida; el diff los empareja por valores y las gráficas los agregan.

## Sincronización offline

```mermaid
sequenceDiagram
  participant PWA
  participant API as Worker API
  participant IDB as Dexie
  participant Chart as Chart.js

  PWA->>API: GET /api/version
  API-->>PWA: version_id + hash + schema_version
  PWA->>IDB: Leer versión/payload cacheado
  alt Cache válido
    IDB-->>PWA: payload
  else Sin cache o hash cambió
    PWA->>API: GET /api/data/:versionId
    API-->>PWA: gzip con Content-Encoding
    PWA->>IDB: Guardar metadata + payload
    PWA->>IDB: Podar versiones antiguas
  end
  PWA->>Chart: Agregar y renderizar
```

Estrategias PWA:

- `NetworkFirst` para `/api/version`.
- `CacheFirst` para `/api/data/*`.
- Precache del app shell.
- Sin caché para `/api/admin/*`.

## Tablero público

```mermaid
flowchart LR
  F["Filtros multi-selección:<br/>municipios · cultivos · años"] --> A[Agregaciones]
  C[Toggle: ocultar caña] --> A
  A --> K[KPIs]
  A --> CO[Composición]
  A --> T[Tendencia 2007–2025]
  A --> O[Otros cultivos sin caña]
  A --> P[Productividad t/ha]
  A --> M[Municipios comparados]
  A --> H[Cosecha]
  A --> S[Semestres]
```

Reglas:

- Cabecera fija con **AgroDatos** y menú de secciones **Resumen**, **Cultivos**, **Municipios** y **Evolución**.
- En móvil (≤768 px), filtros, KPIs y gráficos usan `flex-wrap`, `flex-basis` y `max-width: 100%`; las secciones pasan a una barra inferior sticky con botón **Filtros** que abre un panel inferior. El pie queda en el flujo normal, sin solaparse.
- Filtros globales multi-selección en desplegables con buscador insensible a mayúsculas y tildes: **Municipios** y **Cultivos** incluyen todos por defecto, con “Seleccionar todos” y “Limpiar selección”; **Años** usa “Sin año seleccionado” para agregar la totalidad comparable 2007–2025.
- Cada filtro muestra un resumen de selección y un contador cuando hay selección parcial; **Limpiar filtros** restablece todo el tablero.
- Sin año seleccionado, las gráficas transversales agregan la **totalidad comparable 2007–2025** y la composición lo indica.
- Varios años se agregan y la etiqueta muestra **“N años seleccionados”**.
- Varios municipios activan la comparación de municipios seleccionados (producción y participación).
- Varios cultivos se reflejan en composición, KPIs, productividad y una línea por cultivo en la evolución, con leyenda y tabla.
- La evolución siempre cubre 2007–2025 e indica el cultivo en el título cuando hay uno seleccionado.
- 2006 se excluye de la totalidad y de la tendencia; si se selecciona, se marca **Datos parciales**.
- Deduplicación anual/semestral por `(municipio, cultivo, año)`: se usa el registro anual si existe.
- Las subcategorías del mismo cultivo y periodo se suman.
- Rendimiento ponderado = `sum(produccion) / sum(areaCosechada)`.
- Los KPIs usan rótulos breves, destacan el valor y dejan periodo/contexto como texto secundario.
- La composición usa barras horizontales (mejor comparación del resto frente a la caña) y mantiene la alternativa tabular.
- Los filtros activos se muestran como etiquetas removibles y hay una acción visible para limpiarlos.
- La navegación resalta la sección con mayor área visible dentro del viewport.
- Cada `ChartCard` incluye **Ver datos en tabla** y un estado vacío con **Limpiar filtros**.
- El interruptor **Ocultar caña** recalcula el panorama sin caña; se bloquea solo si todos los cultivos seleccionados son caña.
- El gráfico “Otros cultivos” siempre excluye la caña y los cultivos seleccionados.
- La coincidencia del buscador normaliza mayúsculas y tildes y muestra un estado vacío cuando no hay resultados.

## Cobertura de fuentes

```mermaid
flowchart TD
  A[Script coverage] --> B[Departamentos distintos]
  A --> C[Municipios distintos]
  A --> D[Años y cultivos]
  B --> E{Código 76 y nombre canónico?}
  C --> F{42 municipios y suma total?}
  D --> G{Años 2006–2025 y 42 municipios por año?}
  E --> H[Reporte]
  F --> H
  G --> H
  H --> I[--strict contra snapshot]
```

- Estructural: valida invariantes.
- `--strict`: compara contra `coverage.snapshot.json`.
- `--update`: regenera el snapshot.
- Workflow manual `Coverage` con input `strict`.

## Despliegue y CI

```mermaid
flowchart LR
  Dev["git push main"] --> CI["CI: install / typecheck / tests / build"]
  CI --> Deploy{"DEPLOY_ENABLED?"}
  Deploy -- No --> Skip["Deploy omitido"]
  Deploy -- Sí --> W[Deploy Worker]
  W --> D1[(D1 remoto)]
  W --> Cron["Cron 0 3 * * 1"]
  W --> P["Deploy Pages"]
  P --> PWA[PWA]
  Cover["Coverage manual"] --> Socrata["Socrata"]
```

## Comandos clave

```bash
pnpm dev
pnpm typecheck
pnpm --filter @agrodatos/worker-etl test
pnpm --filter @agrodatos/frontend test
pnpm --filter @agrodatos/worker-etl smoke
pnpm --filter @agrodatos/worker-etl coverage
pnpm --filter @agrodatos/worker-etl coverage:strict
pnpm --filter @agrodatos/worker-etl coverage:update
pnpm build
```

## Seguridad

- `ADMIN_API_KEY` en memoria; nunca en `localStorage`.
- Bearer + comparación constante sobre SHA-256.
- Cloudflare Access recomendado para `/admin` y `/api/admin/*`.
- URLs de datos inmutables y públicas.
- `payload_gzip` bajo el límite de 2 MB por fila de D1.
