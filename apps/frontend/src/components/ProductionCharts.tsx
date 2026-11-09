import type { CompressedAgroPayload } from "@agrodatos/shared-types";
import {
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import type { FilterState } from "./Filters";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

interface ProductionChartsProps {
  payload: CompressedAgroPayload;
  filters: FilterState;
  onResetFilters?: () => void;
}

interface PeriodAggregate {
  label: string;
  produccion: number;
  areaSembrada: number;
  areaCosechada: number;
}

interface CultivoAggregate {
  label: string;
  produccion: number;
}

function matchesFilters(
  tuple: CompressedAgroPayload["data"][number],
  filters: FilterState,
): boolean {
  if (filters.municipio !== "all" && tuple[0] !== Number(filters.municipio)) {
    return false;
  }

  if (filters.cultivo !== "all" && tuple[1] !== Number(filters.cultivo)) {
    return false;
  }

  if (filters.anio !== "all" && tuple[3] !== Number(filters.anio)) {
    return false;
  }

  if (filters.periodo !== "all" && tuple[2] !== Number(filters.periodo)) {
    return false;
  }

  return true;
}

export function ProductionCharts({
  payload,
  filters,
  onResetFilters,
}: ProductionChartsProps) {
  const filtered = payload.data.filter((tuple) =>
    matchesFilters(tuple, filters),
  );

  if (filtered.length === 0) {
    return (
      <div className="empty-state">
        <p>No hay datos para estos filtros.</p>
        {onResetFilters && (
          <button
            type="button"
            className="button-secondary"
            onClick={onResetFilters}
          >
            Limpiar filtros
          </button>
        )}
      </div>
    );
  }

  const byPeriodo = new Map<number, PeriodAggregate>();
  const byCultivo = new Map<number, CultivoAggregate>();

  for (const tuple of filtered) {
    const [, cultivoIdx, periodoIdx, , areaSembrada, areaCosechada, produccion] =
      tuple;
    const periodoLabel =
      payload.dicts.periodos[periodoIdx] ?? String(periodoIdx);
    const cultivoLabel =
      payload.dicts.cultivos[cultivoIdx] ?? String(cultivoIdx);

    const periodAggregate =
      byPeriodo.get(periodoIdx) ?? {
        label: periodoLabel,
        produccion: 0,
        areaSembrada: 0,
        areaCosechada: 0,
      };

    periodAggregate.produccion += produccion;
    periodAggregate.areaSembrada += areaSembrada;
    periodAggregate.areaCosechada += areaCosechada;
    byPeriodo.set(periodoIdx, periodAggregate);

    const cultivoAggregate =
      byCultivo.get(cultivoIdx) ?? { label: cultivoLabel, produccion: 0 };

    cultivoAggregate.produccion += produccion;
    byCultivo.set(cultivoIdx, cultivoAggregate);
  }

  const periodos = [...byPeriodo.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([, value]) => value);

  const cultivos = [...byCultivo.entries()]
    .sort((a, b) => b[1].produccion - a[1].produccion)
    .slice(0, 10)
    .map(([, value]) => value);

  const lineData: ChartData<"line"> = {
    labels: periodos.map((item) => item.label),
    datasets: [
      {
        label: "Producción (t)",
        data: periodos.map((item) => item.produccion),
        borderColor: "#166534",
        backgroundColor: "rgba(22, 101, 52, 0.2)",
        fill: true,
        tension: 0.3,
      },
      {
        label: "Área sembrada (ha)",
        data: periodos.map((item) => item.areaSembrada),
        borderColor: "#ca8a04",
        backgroundColor: "rgba(202, 138, 4, 0.2)",
        fill: false,
        tension: 0.3,
      },
    ],
  };

  const barData: ChartData<"bar"> = {
    labels: cultivos.map((item) => item.label),
    datasets: [
      {
        label: "Producción (t)",
        data: cultivos.map((item) => item.produccion),
        backgroundColor: "#166534",
      },
    ],
  };

  const lineOptions: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { position: "bottom" },
    },
  };

  const barOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: { beginAtZero: true },
    },
  };

  return (
    <section className="charts">
      <div className="chart-card">
        <h2>Producción por periodo</h2>
        <div className="chart-container">
          <Line data={lineData} options={lineOptions} />
        </div>
      </div>

      <div className="chart-card">
        <h2>Cultivos con mayor producción</h2>
        <div className="chart-container">
          <Bar data={barData} options={barOptions} />
        </div>
      </div>
    </section>
  );
}
