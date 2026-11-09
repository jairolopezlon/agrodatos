import type { ChartData, ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";
import type { CompositionData } from "../../lib/aggregations";
import {
  formatCompact,
  formatPercent,
  formatProduction,
} from "../../lib/format";
import { truncateLabel } from "../../lib/text";
import { ChartCard } from "../ChartCard";

interface CompositionChartProps {
  data: CompositionData;
  onResetFilters: () => void;
}

const COLORS = [
  "#166534",
  "#ca8a04",
  "#0f766e",
  "#2563eb",
  "#7c3aed",
  "#94a3b8",
];

export function CompositionChart({
  data,
  onResetFilters,
}: CompositionChartProps) {
  const chartData: ChartData<"bar"> = {
    labels: data.items.map((item) => truncateLabel(item.label, 26)),
    datasets: [
      {
        label: "Producción",
        data: data.items.map((item) => item.production),
        backgroundColor: data.items.map((item, index) =>
          item.key === "otros"
            ? "#94a3b8"
            : COLORS[index % COLORS.length],
        ),
        borderRadius: 4,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (context) =>
            data.items[context[0]?.dataIndex ?? 0]?.label ?? "",
          label: (context) => {
            const item = data.items[context.dataIndex];

            return item
              ? `${formatProduction(item.production)} (${formatPercent(item.share)})`
              : "";
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatCompact(Number(value)),
        },
        title: { display: true, text: "Toneladas" },
      },
      y: {
        grid: { display: false },
        ticks: { autoSkip: false, font: { size: 12 } },
      },
    },
  };

  return (
    <ChartCard
      title={data.title}
      insight={data.insight}
      footnote={data.footnote}
      empty={data.items.length === 0}
      onResetFilters={onResetFilters}
      chartAriaLabel={`Distribución de la producción por ${data.dimensionLabel.toLowerCase()}`}
      table={{
        columns: [data.dimensionLabel, "Producción", "Participación"],
        rows: data.items.map((item) => [
          item.label,
          formatProduction(item.production),
          formatPercent(item.share),
        ]),
      }}
    >
      <Bar data={chartData} options={options} />
    </ChartCard>
  );
}
