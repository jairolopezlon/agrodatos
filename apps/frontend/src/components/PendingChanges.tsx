import type { PendingVersion } from "@agrodatos/shared-types";

interface PendingChangesProps {
  version: PendingVersion;
  isBusy: boolean;
  onApply: () => void;
  onOmit: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  areaSembrada: "Área sembrada",
  areaCosechada: "Área cosechada",
  produccion: "Producción",
  rendimiento: "Rendimiento",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatKey(key: string): string {
  return key.replaceAll(" | ", " · ");
}

function ChangeList({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <details className="pending-list">
      <summary>
        {title} ({items.length})
      </summary>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </details>
  );
}

export function PendingChanges({
  version,
  isBusy,
  onApply,
  onOmit,
}: PendingChangesProps) {
  const summary = version.change_summary;

  return (
    <article className="pending-card">
      <header>
        <h3>Propuesta de actualización</h3>
        <p>
          {formatDate(version.created_at)} ·{" "}
          {formatNumber(version.total_records)} registros en total
        </p>
      </header>

      {summary ? (
        <>
          <p className="pending-total">
            Actualmente hay{" "}
            <strong>{formatNumber(summary.active_total_records)}</strong>{" "}
            registros publicados. La propuesta tendría{" "}
            <strong>{formatNumber(summary.new_total_records)}</strong>.
          </p>

          <div className="pending-summary">
            <div>
              <strong>{formatNumber(summary.added)}</strong>
              <span>registros nuevos</span>
            </div>
            <div>
              <strong>{formatNumber(summary.modified)}</strong>
              <span>registros actualizados</span>
            </div>
            <div>
              <strong>{formatNumber(summary.removed)}</strong>
              <span>registros eliminados</span>
            </div>
            <div>
              <strong>{formatNumber(summary.unchanged)}</strong>
              <span>sin cambios</span>
            </div>
          </div>

          <div className="pending-lists">
            <ChangeList
              title="Municipios nuevos"
              items={summary.added_municipios}
            />
            <ChangeList
              title="Municipios eliminados"
              items={summary.removed_municipios}
            />
            <ChangeList
              title="Cultivos nuevos"
              items={summary.added_cultivos}
            />
            <ChangeList
              title="Cultivos eliminados"
              items={summary.removed_cultivos}
            />
            <ChangeList
              title="Periodos nuevos"
              items={summary.added_periodos}
            />
            <ChangeList
              title="Periodos eliminados"
              items={summary.removed_periodos}
            />
          </div>

          {summary.normalized_cultivos.length > 0 && (
            <details className="pending-list">
              <summary>
                Nombres de cultivos unificados (
                {summary.normalized_cultivos.length})
              </summary>
              <table>
                <thead>
                  <tr>
                    <th>Antes</th>
                    <th>Ahora</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.normalized_cultivos.map((item) => (
                    <tr key={item.key}>
                      <td>{item.from.join(" / ")}</td>
                      <td>{item.to}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}

          {summary.sample_changes.length > 0 && (
            <details className="pending-list">
              <summary>
                Cambios de valores ({summary.sample_changes.length})
              </summary>
              <table>
                <thead>
                  <tr>
                    <th>Registro</th>
                    <th>Dato</th>
                    <th>Antes</th>
                    <th>Ahora</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.sample_changes.map((item, index) => (
                    <tr key={`${item.key}-${item.field}-${index}`}>
                      <td>{formatKey(item.key)}</td>
                      <td>{FIELD_LABELS[item.field] ?? item.field}</td>
                      <td>{formatNumber(item.from)}</td>
                      <td>{formatNumber(item.to)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}

          <details className="advanced-options">
            <summary>Detalles técnicos</summary>
            <p className="muted-small">
              Código de la propuesta: {version.version_id}
            </p>
            {summary.duplicate_keys > 0 && (
              <p>
                Registros con la misma combinación municipio/cultivo/periodo:{" "}
                {formatNumber(summary.duplicate_keys)}. Se agrupan para el
                resumen; no se pierden.
              </p>
            )}
            {summary.schema_version_changed && (
              <p>La estructura interna de los datos cambió.</p>
            )}
          </details>
        </>
      ) : (
        <p>No hay un resumen de cambios disponible.</p>
      )}

      <div className="pending-actions">
        <button
          type="button"
          className="button-primary"
          onClick={onApply}
          disabled={isBusy}
        >
          Publicar cambios
        </button>
        <button
          type="button"
          className="button-secondary"
          onClick={onOmit}
          disabled={isBusy}
        >
          Descartar
        </button>
      </div>
    </article>
  );
}
