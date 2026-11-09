import { UnsupportedSchemaVersionError, useAgroData } from "./hooks/useAgroData";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

export function App() {
  const { activeVersion, payload, versionQuery, payloadQuery } = useAgroData();

  if (versionQuery.isLoading || payloadQuery.isLoading) {
    return <p>Cargando datos...</p>;
  }

  if (versionQuery.isError || payloadQuery.isError) {
    const error = versionQuery.error ?? payloadQuery.error;
    const message =
      error instanceof UnsupportedSchemaVersionError
        ? error.message
        : "No se pudieron cargar los datos. Revisa tu conexión.";

    return <p role="alert">{message}</p>;
  }

  if (!activeVersion) {
    return <p>No hay una versión de datos activa.</p>;
  }

  if (!payload) {
    return <p>Preparando datos...</p>;
  }

  const municipios = Object.keys(payload.dicts.municipios).length;
  const cultivos = Object.keys(payload.dicts.cultivos).length;
  const periodos = Object.keys(payload.dicts.periodos).length;

  return (
    <main>
      <h1>AgroDatos</h1>
      <p>Versión activa: {activeVersion.version_id}</p>
      <p>Registros: {formatNumber(payload.metadata.total_records)}</p>
      <p>Municipios: {formatNumber(municipios)}</p>
      <p>Cultivos: {formatNumber(cultivos)}</p>
      <p>Periodos: {formatNumber(periodos)}</p>
    </main>
  );
}
