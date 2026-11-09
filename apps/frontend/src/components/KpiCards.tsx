import type { KpiData } from "../lib/aggregations";
import {
  formatArea,
  formatPercent,
  formatProduction,
  formatSignedPercent,
  formatYield,
} from "../lib/format";

interface KpiCardsProps {
  kpis: KpiData;
}

function joinLabels(labels: string[], max = 3): string {
  if (labels.length === 0) {
    return "";
  }

  if (labels.length <= max) {
    return labels.join(", ");
  }

  return `${labels.slice(0, max).join(", ")} y ${labels.length - max} más`;
}

export function KpiCards({ kpis }: KpiCardsProps) {
  const period = kpis.periodLabel;
  const multipleCrops = kpis.selectedCrops.length > 1;
  const multipleMunicipalities = kpis.selectedMunicipalities.length > 1;
  const growthText =
    kpis.growth === null
      ? "Sin comparación disponible"
      : `Crecimiento 2007–2025: ${formatSignedPercent(kpis.growth)}${kpis.hideCane ? " sin caña" : ""}`;

  const topCropLabel =
    kpis.selectedCrops.length > 0
      ? multipleCrops
        ? "Cultivos seleccionados"
        : "Cultivo seleccionado"
      : "Cultivo principal";
  const topCropValue = multipleCrops
    ? `${kpis.selectedCrops.length} cultivos`
    : (kpis.topCrop?.label ?? "Sin datos");
  const topCropContext = (() => {
    if (multipleCrops) {
      return joinLabels(kpis.selectedCrops);
    }

    if (!kpis.topCrop) {
      return "Sin datos para esta selección";
    }

    if (
      kpis.selectedCrops.length === 0 &&
      !kpis.hideCane &&
      kpis.topCropWithoutCane &&
      kpis.topCrop.label !== kpis.topCropWithoutCane.label
    ) {
      return `Sin caña: ${kpis.topCropWithoutCane.label}`;
    }

    if (kpis.topCropShare !== null) {
      return `${formatPercent(kpis.topCropShare)} del total${kpis.hideCane ? " sin caña" : ""}`;
    }

    return "Sin datos para esta selección";
  })();

  const municipalityLabel =
    kpis.selectedMunicipalities.length > 0
      ? multipleMunicipalities
        ? "Municipios seleccionados"
        : "Municipio seleccionado"
      : "Municipio principal";
  const municipalityValue = multipleMunicipalities
    ? `${kpis.selectedMunicipalities.length} municipios`
    : (kpis.topMunicipality?.label ?? "Sin datos");
  const municipalityContext =
    kpis.municipalityShare === null
      ? multipleMunicipalities
        ? joinLabels(kpis.selectedMunicipalities)
        : "Sin datos para esta selección"
      : `${formatPercent(kpis.municipalityShare)} del total${kpis.selectedCrops.length === 1 ? ` de ${kpis.selectedCrops[0]}` : kpis.selectedCrops.length > 1 ? " de los cultivos seleccionados" : ""}`;

  const productivityLabel =
    kpis.averageYield === null ? "Sin datos" : formatYield(kpis.averageYield);

  return (
    <div className="kpi-grid" aria-label="Indicadores principales">
      <article className="kpi-card">
        <p className="kpi-label">Producción total</p>
        <p className="kpi-value kpi-value--metric">
          {formatProduction(kpis.productionValue)}
        </p>
        <p className="kpi-meta">
          Periodo: {period}
          {kpis.isPartialYear && (
            <span className="kpi-badge">Datos parciales</span>
          )}
        </p>
        <p className="kpi-context">
          {kpis.isPartialYear
            ? "La selección incluye 2006, un reporte parcial piloto."
            : growthText}
        </p>
      </article>

      <article className="kpi-card">
        <p className="kpi-label">{topCropLabel}</p>
        <p className="kpi-value kpi-value--name">{topCropValue}</p>
        <p className="kpi-meta">Periodo: {period}</p>
        <p className="kpi-context">{topCropContext}</p>
      </article>

      <article className="kpi-card">
        <p className="kpi-label">{municipalityLabel}</p>
        <p className="kpi-value kpi-value--name">{municipalityValue}</p>
        <p className="kpi-meta">Periodo: {period}</p>
        <p className="kpi-context">{municipalityContext}</p>
      </article>

      <article className="kpi-card">
        <p className="kpi-label">Productividad promedio</p>
        <p className="kpi-value kpi-value--metric">{productivityLabel}</p>
        <p className="kpi-meta">Periodo: {period}</p>
        <p className="kpi-context">
          {formatArea(kpis.totalAreaSown)} sembradas
          {kpis.hideCane ? " sin caña" : ""}
        </p>
      </article>
    </div>
  );
}
