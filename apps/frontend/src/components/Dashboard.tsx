import type { CompressedAgroPayload } from "@agrodatos/shared-types";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { buildDashboardData, isCaneCrop } from "../lib/aggregations";
import { Filters, type FilterState } from "./Filters";
import { MobileTabBar } from "./MobileTabBar";
import { CultivosSection } from "./sections/CultivosSection";
import { EvolucionSection } from "./sections/EvolucionSection";
import { MunicipiosSection } from "./sections/MunicipiosSection";
import { ResumenSection } from "./sections/ResumenSection";

const EMPTY_FILTERS: FilterState = {
  municipios: [],
  cultivos: [],
  anios: [],
};

interface DashboardProps {
  payload: CompressedAgroPayload;
  activeSection: string;
}

export function Dashboard({ payload, activeSection }: DashboardProps) {
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [hideCane, setHideCane] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tabbarRoot, setTabbarRoot] = useState<HTMLElement | null>(null);
  const selectedCropLabels = filters.cultivos
    .map((value) => payload.dicts.cultivos[Number(value)])
    .filter((label) => typeof label === "string");
  const caneSelected =
    selectedCropLabels.length > 0 && selectedCropLabels.every(isCaneCrop);
  const effectiveHideCane = caneSelected ? false : hideCane;
  const data = useMemo(
    () => buildDashboardData(payload, filters, { hideCane: effectiveHideCane }),
    [payload, filters, effectiveHideCane],
  );
  const allMunicipiosExplicit =
    filters.municipios.length > 0 &&
    filters.municipios.length ===
      Object.keys(payload.dicts.municipios).length;
  const allCultivosExplicit =
    filters.cultivos.length > 0 &&
    filters.cultivos.length === Object.keys(payload.dicts.cultivos).length;
  const hasActiveFilters =
    (filters.municipios.length > 0 && !allMunicipiosExplicit) ||
    (filters.cultivos.length > 0 && !allCultivosExplicit) ||
    filters.anios.length > 0 ||
    effectiveHideCane;

  useEffect(() => {
    setTabbarRoot(document.getElementById("app-shell"));
  }, []);

  useEffect(() => {
    if (!filtersOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFiltersOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [filtersOpen]);

  useEffect(() => {
    const media = window.matchMedia("(min-width: 769px)");
    const handleChange = () => {
      if (media.matches) {
        setFiltersOpen(false);
      }
    };

    handleChange();
    media.addEventListener("change", handleChange);

    return () => {
      media.removeEventListener("change", handleChange);
    };
  }, []);

  useEffect(() => {
    if (!filtersOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [filtersOpen]);

  const handleReset = () => {
    setFilters(EMPTY_FILTERS);
    setHideCane(false);
  };

  return (
    <div className="dashboard">
      {filtersOpen && (
        <div
          className="filters-backdrop"
          onClick={() => setFiltersOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        id="filters-panel"
        className={`filters-shell${filtersOpen ? " is-open" : ""}`}
      >
        <div className="filters-mobile-head">
          <span>Filtros</span>
          <button
            type="button"
            className="button-secondary filter-reset"
            onClick={() => setFiltersOpen(false)}
          >
            Cerrar
          </button>
        </div>

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
      </div>

      <ResumenSection data={data} onResetFilters={handleReset} />
      <CultivosSection data={data} onResetFilters={handleReset} />
      <MunicipiosSection data={data} onResetFilters={handleReset} />
      <EvolucionSection data={data} onResetFilters={handleReset} />

      {tabbarRoot &&
        createPortal(
          <MobileTabBar
            activeSection={activeSection}
            filtersOpen={filtersOpen}
            hasActiveFilters={hasActiveFilters}
            onToggleFilters={() => setFiltersOpen((visible) => !visible)}
            onNavigate={() => setFiltersOpen(false)}
          />,
          tabbarRoot,
        )}
    </div>
  );
}
