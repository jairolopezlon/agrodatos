import type { CompressedAgroPayload } from "@agrodatos/shared-types";

export interface FilterState {
  municipio: string;
  cultivo: string;
  anio: string;
  periodo: string;
}

interface FiltersProps {
  payload: CompressedAgroPayload;
  value: FilterState;
  onChange: (value: FilterState) => void;
}

function sortedEntries(record: Record<number, string>): [string, string][] {
  return Object.entries(record).sort((a, b) =>
    a[1].localeCompare(b[1], "es"),
  );
}

export function Filters({ payload, value, onChange }: FiltersProps) {
  const municipios = sortedEntries(payload.dicts.municipios);
  const cultivos = sortedEntries(payload.dicts.cultivos);
  const periodos = Object.entries(payload.dicts.periodos).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  );
  const anios = [...new Set(payload.data.map((tuple) => tuple[3]))].sort(
    (a, b) => a - b,
  );

  return (
    <section className="filters" aria-label="Filtros de datos">
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
              {anio}
            </option>
          ))}
        </select>
      </label>

      <label>
        Periodo
        <select
          value={value.periodo}
          onChange={(event) =>
            onChange({ ...value, periodo: event.target.value })
          }
        >
          <option value="all">Todos</option>
          {periodos.map(([index, name]) => (
            <option key={index} value={index}>
              {name}
            </option>
          ))}
        </select>
      </label>
    </section>
  );
}
