import type { PendingVersion } from "@agrodatos/shared-types";

interface PendingChangesProps {
  version: PendingVersion;
  isBusy: boolean;
  onApply: () => void;
  onOmit: () => void;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("es-CO").format(value);
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
        <h3>Versión pendiente {version.version_id}</h3>
        <p>
          {new Date(version.created_at).toLocaleString("es-CO")} ·{" "}
          {formatNumber(version.total_records)} registros
        </p>
      </header>

      {summary ? (
        <>
          <div className="pending-summary">
            <span>Activa: {formatNumber(summary.active_total_records)}</span>
            <span>Nueva: {formatNumber(summary.new_total_records)}</span>
            <span>Agregados: {formatNumber(summary.added)}</span>
            <span>Eliminados: {formatNumber(summary.removed)}</span>
            <span>Modificados: {formatNumber(summary.modified)}</span>
            <span>Sin cambios: {formatNumber(summary.unchanged)}</span>
          </div>

          {summary.duplicate_keys > 0 && (
            <p className="pending-warning">
              Registros con clave repetida: {summary.duplicate_keys}
            </p>
          )}

          {summary.schema_version_changed && (
            <p className="pending-warning">Cambió schema_version.</p>
          )}

          <div className="pending-lists">
            <ChangeList
              title="Municipios agregados"
              items={summary.added_municipios}
            />
            <ChangeList
              title="Municipios eliminados"
              items={summary.removed_municipios}
            />
            <ChangeList
              title="Cultivos agregados"
              items={summary.added_cultivos}
            />
            <ChangeList
              title="Cultivos eliminados"
              items={summary.removed_cultivos}
            />
            <ChangeList
              title="Periodos agregados"
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
                Cultivos normalizados ({summary.normalized_cultivos.length})
              </summary>
              <table>
                <thead>
                  <tr>
                    <th>Clave</th>
                    <th>Antes</th>
                    <th>Ahora</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.normalized_cultivos.map((item) => (
                    <tr key={item.key}>
                      <td>{item.key}</td>
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
                Muestra de cambios ({summary.sample_changes.length})
              </summary>
              <table>
                <thead>
                  <tr>
                    <th>Registro</th>
                    <th>Campo</th>
                    <th>Antes</th>
                    <th>Ahora</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.sample_changes.map((item, index) => (
                    <tr key={`${item.key}-${item.field}-${index}`}>
                      <td>{item.key}</td>
                      <td>{item.field}</td>
                      <td>{formatNumber(item.from)}</td>
                      <td>{formatNumber(item.to)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </details>
          )}
        </>
      ) : (
        <p>Sin resumen de cambios disponible.</p>
      )}

      <div className="pending-actions">
        <button type="button" onClick={onApply} disabled={isBusy}>
          Aplicar cambios
        </button>
        <button type="button" onClick={onOmit} disabled={isBusy}>
          Omitir
        </button>
      </div>
    </article>
  );
}
