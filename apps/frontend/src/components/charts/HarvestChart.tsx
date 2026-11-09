import type { ChartData, ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";
import type {
  ChartData as AggregatedChartData,
  HarvestAggregate,
} from "../../lib/aggregations";
import {
  formatArea,
  formatNumber,
  formatPercent,
} from "../../lib/format";
import { truncateLabel } from "../../lib/text";
import { ChartCard } from "../ChartCard";

interface HarvestChartProps {
  data: AggregatedChartData<HarvestAggregate>;
  selectedYear: number;
  onResetFilters: () => void;
}

export function HarvestChart({
  data,
  selectedYear,
  onResetFilters,
}: HarvestChartProps) {
  const chartData: ChartData<"bar"> = {
    labels: data.items.map((item) => truncateLabel(item.label)),
    datasets: [
      {
        label: "% cosechado",
        data: data.items.map((item) => item.successRate),
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
          label: (context) => formatPercent(Number(context.raw)),
        },
      },
    },
    scales: {
      x: {
        min: 0,
        max: 100,
        ticks: {
          callback: (value) => `${formatNumber(Number(value), 0)} %`,
        },
        title: { display: true, text: "% cosechado" },
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
      chartAriaLabel={`Porcentaje del área sembrada que se cosecha en ${selectedYear}`}
      table={{
        columns: [
          "Cultivo",
          "Área sembrada",
          "Área cosechada",
          "% cosechado",
        ],
        rows: data.items.map((item) => [
          item.label,
          formatArea(item.areaSown),
          formatArea(item.areaHarvested),
          formatPercent(item.successRate),
        ]),
      }}
    >
      <Bar data={chartData} options={options} />
    </ChartCard>
  );
}
