import type { CompressedAgroPayload } from "@agrodatos/shared-types";
import { useState } from "react";
import { Filters, type FilterState } from "./Filters";
import { ProductionCharts } from "./ProductionCharts";

const EMPTY_FILTERS: FilterState = {
  municipio: "all",
  cultivo: "all",
  anio: "all",
  periodo: "all",
};

export function Dashboard({ payload }: { payload: CompressedAgroPayload }) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const hasPartial2006 = Object.values(payload.dicts.periodos).includes(
    "2006B",
  );

  return (
    <>
      {hasPartial2006 && (
        <p className="partial-year-note">
          2006 se incluye como año parcial: 374 registros, 24 cultivos y solo el
          periodo 2006B.
        </p>
      )}
      <Filters payload={payload} value={filters} onChange={setFilters} />
      <ProductionCharts
        payload={payload}
        filters={filters}
        onResetFilters={() => setFilters(EMPTY_FILTERS)}
      />
    </>
  );
}
