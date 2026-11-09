import type { DashboardData } from "../../lib/aggregations";
import type { FilterState } from "../Filters";
import { OtherCropsChart } from "../charts/OtherCropsChart";
import { ProductivityChart } from "../charts/ProductivityChart";

interface CultivosSectionProps {
  data: DashboardData;
  filters: FilterState;
  onResetFilters: () => void;
}

export function CultivosSection({
  data,
  filters,
  onResetFilters,
}: CultivosSectionProps) {
  const cropSelected = filters.cultivo !== "all";

  return (
    <section
      id="cultivos"
      className="section"
      aria-labelledby="cultivos-title"
    >
      <div className="section-header">
        <h2 id="cultivos-title" className="section-title">
          Cultivos del Valle
        </h2>
        <p className="section-subtitle">
          Qué se produce y qué tan productivo es.
        </p>
      </div>

      <div className="chart-grid">
        <OtherCropsChart
          data={data.otherCrops}
          selectedYear={data.selectedYear}
          empty={cropSelected}
          emptyMessage={
            cropSelected
              ? "Estás viendo un cultivo específico. Limpia el filtro para comparar con otros cultivos."
              : "No hay datos para esta selección."
          }
          onResetFilters={onResetFilters}
        />
        <ProductivityChart
          data={data.productivity}
          onResetFilters={onResetFilters}
        />
      </div>
    </section>
  );
}
