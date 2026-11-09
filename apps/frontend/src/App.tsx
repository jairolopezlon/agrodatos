import { Dashboard } from "./components/Dashboard";
import { UnsupportedSchemaVersionError, useAgroData } from "./hooks/useAgroData";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

export function App() {
  const { activeVersion, payload, versionQuery, payloadQuery } = useAgroData();

  if (versionQuery.isLoading || payloadQuery.isLoading) {
    return (
      <main>
        <p>Cargando datos...</p>
      </main>
    );
  }

  if (versionQuery.isError || payloadQuery.isError) {
    const error = versionQuery.error ?? payloadQuery.error;
    const message =
      error instanceof UnsupportedSchemaVersionError
        ? error.message
        : "No se pudieron cargar los datos. Revisa tu conexión.";

    return (
      <main>
        <p role="alert">{message}</p>
      </main>
    );
  }

  if (!activeVersion) {
    return (
      <main>
        <p>No hay una versión de datos activa.</p>
      </main>
    );
  }

  if (!payload) {
    return (
      <main>
        <p>Preparando datos...</p>
      </main>
    );
  }

  const municipios = Object.keys(payload.dicts.municipios).length;
  const cultivos = Object.keys(payload.dicts.cultivos).length;
  const periodos = Object.keys(payload.dicts.periodos).length;

  return (
    <main>
      <header>
        <h1>AgroDatos</h1>
        <p>Valle del Cauca · versión {activeVersion.version_id}</p>
      </header>

      <section className="summary" aria-label="Resumen de datos">
        <article>
          <strong>{formatNumber(payload.metadata.total_records)}</strong>
          <span>Registros</span>
        </article>
        <article>
          <strong>{formatNumber(municipios)}</strong>
          <span>Municipios</span>
        </article>
        <article>
          <strong>{formatNumber(cultivos)}</strong>
          <span>Cultivos</span>
        </article>
        <article>
          <strong>{formatNumber(periodos)}</strong>
          <span>Periodos</span>
        </article>
      </section>

      <Dashboard key={activeVersion.version_id} payload={payload} />
    </main>
  );
}
