import { useId, useState, type ReactNode } from "react";

export interface ChartTable {
  columns: string[];
  rows: string[][];
}

interface ChartCardProps {
  title: string;
  insight?: string;
  children: ReactNode;
  table?: ChartTable;
  empty?: boolean;
  emptyMessage?: string;
  error?: string;
  onResetFilters?: () => void;
  footnote?: string;
  chartAriaLabel: string;
  className?: string;
}

export function ChartCard({
  title,
  insight,
  children,
  table,
  empty = false,
  emptyMessage = "No hay datos para los filtros seleccionados.",
  error,
  onResetFilters,
  footnote,
  chartAriaLabel,
  className,
}: ChartCardProps) {
  const titleId = useId();
  const [showTable, setShowTable] = useState(false);

  return (
    <section
      className={`chart-card${className ? ` ${className}` : ""}`}
      aria-labelledby={titleId}
    >
      <div className="chart-card-header">
        <div>
          <h3 id={titleId}>{title}</h3>
          {insight && <p className="chart-insight">{insight}</p>}
        </div>

        {table && !empty && !error && (
          <button
            type="button"
            className="chart-table-toggle"
            aria-expanded={showTable}
            onClick={() => setShowTable((visible) => !visible)}
          >
            {showTable ? "Ver gráfico" : "Ver datos en tabla"}
          </button>
        )}
      </div>

      {error ? (
        <div className="chart-error" role="alert">
          <p className="chart-state-title">
            No se pudo mostrar este gráfico
          </p>
          <p className="chart-state-message">{error}</p>
          {onResetFilters && (
            <button
              type="button"
              className="button-secondary filter-reset"
              onClick={onResetFilters}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : empty ? (
        <div className="empty-state" role="status">
          <p className="chart-state-title">
            Sin resultados para esta selección
          </p>
          <p className="chart-state-message">{emptyMessage}</p>
          {onResetFilters && (
            <button
              type="button"
              className="button-secondary filter-reset"
              onClick={onResetFilters}
            >
              Limpiar filtros
            </button>
          )}
        </div>
      ) : showTable && table ? (
        <div className="chart-table-wrapper">
          <table>
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                {table.columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {table.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div
          className="chart-container"
          role="img"
          aria-label={chartAriaLabel}
        >
          {children}
        </div>
      )}

      {footnote && <p className="chart-footnote">{footnote}</p>}
    </section>
  );
}
