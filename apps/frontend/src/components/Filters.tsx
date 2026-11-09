import type { CompressedAgroPayload } from "@agrodatos/shared-types";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { DashboardFilters } from "../lib/aggregations";

export type FilterState = DashboardFilters;

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

interface MultiSelectProps {
  legend: string;
  options: Array<[string, string]>;
  selected: string[];
  onChange: (values: string[]) => void;
  emptySummary: string;
  mode?: "list" | "years";
}

interface FilterChipProps {
  label: string;
  onRemove: () => void;
}

interface ChipListProps {
  values: string[];
  labels: Map<string, string>;
  noun: string;
  onRemove: (value: string) => void;
}

const MAX_VISIBLE_CHIPS = 6;

function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .trim();
}

function FilterChip({ label, onRemove }: FilterChipProps) {
  return (
    <span className="filter-chip">
      <span className="filter-chip-label">{label}</span>
      <button
        type="button"
        className="filter-chip-remove"
        onClick={onRemove}
        aria-label={`Quitar ${label}`}
      >
        ×
      </button>
    </span>
  );
}

function ChipList({ values, labels, noun, onRemove }: ChipListProps) {
  const visible = values.slice(0, MAX_VISIBLE_CHIPS);
  const hidden = values.length - visible.length;

  return (
    <>
      {visible.map((value) => (
        <FilterChip
          key={value}
          label={labels.get(value) ?? value}
          onRemove={() => onRemove(value)}
        />
      ))}
      {hidden > 0 && (
        <span className="filter-chip filter-chip--more">
          +{hidden} {noun}
        </span>
      )}
    </>
  );
}

