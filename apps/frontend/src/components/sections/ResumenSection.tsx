import type { DashboardData } from "../../lib/aggregations";
import { KpiCards } from "../KpiCards";
import { CompositionChart } from "../charts/CompositionChart";
import { ProductionTrendChart } from "../charts/ProductionTrendChart";

interface ResumenSectionProps {
  data: DashboardData;
  onResetFilters: () => void;
}

export function ResumenSection({
  data,
  onResetFilters,
}: ResumenSectionProps) {
  return (
    <section id="resumen" className="section" aria-labelledby="resumen-title">
      <div className="section-header">
        <h2 id="resumen-title" className="section-title">
          Resumen
        </h2>
        <p className="section-subtitle">
          Una mirada rápida a la producción del Valle del Cauca.
        </p>
      </div>

      <KpiCards kpis={data.kpis} />

      {data.isPartialYear && (
        <p className="partial-notice">
          Estás viendo 2006, un año parcial piloto. Las tendencias usan
          2007–2025.
        </p>
      )}

      <div className="chart-grid">
        <CompositionChart
          data={data.composition}
          onResetFilters={onResetFilters}
        />
        <ProductionTrendChart
          data={data.productionByYear}
          selectedYear={data.selectedYear}
          onResetFilters={onResetFilters}
        />
      </div>
    </section>
  );
}
