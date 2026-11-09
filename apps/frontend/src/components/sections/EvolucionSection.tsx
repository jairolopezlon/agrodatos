import type { DashboardData } from "../../lib/aggregations";
import { HarvestChart } from "../charts/HarvestChart";
import { SemestralChart } from "../charts/SemestralChart";

interface EvolucionSectionProps {
  data: DashboardData;
  onResetFilters: () => void;
}

export function EvolucionSection({
  data,
  onResetFilters,
}: EvolucionSectionProps) {
  return (
    <section
      id="evolucion"
      className="section"
      aria-labelledby="evolucion-title"
    >
      <div className="section-header">
        <h2 id="evolucion-title" className="section-title">
          Cosecha y semestres
        </h2>
        <p className="section-subtitle">
          Cómo se aprovecha el área y cómo se distribuye el año.
        </p>
      </div>

      <div className="chart-grid">
        <HarvestChart
          data={data.harvest}
          selectedYear={data.selectedYear}
          onResetFilters={onResetFilters}
        />
        <SemestralChart
          data={data.semestral}
          onResetFilters={onResetFilters}
        />
      </div>
    </section>
  );
}