function MultiSelect({
  legend,
  options,
  selected,
  onChange,
  emptySummary,
  mode = "list",
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const searchId = `${panelId}-search`;
  const allValues = useMemo(
    () => options.map(([value]) => value),
    [options],
  );
  const labelByValue = useMemo(() => new Map(options), [options]);
  const normalizedQuery = normalizeSearch(query);
  const filteredOptions =
    normalizedQuery.length === 0
      ? options
      : options.filter(([, label]) =>
          normalizeSearch(label).includes(normalizedQuery),
        );
  const empty = selected.length === 0;
  const allExplicit =
    options.length > 0 && selected.length === options.length;
  const active = mode === "years" ? !empty : !empty && !allExplicit;
  const selectedSet = new Set(selected);
  const summary = (() => {
    if (empty) {
      return emptySummary;
    }

    if (allExplicit) {
      return mode === "years"
        ? `Todos los años (${options.length})`
        : emptySummary;
    }

    if (selected.length === 1) {
      return labelByValue.get(selected[0]) ?? selected[0];
    }

    return `${selected.length} seleccionados`;
  })();

  useEffect(() => {
    if (!open) {
      setQuery("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const toggle = (value: string) => {
    const current = new Set(selected);

    if (current.has(value)) {
      current.delete(value);
    } else {
      current.add(value);
    }

    onChange(allValues.filter((item) => current.has(item)));
  };

  return (
    <div className="multi-select" ref={containerRef}>
      <button
        type="button"
        className={`multi-select-trigger${active ? " is-active" : ""}`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((visible) => !visible)}
      >
        <span className="multi-select-trigger-label">
          <span className="multi-select-trigger-title">{legend}</span>
          <span className="multi-select-trigger-value">{summary}</span>
        </span>
        {active && (
          <span className="multi-select-count" aria-hidden="true">
            {selected.length}
          </span>
        )}
        <span className="multi-select-chevron" aria-hidden="true">
          ▾
        </span>
      </button>

      {open && (
        <div
          id={panelId}
          className="multi-select-panel"
          role="group"
          aria-label={`Opciones de ${legend.toLowerCase()}`}
        >
          <div className="multi-select-panel-header">
            <span>{legend}</span>
            <div className="multi-select-panel-actions">
              {mode === "years" ? (
                <>
                  <button
                    type="button"
                    className="button-secondary multi-select-all"
                    onClick={() => onChange([])}
                    disabled={empty}
                  >
                    Sin año
                  </button>
                  <button
                    type="button"
                    className="button-secondary multi-select-all"
                    onClick={() => onChange(allValues)}
                    disabled={allExplicit}
                  >
                    Todos los años
                  </button>
                </>
              ) : allExplicit ? (
                <button
                  type="button"
                  className="button-secondary multi-select-all"
                  onClick={() => onChange([])}
                >
                  Limpiar selección
                </button>
              ) : (
                <button
                  type="button"
                  className="button-secondary multi-select-all"
                  onClick={() => onChange(allValues)}
                  disabled={options.length === 0}
                >
                  Seleccionar todos
                </button>
              )}
            </div>
          </div>

          <div className="multi-select-search">
            <label className="sr-only" htmlFor={searchId}>
              Buscar {legend.toLowerCase()}
            </label>
            <input
              id={searchId}
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Buscar ${legend.toLowerCase()}...`}
              autoComplete="off"
            />
          </div>

          <div className="multi-select-options">
            {filteredOptions.length === 0 ? (
              <p className="multi-select-empty">
                No se encontraron opciones.
              </p>
            ) : (
              filteredOptions.map(([value, label]) => (
                <label key={value} className="multi-select-option">
                  <input
                    type="checkbox"
                    value={value}
                    checked={selectedSet.has(value)}
                    onChange={() => toggle(value)}
                  />
                  <span>{label}</span>
                </label>
              ))
            )}
          </div>

          <div className="multi-select-footer">
            <button
              type="button"
              className="button-secondary multi-select-close"
              onClick={() => setOpen(false)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
      [...new Set(payload.data.map((tuple) => tuple[3]))]
        .sort((a, b) => a - b)
        .map(
          (anio) =>
            [String(anio), anio === 2006 ? "2006 (parcial)" : String(anio)] as [
              string,
              string,
            ],
        ),
    [payload],
  );
  const municipioLabels = useMemo(() => new Map(municipios), [municipios]);
  const cultivoLabels = useMemo(() => new Map(cultivos), [cultivos]);
  const anioLabels = useMemo(() => new Map(anios), [anios]);
  const allMunicipiosExplicit =
    municipios.length > 0 && value.municipios.length === municipios.length;
  const allCultivosExplicit =
    cultivos.length > 0 && value.cultivos.length === cultivos.length;

  return (
    <section className="filters-card" aria-label="Filtros de datos">
      <div className="filters">
        <MultiSelect
          legend="Municipios"
          options={municipios}
          selected={value.municipios}
          onChange={(municipiosValue) =>
            onChange({ ...value, municipios: municipiosValue })
          }
          emptySummary="Todos los municipios"
        />

        <MultiSelect
          legend="Cultivos"
          options={cultivos}
          selected={value.cultivos}
          onChange={(cultivosValue) =>
            onChange({ ...value, cultivos: cultivosValue })
          }
          emptySummary="Todos los cultivos"
        />

        <MultiSelect
          legend="Años"
          options={anios}
          selected={value.anios}
          onChange={(aniosValue) => onChange({ ...value, anios: aniosValue })}
          emptySummary="Sin año seleccionado (2007–2025)"
          mode="years"
        />
      </div>

      {hasActiveFilters && (
        <div className="active-filters">
          <div className="active-filters-head">
            <span className="active-filters-title">Filtros activos</span>
            <button
              type="button"
              className="button-secondary filter-reset"
              onClick={onReset}
            >
              Limpiar filtros
            </button>
          </div>
          <div className="active-filters-chips">
            {value.municipios.length > 0 && !allMunicipiosExplicit && (
              <ChipList
                values={value.municipios}
                labels={municipioLabels}
                noun="municipios"
                onRemove={(removed) =>
                  onChange({
                    ...value,
                    municipios: value.municipios.filter(
                      (item) => item !== removed,
                    ),
                  })
                }
              />
            )}
            {value.cultivos.length > 0 && !allCultivosExplicit && (
              <ChipList
                values={value.cultivos}
                labels={cultivoLabels}
                noun="cultivos"
                onRemove={(removed) =>
                  onChange({
                    ...value,
                    cultivos: value.cultivos.filter(
                      (item) => item !== removed,
                    ),
                  })
                }
              />
            )}
            <ChipList
              values={value.anios}
              labels={anioLabels}
              noun="años"
              onRemove={(removed) =>
                onChange({
                  ...value,
                  anios: value.anios.filter((item) => item !== removed),
                })
              }
            />
            {hideCane && (
              <FilterChip
                label="Sin caña"
                onRemove={() => onToggleCane(false)}
              />
            )}
          </div>
        </div>
      )}

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
      </div>

      <p className="data-note">
        Sin año seleccionado, las gráficas transversales agregan los años
        comparables 2007–2025. 2006 se marca como reporte parcial. La caña
        concentra la mayor parte de la producción.
      </p>
    </section>
  );
}
