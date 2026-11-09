import { Dashboard } from "./components/Dashboard";
import { UnsupportedSchemaVersionError, useAgroData } from "./hooks/useAgroData";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function App() {
  const { activeVersion, payload, versionQuery, payloadQuery } = useAgroData();

  if (versionQuery.isLoading || payloadQuery.isLoading) {
    return (
      <main>
        <div className="loading-state">Cargando datos...</div>
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
        <div className="alert alert-error" role="alert">
          {message}
        </div>
        <button
          type="button"
          className="button-secondary"
          onClick={() => {
            void versionQuery.refetch();
            void payloadQuery.refetch();
          }}
        >
          Reintentar
        </button>
      </main>
    );
  }

  if (!activeVersion) {
    return (
      <main>
        <div className="empty-state">
          <p>Todavía no hay datos publicados.</p>
          <p>Vuelve más tarde.</p>
        </div>
      </main>
    );
  }

  if (!payload) {
    return (
      <main>
        <div className="loading-state">Preparando datos...</div>
      </main>
    );
  }

  return (
    <main>
      <header>
        <h1>AgroDatos</h1>
        <p>
          Datos del Valle del Cauca · Actualizados el{" "}
          {formatDate(activeVersion.created_at)}
        </p>
      </header>

      <Dashboard key={activeVersion.version_id} payload={payload} />
    </main>
  );
}
