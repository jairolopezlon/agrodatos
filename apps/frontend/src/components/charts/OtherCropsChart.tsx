import type { ChartData, ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";
import type { ChartData as AggregatedChartData, CropAggregate } from "../../lib/aggregations";
import {
  formatArea,
  formatCompact,
  formatPercent,
  formatProduction,
} from "../../lib/format";
import { truncateLabel } from "../../lib/text";
import { ChartCard } from "../ChartCard";

interface OtherCropsChartProps {
  data: AggregatedChartData<CropAggregate>;
  selectedYear: number;
  empty: boolean;
  emptyMessage: string;
  onResetFilters: () => void;
}

export function OtherCropsChart({
  data,
  selectedYear,
  empty,
  emptyMessage,
  onResetFilters,
}: OtherCropsChartProps) {
  const chartData: ChartData<"bar"> = {
    labels: data.items.map((item) => truncateLabel(item.label)),
    datasets: [
      {
        label: "Producción",
        data: data.items.map((item) => item.production),
        backgroundColor: "#166534",
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
          label: (context) => formatProduction(Number(context.raw)),
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
        ticks: { autoSkip: false, font: { size: 11 } },
      },
    },
  };

  return (
    <ChartCard
      title={data.title}
      insight={data.insight}
      footnote={data.footnote}
      empty={empty || data.items.length === 0}
      emptyMessage={emptyMessage}
      onResetFilters={onResetFilters}
      chartAriaLabel={`Cultivos con mayor producción sin caña en ${selectedYear}`}
      table={{
        columns: ["Cultivo", "Producción", "Participación", "Área cosechada"],
        rows: data.items.map((item) => [
          item.label,
          formatProduction(item.production),
          formatPercent(item.share),
          formatArea(item.areaHarvested),
        ]),
      }}
    >
      <Bar data={chartData} options={options} />
    </ChartCard>
  );
}
