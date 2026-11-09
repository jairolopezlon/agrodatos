import type { ChartData, ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";
import type {
  ChartData as AggregatedChartData,
  MunicipalityAggregate,
} from "../../lib/aggregations";
import {
  formatCompact,
  formatPercent,
  formatProduction,
} from "../../lib/format";
import { truncateLabel } from "../../lib/text";
import { ChartCard } from "../ChartCard";

interface MunicipalityChartProps {
  data: AggregatedChartData<MunicipalityAggregate>;
  periodLabel: string;
  onResetFilters: () => void;
}

export function MunicipalityChart({
  data,
  periodLabel,
  onResetFilters,
}: MunicipalityChartProps) {
  const chartData: ChartData<"bar"> = {
    labels: data.items.map((item) => truncateLabel(item.label)),
    datasets: [
      {
        label: "Producción",
        data: data.items.map((item) => item.production),
        backgroundColor: data.items.map((item) =>
          item.selected ? "#ca8a04" : "#166534",
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
      chartAriaLabel={`Municipios con mayor producción en ${periodLabel}`}
      table={{
        columns: ["Municipio", "Producción", "Participación", "Cultivos"],
        rows: data.items.map((item) => [
          item.label,
          formatProduction(item.production),
          formatPercent(item.share),
          String(item.crops),
        ]),
      }}
    >
      <Bar data={chartData} options={options} />
    </ChartCard>
  );
}
