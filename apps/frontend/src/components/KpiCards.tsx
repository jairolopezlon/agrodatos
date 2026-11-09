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

export function KpiCards({ kpis }: KpiCardsProps) {
  const year = kpis.productionYear;
  const productionLabel = kpis.selectedCrop
    ? `Producción de ${kpis.selectedCrop}`
    : kpis.hideCane
      ? "Producción sin caña"
      : "Producción";
  const growthLabel =
    kpis.growth === null
      ? "Sin comparación disponible"
      : `Crecimiento 2007–2025: ${formatSignedPercent(kpis.growth)}${kpis.hideCane ? " sin caña" : ""}`;

  const topCropLabel = kpis.selectedCrop
    ? "Cultivo seleccionado"
    : "Cultivo principal";
  const topCropSubtitle = (() => {
    if (!kpis.topCrop) {
      return "Sin datos para esta selección";
    }

    if (
      !kpis.selectedCrop &&
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

  const municipalityLabel = kpis.selectedMunicipality
    ? "Municipio seleccionado"
    : "Municipio principal";
  const municipalitySubtitle =
    kpis.municipalityShare === null
      ? "Sin datos para esta selección"
      : `${formatPercent(kpis.municipalityShare)} del total${kpis.selectedCrop ? ` de ${kpis.selectedCrop}` : ""}`;

  const productivityLabel =
    kpis.averageYield === null ? "Sin datos" : formatYield(kpis.averageYield);

  return (
    <div className="kpi-grid" aria-label="Indicadores principales">
      <article className="kpi-card">
        <p className="kpi-label">
          {productionLabel} · {year}
          {kpis.isPartialYear && (
            <span className="kpi-badge">Datos parciales</span>
          )}
        </p>
        <p className="kpi-value">{formatProduction(kpis.productionValue)}</p>
        <p className="kpi-subtitle">
          {kpis.isPartialYear
            ? "2006 fue un reporte parcial piloto."
            : growthLabel}
        </p>
      </article>

      <article className="kpi-card">
        <p className="kpi-label">
          {topCropLabel} · {year}
        </p>
        <p className="kpi-value">{kpis.topCrop?.label ?? "Sin datos"}</p>
        <p className="kpi-subtitle">{topCropSubtitle}</p>
      </article>

      <article className="kpi-card">
        <p className="kpi-label">
          {municipalityLabel} · {year}
        </p>
        <p className="kpi-value">
          {kpis.topMunicipality?.label ?? "Sin datos"}
        </p>
        <p className="kpi-subtitle">{municipalitySubtitle}</p>
      </article>

      <article className="kpi-card">
        <p className="kpi-label">
          Productividad promedio · {year}
        </p>
        <p className="kpi-value">{productivityLabel}</p>
        <p className="kpi-subtitle">
          {formatArea(kpis.totalAreaSown)} sembradas
          {kpis.hideCane ? " sin caña" : ""}
        </p>
      </article>
    </div>
  );
}
