import type { DashboardData } from "../../lib/aggregations";
import { OtherCropsChart } from "../charts/OtherCropsChart";
import { ProductivityChart } from "../charts/ProductivityChart";

interface CultivosSectionProps {
  data: DashboardData;
  onResetFilters: () => void;
}

export function CultivosSection({
  data,
  onResetFilters,
}: CultivosSectionProps) {
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
          periodLabel={data.periodLabel}
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
