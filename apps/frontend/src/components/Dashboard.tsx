import type { CompressedAgroPayload } from "@agrodatos/shared-types";
import { useMemo, useState } from "react";
import { buildDashboardData, isCaneCrop } from "../lib/aggregations";
import { Filters, type FilterState } from "./Filters";
import { CultivosSection } from "./sections/CultivosSection";
import { EvolucionSection } from "./sections/EvolucionSection";
import { MunicipiosSection } from "./sections/MunicipiosSection";
import { ResumenSection } from "./sections/ResumenSection";

const EMPTY_FILTERS: FilterState = {
  municipio: "all",
  cultivo: "all",
  anio: "all",
};

export function Dashboard({ payload }: { payload: CompressedAgroPayload }) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [hideCane, setHideCane] = useState(false);
  const selectedCropLabel =
    filters.cultivo === "all"
      ? null
      : (payload.dicts.cultivos[Number(filters.cultivo)] ?? null);
  const caneSelected = selectedCropLabel
    ? isCaneCrop(selectedCropLabel)
    : false;
  const effectiveHideCane = caneSelected ? false : hideCane;
  const data = useMemo(
    () => buildDashboardData(payload, filters, { hideCane: effectiveHideCane }),
    [payload, filters, effectiveHideCane],
  );
  const hasActiveFilters =
    filters.municipio !== "all" ||
    filters.cultivo !== "all" ||
    filters.anio !== "all" ||
    effectiveHideCane;

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setHideCane(false);
  };

  return (
    <div className="dashboard">
      <nav className="section-nav" aria-label="Secciones del tablero">
        <a href="#resumen">Resumen</a>
        <a href="#cultivos">Cultivos</a>
        <a href="#municipios">Municipios</a>
        <a href="#evolucion">Evolución</a>
      </nav>

      <Filters
        payload={payload}
        value={filters}
        onChange={setFilters}
        hideCane={effectiveHideCane}
        caneDisabled={caneSelected}
        onToggleCane={setHideCane}
        onReset={handleReset}
        hasActiveFilters={hasActiveFilters}
      />

      <ResumenSection data={data} onResetFilters={handleReset} />
      <CultivosSection
        data={data}
        filters={filters}
        onResetFilters={handleReset}
      />
      <MunicipiosSection data={data} onResetFilters={handleReset} />
      <EvolucionSection data={data} onResetFilters={handleReset} />
    </div>
  );
}
