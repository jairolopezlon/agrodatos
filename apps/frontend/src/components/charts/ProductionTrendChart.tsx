import type { ChartData, ChartOptions } from "chart.js";
import { Line } from "react-chartjs-2";
import type { ChartData as AggregatedChartData, YearAggregate } from "../../lib/aggregations";
import {
  formatArea,
  formatCompact,
  formatProduction,
  formatYield,
} from "../../lib/format";
import { ChartCard } from "../ChartCard";

interface ProductionTrendChartProps {
  data: AggregatedChartData<YearAggregate>;
  selectedYear: number;
  onResetFilters: () => void;
}

export function ProductionTrendChart({
  data,
  selectedYear,
  onResetFilters,
}: ProductionTrendChartProps) {
  const items = data.items;
  const chartData: ChartData<"line"> = {
    labels: items.map((item) => String(item.year)),
    datasets: [
      {
        label: "Producción",
        data: items.map((item) => item.production),
        borderColor: "#166534",
        backgroundColor: "rgba(22, 101, 52, 0.15)",
        fill: true,
        tension: 0.3,
        spanGaps: false,
        pointRadius: items.map((item) =>
          item.year === selectedYear ? 6 : 3,
        ),
        pointBackgroundColor: items.map((item) =>
          item.year === selectedYear ? "#ca8a04" : "#166534",
        ),
        pointBorderColor: "#166534",
      },
    ],
  };

  const options: ChartOptions<"line"> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) =>
            context.raw === null
              ? "Sin dato"
              : formatProduction(Number(context.raw)),
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

  return (
    <ChartCard
      title={data.title}
      insight={data.insight}
      footnote={data.footnote}
      empty={items.every((item) => item.production === null)}
      onResetFilters={onResetFilters}
      chartAriaLabel="Evolución anual de la producción entre 2007 y 2025"
      table={{
        columns: ["Año", "Producción", "Área sembrada", "Productividad"],
        rows: items.map((item) => [
          String(item.year),
          item.production === null ? "—" : formatProduction(item.production),
          item.areaSown === null ? "—" : formatArea(item.areaSown),
          item.yield === null ? "—" : formatYield(item.yield),
        ]),
      }}
    >
      <Line data={chartData} options={options} />
    </ChartCard>
  );
}
