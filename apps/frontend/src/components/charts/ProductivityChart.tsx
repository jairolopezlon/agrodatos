import type { ChartData, ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";
import type { ProductivityData } from "../../lib/aggregations";
import {
  formatArea,
  formatNumber,
  formatProduction,
  formatYield,
} from "../../lib/format";
import { truncateLabel } from "../../lib/text";
import { ChartCard } from "../ChartCard";

interface ProductivityChartProps {
  data: ProductivityData;
  onResetFilters: () => void;
}

export function ProductivityChart({
  data,
  onResetFilters,
}: ProductivityChartProps) {
  const chartData: ChartData<"bar"> = {
    labels: data.items.map((item) => truncateLabel(item.label)),
    datasets: [
      {
        label: "Productividad",
        data: data.items.map((item) => item.yield),
        backgroundColor: "#0f766e",
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
          label: (context) => formatYield(Number(context.raw)),
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatNumber(Number(value), 1),
        },
        title: { display: true, text: "t/ha" },
      },
      y: {
        grid: { display: false },
        ticks: { autoSkip: false, font: { size: 11 } },
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
      chartAriaLabel="Productividad por hectárea"
      table={{
        columns: [
          data.dimensionLabel,
          "Productividad",
          "Producción",
          "Área cosechada",
        ],
        rows: data.items.map((item) => [
          item.label,
          formatYield(item.yield),
          formatProduction(item.production),
          formatArea(item.areaHarvested),
        ]),
      }}
    >
      <Bar data={chartData} options={options} />
    </ChartCard>
  );
}
