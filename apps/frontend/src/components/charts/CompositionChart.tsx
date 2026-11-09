import type { ChartData, ChartOptions } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import type { CompositionData } from "../../lib/aggregations";
import { formatPercent, formatProduction } from "../../lib/format";
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
  const chartData: ChartData<"doughnut"> = {
    labels: data.items.map((item) => truncateLabel(item.label)),
    datasets: [
      {
        data: data.items.map((item) => item.production),
        backgroundColor: COLORS.slice(0, data.items.length),
        borderColor: "#ffffff",
        borderWidth: 2,
      },
    ],
  };

  const options: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          boxWidth: 12,
          padding: 12,
          font: { size: 11 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const item = data.items[context.dataIndex];
            return item
              ? `${item.label}: ${formatProduction(item.production)} (${formatPercent(item.share)})`
              : "";
          },
        },
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
      chartAriaLabel={`Composición de la producción por ${data.dimensionLabel.toLowerCase()}`}
      table={{
        columns: [data.dimensionLabel, "Producción", "Participación"],
        rows: data.items.map((item) => [
          item.label,
          formatProduction(item.production),
          formatPercent(item.share),
        ]),
      }}
    >
      <Doughnut data={chartData} options={options} />
    </ChartCard>
  );
}
