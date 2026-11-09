import type { CompressedAgroPayload } from "@agrodatos/shared-types";
import { useMemo } from "react";

export interface FilterState {
  municipio: string;
  cultivo: string;
  anio: string;
}

interface FiltersProps {
  payload: CompressedAgroPayload;
  value: FilterState;
  onChange: (value: FilterState) => void;
  hideCane: boolean;
  caneDisabled?: boolean;
  onToggleCane: (hideCane: boolean) => void;
  onReset: () => void;
  hasActiveFilters: boolean;
}

export function Filters({
  payload,
  value,
  onChange,
  hideCane,
  caneDisabled = false,
  onToggleCane,
  onReset,
  hasActiveFilters,
}: FiltersProps) {
  const municipios = useMemo(
    () =>
      Object.entries(payload.dicts.municipios).sort((a, b) =>
        a[1].localeCompare(b[1], "es"),
      ),
    [payload],
  );
  const cultivos = useMemo(
    () =>
      Object.entries(payload.dicts.cultivos).sort((a, b) =>
        a[1].localeCompare(b[1], "es"),
      ),
    [payload],
  );
  const anios = useMemo(
    () =>
      [...new Set(payload.data.map((tuple) => tuple[3]))].sort(
        (a, b) => a - b,
      ),
    [payload],
  );

  return (
    <section className="filters-card" aria-label="Filtros de datos">
      <div className="filters">
        <label>
          Municipio
          <select
            value={value.municipio}
            onChange={(event) =>
              onChange({ ...value, municipio: event.target.value })
            }
          >
            <option value="all">Todos</option>
            {municipios.map(([index, name]) => (
              <option key={index} value={index}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Cultivo
          <select
            value={value.cultivo}
            onChange={(event) =>
              onChange({ ...value, cultivo: event.target.value })
            }
          >
            <option value="all">Todos</option>
            {cultivos.map(([index, name]) => (
              <option key={index} value={index}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Año
          <select
            value={value.anio}
            onChange={(event) =>
              onChange({ ...value, anio: event.target.value })
            }
          >
            <option value="all">Todos</option>
            {anios.map((anio) => (
              <option key={anio} value={String(anio)}>
                {anio === 2006 ? "2006 (parcial)" : anio}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="filter-actions">
        <label className="cane-toggle">
          <input
            type="checkbox"
            checked={hideCane}
            disabled={caneDisabled}
            onChange={(event) => onToggleCane(event.target.checked)}
          />
          {caneDisabled
            ? "Caña seleccionada"
            : hideCane
              ? "Ver todo (incluir caña)"
              : "Ocultar caña"}
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            className="button-secondary filter-reset"
            onClick={onReset}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <p className="data-note">
        Historial comparable: 2007–2025. 2006 fue un reporte parcial piloto.
        La caña concentra la mayor parte de la producción.
      </p>
    </section>
  );
}
