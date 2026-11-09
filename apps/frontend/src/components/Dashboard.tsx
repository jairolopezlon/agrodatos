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

  return (
    <>
      <Filters payload={payload} value={filters} onChange={setFilters} />
      <ProductionCharts payload={payload} filters={filters} />
    </>
  );
}
