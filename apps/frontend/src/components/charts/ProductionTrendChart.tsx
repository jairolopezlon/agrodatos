import type { ChartData, ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import type { TrendData } from "../../lib/aggregations";
import {
  formatArea,
  formatCompact,
  formatProduction,
  formatYield,
} from "../../lib/format";
import { ChartCard } from "../ChartCard";

interface ProductionTrendChartProps {
  data: TrendData;
  selectedYears: number[];
  onResetFilters: () => void;
}

const SERIES_COLORS = [
  "#166534",
  "#ca8a04",
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#be123c",
];

export function ProductionTrendChart({
  data,
  selectedYears,
  onResetFilters,
}: ProductionTrendChartProps) {
  const items = data.items;
  const labels = items.map((item) => String(item.year));
  const selected = new Set(selectedYears);
  const datasets: ChartData<"line">["datasets"] = data.multipleCrops
    ? data.series.map((serie, index) => {
        const color = SERIES_COLORS[index % SERIES_COLORS.length];

        return {
          label: serie.label,
          data: serie.items.map((item) => item.production),
          borderColor: color,
          backgroundColor: color,
          fill: false,
          tension: 0.3,
          spanGaps: false,
          pointRadius: serie.items.map((item) =>
            selected.has(item.year) ? 6 : 3,
          ),
          pointBackgroundColor: serie.items.map((item) =>
            selected.has(item.year) ? "#111827" : color,
          ),
          pointBorderColor: color,
        };
      })
    : [
        {
          label: "Producción",
          data: items.map((item) => item.production),
          borderColor: "#166534",
          backgroundColor: "rgba(22, 101, 52, 0.15)",
          fill: true,
          tension: 0.3,
          spanGaps: false,
          pointRadius: items.map((item) =>
            selected.has(item.year) ? 6 : 3,
          ),
          pointBackgroundColor: items.map((item) =>
            selected.has(item.year) ? "#ca8a04" : "#166534",
          ),
          pointBorderColor: "#166534",
        },
      ];

  const chartData: ChartData<"line"> = { labels, datasets };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: data.multipleCrops, position: "bottom" },
      tooltip: {
        callbacks: {
          label: (context) => {
            if (context.raw === null) {
              return "Sin dato";
            }

            const value = formatProduction(Number(context.raw));

            return data.multipleCrops
              ? `${context.dataset.label ?? ""}: ${value}`
              : value;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxTicksLimit: 10 },
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatCompact(Number(value)),
        },
        title: { display: true, text: "Toneladas" },
      },
    },
  };

  const table = data.multipleCrops
    ? {
        columns: ["Año", ...data.series.map((serie) => serie.label)],
        rows: items.map((item) => [
          String(item.year),
          ...data.series.map((serie) => {
            const value = serie.items.find(
              (entry) => entry.year === item.year,
            )?.production;

            return value === null || value === undefined
              ? "—"
              : formatProduction(value);
          }),
        ]),
      }
    : {
        columns: ["Año", "Producción", "Área sembrada", "Productividad"],
        rows: items.map((item) => [
          String(item.year),
          item.production === null ? "—" : formatProduction(item.production),
          item.areaSown === null ? "—" : formatArea(item.areaSown),
          item.yield === null ? "—" : formatYield(item.yield),
        ]),
      };

  return (
    <ChartCard
      title={data.title}
      insight={data.insight}
      footnote={data.footnote}
      empty={items.every((item) => item.production === null)}
      onResetFilters={onResetFilters}
      chartAriaLabel={
        data.multipleCrops
          ? "Evolución anual de la producción por cultivo entre 2007 y 2025"
          : "Evolución anual de la producción entre 2007 y 2025"
      }
      table={table}
    >
      <Line data={chartData} options={options} />
    </ChartCard>
  );
}
