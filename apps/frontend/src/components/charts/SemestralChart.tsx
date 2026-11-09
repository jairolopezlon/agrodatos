import type { ChartData, ChartOptions } from "chart.js";
import { Bar } from "react-chartjs-2";
import type {
  ChartData as AggregatedChartData,
  SemestralAggregate,
} from "../../lib/aggregations";
import {
  formatCompact,
  formatProduction,
} from "../../lib/format";
import { ChartCard } from "../ChartCard";

interface SemestralChartProps {
  data: AggregatedChartData<SemestralAggregate>;
  onResetFilters: () => void;
}

export function SemestralChart({
  data,
  onResetFilters,
}: SemestralChartProps) {
  const chartData: ChartData<"bar"> = {
    labels: data.items.map((item) => String(item.year)),
    datasets: [
      {
        label: "Semestre A",
        data: data.items.map((item) => item.semA),
        backgroundColor: "#166534",
        borderRadius: 4,
      },
      {
        label: "Semestre B",
        data: data.items.map((item) => item.semB),
        backgroundColor: "#ca8a04",
        borderRadius: 4,
      },
    ],
  };

  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
      tooltip: {
        callbacks: {
          label: (context) =>
            `${context.dataset.label ?? ""}: ${formatProduction(Number(context.raw))}`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
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
      empty={data.items.length === 0}
      emptyMessage="No hay reporte semestral para esta selección."
      onResetFilters={onResetFilters}
      chartAriaLabel="Comparación de producción entre el primer y segundo semestre"
      table={{
        columns: ["Año", "Semestre A", "Semestre B", "Diferencia B − A"],
        rows: data.items.map((item) => [
          String(item.year),
          formatProduction(item.semA),
          formatProduction(item.semB),
          formatProduction(item.semB - item.semA),
        ]),
      }}
    >
      <Bar data={chartData} options={options} />
    </ChartCard>
  );
}
