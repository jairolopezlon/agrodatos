import type { DashboardData } from "../../lib/aggregations";
import { MunicipalityChart } from "../charts/MunicipalityChart";

interface MunicipiosSectionProps {
  data: DashboardData;
  onResetFilters: () => void;
}

export function MunicipiosSection({
  data,
  onResetFilters,
}: MunicipiosSectionProps) {
  return (
    <section
      id="municipios"
      className="section"
      aria-labelledby="municipios-title"
    >
      <div className="section-header">
        <h2 id="municipios-title" className="section-title">
          Territorio
        </h2>
        <p className="section-subtitle">
          Dónde se concentra la producción.
        </p>
      </div>

      <div className="chart-grid chart-grid-single">
        <MunicipalityChart
          data={data.municipalities}
          selectedYear={data.selectedYear}
          onResetFilters={onResetFilters}
        />
      </div>
    </section>
  );
}
