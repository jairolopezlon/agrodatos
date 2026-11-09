import type { CompressedAgroPayload } from "@agrodatos/shared-types";
import {
  formatPercent,
  formatProduction,
  formatYield,
} from "./format.ts";

export interface DashboardFilters {
  municipios: string[];
  cultivos: string[];
  anios: string[];
}

export interface DashboardOptions {
  hideCane: boolean;
}

export interface CropAggregate {
  key: string;
  label: string;
  production: number;
  areaSown: number;
  areaHarvested: number;
  yield: number;
  share: number;
  records: number;
  municipalities: number;
}

export interface MunicipalityAggregate {
  key: string;
  label: string;
  production: number;
  areaSown: number;
  areaHarvested: number;
  share: number;
  crops: number;
  selected: boolean;
}

export interface YearAggregate {
  year: number;
  production: number | null;
  areaSown: number | null;
  areaHarvested: number | null;
  yield: number | null;
  records: number;
}

export interface YieldAggregate {
  key: string;
  label: string;
  yield: number;
  production: number;
  areaHarvested: number;
}

export interface HarvestAggregate {
  key: string;
  label: string;
  successRate: number;
  areaSown: number;
  areaHarvested: number;
}

export interface SemestralAggregate {
  year: number;
  semA: number;
  semB: number;
}

export interface CompositionSlice {
  key: string;
  label: string;
  production: number;
  share: number;
}

export interface ChartData<T> {
  title: string;
  insight: string;
  footnote?: string;
  items: T[];
}

export interface CompositionData extends ChartData<CompositionSlice> {
  dimension: "cultivo" | "municipio";
  dimensionLabel: string;
}

export interface ProductivityData extends ChartData<YieldAggregate> {
  dimension: "cultivo" | "municipio";
  dimensionLabel: string;
}

export interface TrendSeries {
  key: string;
  label: string;
  items: YearAggregate[];
}

export interface TrendData extends ChartData<YearAggregate> {
  series: TrendSeries[];
  multipleCrops: boolean;
}

export interface KpiData {
  productionValue: number;
  periodLabel: string;
  isPartialYear: boolean;
  growth: number | null;
  topCrop: CropAggregate | null;
  topCropShare: number | null;
  topCropWithoutCane: CropAggregate | null;
  topMunicipality: MunicipalityAggregate | null;
  municipalityShare: number | null;
  averageYield: number | null;
  totalAreaSown: number;
  selectedCrops: string[];
  selectedMunicipalities: string[];
  hideCane: boolean;
}

export interface DashboardData {
  selectedYears: number[];
  latestYear: number;
  isPartialYear: boolean;
  periodLabel: string;
  kpis: KpiData;
  composition: CompositionData;
  productionByYear: TrendData;
  otherCrops: ChartData<CropAggregate>;
  productivity: ProductivityData;
  municipalities: ChartData<MunicipalityAggregate>;
  harvest: ChartData<HarvestAggregate>;
  semestral: ChartData<SemestralAggregate>;
  filteredRecords: number;
}

type PeriodType = "annual" | "semestralA" | "semestralB";

export interface Row {
  municipioIdx: number;
  municipio: string;
  cultivoIdx: number;
  cultivo: string;
  periodo: string;
  anio: number;
  areaSown: number;
  areaHarvested: number;
  production: number;
  periodType: PeriodType;
}

interface CropEntry {
  key: string;
  label: string;
  production: number;
  areaSown: number;
  areaHarvested: number;
  records: number;
  municipios: Set<number>;
}

interface MunicipalityEntry {
  key: string;
  label: string;
  production: number;
  areaSown: number;
  areaHarvested: number;
  crops: Set<string>;
}

interface ProductivityEntry {
  key: string;
  label: string;
  production: number;
  areaHarvested: number;
}

interface HarvestEntry {
  key: string;
  label: string;
  areaSown: number;
  areaHarvested: number;
}

interface ResolvedPeriod {
  years: number[];
  label: string;
  isPartial: boolean;
}

const CANE_CROPS = new Set(["CAÑA", "CAÑA AZUCARERA"]);
const COMPARABLE_FROM = 2007;
const COMPARABLE_TO = 2025;
const rowCache = new WeakMap<CompressedAgroPayload, Row[]>();

function isCane(row: Row): boolean {
  return CANE_CROPS.has(row.cultivo);
}

export function isCaneCrop(label: string): boolean {
  return CANE_CROPS.has(label);
}

function periodType(periodo: string): PeriodType {
  if (periodo.endsWith("A")) {
    return "semestralA";
  }

  if (periodo.endsWith("B")) {
    return "semestralB";
  }

  return "annual";
}

function indexToLabel(record: Record<number, string>): Map<number, string> {
  const labels = new Map<number, string>();

  for (const [index, label] of Object.entries(record)) {
    labels.set(Number(index), label);
  }

  return labels;
}

export function getRows(payload: CompressedAgroPayload): Row[] {
  const cached = rowCache.get(payload);

  if (cached) {
    return cached;
  }

  const municipios = indexToLabel(payload.dicts.municipios);
  const cultivos = indexToLabel(payload.dicts.cultivos);
  const periodos = indexToLabel(payload.dicts.periodos);
  const rows = payload.data.map((tuple): Row => {
    const [
      municipioIdx,
      cultivoIdx,
      periodoIdx,
      anio,
      areaSown,
      areaHarvested,
      production,
    ] = tuple;
    const periodo = periodos.get(periodoIdx) ?? String(periodoIdx);

    return {
      municipioIdx,
      municipio: municipios.get(municipioIdx) ?? String(municipioIdx),
      cultivoIdx,
      cultivo: cultivos.get(cultivoIdx) ?? String(cultivoIdx),
      periodo,
      anio,
      areaSown,
      areaHarvested,
      production,
      periodType: periodType(periodo),
    };
  });

  rowCache.set(payload, rows);
  return rows;
}

function numericSet(values: string[]): Set<number> | null {
  if (values.length === 0) {
    return null;
  }

  return new Set(values.map(Number));
}

export function filterRows(
  rows: Row[],
  filters: DashboardFilters,
): Row[] {
  const municipioSet = numericSet(filters.municipios);
  const cultivoSet = numericSet(filters.cultivos);
  const anioSet = numericSet(filters.anios);

  return rows.filter(
    (row) =>
      (municipioSet === null || municipioSet.has(row.municipioIdx)) &&
      (cultivoSet === null || cultivoSet.has(row.cultivoIdx)) &&
      (anioSet === null || anioSet.has(row.anio)),
  );
}

export function dedupeYearly(rows: Row[]): Row[] {
  const groups = new Map<string, Row[]>();

  for (const row of rows) {
    const key = `${row.municipioIdx}|${row.cultivoIdx}|${row.anio}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }

  const result: Row[] = [];

  for (const group of groups.values()) {
    const annual = group.filter((row) => row.periodType === "annual");
    result.push(...(annual.length > 0 ? annual : group));
  }

  return result;
}

function sumProduction(rows: Row[]): number {
  return rows.reduce((total, row) => total + row.production, 0);
}

function sumAreaSown(rows: Row[]): number {
  return rows.reduce((total, row) => total + row.areaSown, 0);
}

function sumAreaHarvested(rows: Row[]): number {
  return rows.reduce((total, row) => total + row.areaHarvested, 0);
}

function weightedYield(rows: Row[]): number | null {
  const areaHarvested = sumAreaHarvested(rows);

  if (areaHarvested <= 0) {
    return null;
  }

  return sumProduction(rows) / areaHarvested;
}

export function aggregateCrops(
  rows: Row[],
  totalProduction = sumProduction(rows),
): CropAggregate[] {
  const map = new Map<string, CropEntry>();

  for (const row of rows) {
    const entry =
      map.get(row.cultivo) ??
      {
        key: row.cultivo,
        label: row.cultivo,
        production: 0,
        areaSown: 0,
        areaHarvested: 0,
        records: 0,
        municipios: new Set<number>(),
      };

    entry.production += row.production;
    entry.areaSown += row.areaSown;
    entry.areaHarvested += row.areaHarvested;
    entry.records += 1;
    entry.municipios.add(row.municipioIdx);
    map.set(row.cultivo, entry);
  }

  return [...map.values()]
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      production: entry.production,
      areaSown: entry.areaSown,
      areaHarvested: entry.areaHarvested,
      yield:
        entry.areaHarvested > 0
          ? entry.production / entry.areaHarvested
          : 0,
      share:
        totalProduction > 0
          ? (entry.production / totalProduction) * 100
          : 0,
      records: entry.records,
      municipalities: entry.municipios.size,
    }))
    .sort((a, b) => b.production - a.production);
}

export function aggregateMunicipalities(
  rows: Row[],
  totalProduction = sumProduction(rows),
  selectedMunicipalities: string[] = [],
): MunicipalityAggregate[] {
  const map = new Map<string, MunicipalityEntry>();
  const selected = new Set(selectedMunicipalities);

  for (const row of rows) {
    const entry =
      map.get(row.municipio) ??
      {
        key: row.municipio,
        label: row.municipio,
        production: 0,
        areaSown: 0,
        areaHarvested: 0,
        crops: new Set<string>(),
      };

    entry.production += row.production;
    entry.areaSown += row.areaSown;
    entry.areaHarvested += row.areaHarvested;
    entry.crops.add(row.cultivo);
    map.set(row.municipio, entry);
  }

  return [...map.values()]
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      production: entry.production,
      areaSown: entry.areaSown,
      areaHarvested: entry.areaHarvested,
      share:
        totalProduction > 0
          ? (entry.production / totalProduction) * 100
          : 0,
      crops: entry.crops.size,
      selected: selected.has(entry.label),
    }))
    .sort((a, b) => b.production - a.production);
}

export function aggregateYears(
  rows: Row[],
  from = COMPARABLE_FROM,
  to = COMPARABLE_TO,
): YearAggregate[] {
  const byYear = new Map<number, Row[]>();

  for (const row of rows) {
    if (row.anio < from || row.anio > to) {
      continue;
    }

    const group = byYear.get(row.anio) ?? [];
    group.push(row);
    byYear.set(row.anio, group);
  }

  const result: YearAggregate[] = [];

  for (let year = from; year <= to; year += 1) {
    const group = byYear.get(year);

    if (!group || group.length === 0) {
      result.push({
        year,
        production: null,
        areaSown: null,
        areaHarvested: null,
        yield: null,
        records: 0,
      });
      continue;
    }

    const production = sumProduction(group);
    const areaSown = sumAreaSown(group);
    const areaHarvested = sumAreaHarvested(group);

    result.push({
      year,
      production,
      areaSown,
      areaHarvested,
      yield: areaHarvested > 0 ? production / areaHarvested : null,
      records: group.length,
    });
  }

  return result;
}

export function computeGrowth(series: YearAggregate[]): number | null {
  const first =
    series.find((item) => item.year === COMPARABLE_FROM)?.production ?? null;
  const last =
    series.find((item) => item.year === COMPARABLE_TO)?.production ?? null;

  if (first === null || last === null || first <= 0) {
    return null;
  }

  return ((last - first) / first) * 100;
}

export function aggregateProductivity(
  rows: Row[],
  dimension: "cultivo" | "municipio",
  topN = 10,
): YieldAggregate[] {
  const map = new Map<string, ProductivityEntry>();

  for (const row of rows) {
    const key = dimension === "cultivo" ? row.cultivo : row.municipio;
    const entry =
      map.get(key) ??
      {
        key,
        label: key,
        production: 0,
        areaHarvested: 0,
      };

    entry.production += row.production;
    entry.areaHarvested += row.areaHarvested;
    map.set(key, entry);
  }

  return [...map.values()]
    .filter((entry) => entry.areaHarvested > 0)
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      production: entry.production,
      areaHarvested: entry.areaHarvested,
      yield: entry.production / entry.areaHarvested,
    }))
    .sort((a, b) => b.production - a.production)
    .slice(0, topN)
    .sort((a, b) => b.yield - a.yield);
}

export function aggregateHarvest(
  rows: Row[],
  topN = 10,
): HarvestAggregate[] {
  const map = new Map<string, HarvestEntry>();

  for (const row of rows) {
    const entry =
      map.get(row.cultivo) ??
      {
        key: row.cultivo,
        label: row.cultivo,
        areaSown: 0,
        areaHarvested: 0,
      };

    entry.areaSown += row.areaSown;
    entry.areaHarvested += row.areaHarvested;
    map.set(row.cultivo, entry);
  }

  return [...map.values()]
    .filter((entry) => entry.areaSown > 0)
    .map((entry) => ({
      key: entry.key,
      label: entry.label,
      areaSown: entry.areaSown,
      areaHarvested: entry.areaHarvested,
      successRate: (entry.areaHarvested / entry.areaSown) * 100,
    }))
    .sort((a, b) => b.areaSown - a.areaSown)
    .slice(0, topN)
    .sort((a, b) => b.successRate - a.successRate);
}

export function aggregateSemestral(rows: Row[]): SemestralAggregate[] {
  const map = new Map<number, { semA: number; semB: number }>();

  for (const row of rows) {
    if (
      row.anio < 2019 ||
      row.anio > 2025 ||
      (row.periodType !== "semestralA" && row.periodType !== "semestralB")
    ) {
      continue;
    }

    const entry = map.get(row.anio) ?? { semA: 0, semB: 0 };

    if (row.periodType === "semestralA") {
      entry.semA += row.production;
    } else {
      entry.semB += row.production;
    }

    map.set(row.anio, entry);
  }

  return [...map.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, entry]) => ({ year, ...entry }));
}

function resolvePeriod(selectedYears: string[]): ResolvedPeriod {
  const years = [...new Set(selectedYears.map(Number))]
    .filter((year) => Number.isFinite(year))
    .sort((a, b) => a - b);

  if (years.length === 0) {
    const comparable: number[] = [];

    for (let year = COMPARABLE_FROM; year <= COMPARABLE_TO; year += 1) {
      comparable.push(year);
    }

    return {
      years: comparable,
      label: `Totalidad de años (${COMPARABLE_FROM}–${COMPARABLE_TO})`,
      isPartial: false,
    };
  }

  if (years.length === 1) {
    return {
      years,
      label: String(years[0]),
      isPartial: years[0] === 2006,
    };
  }

  return {
    years,
    label: `${years.length} años seleccionados`,
    isPartial: years.includes(2006),
  };
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

function buildSlices(
  groups: Array<{
    key: string;
    label: string;
    production: number;
    share: number;
  }>,
  total: number,
): CompositionSlice[] {
  const slices = groups.slice(0, 5).map((group) => ({
    key: group.key,
    label: group.label,
    production: group.production,
    share: group.share,
  }));
  const topProduction = slices.reduce(
    (sum, slice) => sum + slice.production,
    0,
  );

  if (groups.length > 5 && total - topProduction > 0) {
    slices.push({
      key: "otros",
      label: "Otros",
      production: total - topProduction,
      share: ((total - topProduction) / total) * 100,
    });
  }

  return slices;
}

function buildComposition(
  rows: Row[],
  allRows: Row[],
  selectedCrops: string[],
  selectedMunicipalities: string[],
  periodLabel: string,
  hideCane: boolean,
): CompositionData {
  const total = sumProduction(rows);
  const allTotal = sumProduction(allRows);
  const caneShare =
    allTotal > 0
      ? (sumProduction(allRows.filter(isCane)) / allTotal) * 100
      : 0;
  const singleCrop = selectedCrops.length === 1 ? selectedCrops[0] : null;
  const multipleCrops = selectedCrops.length > 1;
  const singleMunicipality =
    selectedMunicipalities.length === 1 ? selectedMunicipalities[0] : null;
  const dimension =
    singleCrop !== null ? "municipio" : "cultivo";
  const groups =
    dimension === "municipio"
      ? aggregateMunicipalities(rows, total)
      : aggregateCrops(rows, total);
  const slices = buildSlices(groups, total);
  const top = slices.filter((slice) => slice.key !== "otros").slice(0, 3);
  const top3Share = top.reduce((sum, slice) => sum + slice.share, 0);
  const top1 = top[0];
  const top2 = top[1];
  const top3 = top[2];
  const nonCaneTop = aggregateCrops(
    allRows.filter((row) => !isCane(row)),
  ).slice(0, 2);

  if (singleCrop !== null) {
    return {
      dimension,
      dimensionLabel: "Municipio",
      title: `¿Dónde se produce ${singleCrop}?`,
      insight: top1
        ? `El ${formatPercent(top3Share)} de ${singleCrop} se produce en ${top1.label}${top2 ? `, ${top2.label}` : ""}${top3 ? ` y ${top3.label}` : ""}.`
        : "No hay datos para esta selección.",
      footnote: `${periodLabel}. Participación dentro de ${singleCrop}.`,
      items: slices,
    };
  }

  if (multipleCrops) {
    const cropLabel = joinLabels(selectedCrops, 4);

    return {
      dimension,
      dimensionLabel: "Cultivo",
      title: "¿Cómo se reparten los cultivos seleccionados?",
      insight: top1
        ? `${top1.label} concentra el ${formatPercent(top1.share)} de la producción de ${cropLabel} (${periodLabel}).`
        : "No hay datos para esta selección.",
      footnote: `${periodLabel}. Comparación entre los ${selectedCrops.length} cultivos seleccionados.`,
      items: slices,
    };
  }

  if (singleMunicipality !== null) {
    const insight = hideCane
      ? top1
        ? `Sin caña, ${top1.label} representa el ${formatPercent(top1.share)} de la producción. Le siguen ${top2?.label ?? "otros cultivos"}.`
        : "No hay datos para esta selección."
      : caneShare > 0
        ? `La caña representa el ${formatPercent(caneShare)} de la producción de ${singleMunicipality}. Sin caña, ${nonCaneTop[0]?.label ?? "otros cultivos"} lidera.`
        : top1
          ? `En ${singleMunicipality}, ${top1.label} representa el ${formatPercent(top1.share)} de la producción.`
          : "No hay datos para esta selección.";

    return {
      dimension,
      dimensionLabel: "Cultivo",
      title: `¿Qué produce ${singleMunicipality}?`,
      insight,
      footnote: hideCane
        ? `${periodLabel}. Vista sin caña.`
        : `${periodLabel}.`,
      items: slices,
    };
  }

  if (selectedMunicipalities.length > 1) {
    return {
      dimension,
      dimensionLabel: "Cultivo",
      title: "¿Qué cultivos producen los municipios seleccionados?",
      insight: top1
        ? `En ${periodLabel}, ${top1.label}, ${top2?.label ?? "otros"} y ${top3?.label ?? "otros"} concentran el ${formatPercent(top3Share)} de la producción de los ${selectedMunicipalities.length} municipios seleccionados.`
        : "No hay datos para esta selección.",
      footnote: `${selectedMunicipalities.length} municipios seleccionados · ${periodLabel}.`,
      items: slices,
    };
  }

  const insight = hideCane
    ? top1
      ? `Sin caña, ${top1.label} representa el ${formatPercent(top1.share)} de la producción restante. Le siguen ${top2?.label ?? "otros"} y ${top3?.label ?? "otros"}.`
      : "No hay datos para esta selección."
    : caneShare > 0
      ? `La caña representa el ${formatPercent(caneShare)} de la producción. Excluyendo la caña, ${nonCaneTop[0]?.label ?? "otros"} y ${nonCaneTop[1]?.label ?? "otros"} lideran.`
      : top1
        ? `${top1.label} representa el ${formatPercent(top1.share)} de la producción. Le siguen ${top2?.label ?? "otros"} y ${top3?.label ?? "otros"}.`
        : "No hay datos para esta selección.";

  return {
    dimension,
    dimensionLabel: "Cultivo",
    title: "¿Qué cultivos concentran la producción?",
    insight,
    footnote: hideCane
      ? `${periodLabel}. Vista sin caña.`
      : `${periodLabel}. La caña incluye caña azucarera y caña panelera.`,
    items: slices,
  };
}

function buildOtherCrops(
  rows: Row[],
  periodLabel: string,
  selectedMunicipalities: string[],
  selectedCrops: string[],
): ChartData<CropAggregate> {
  const comparisonRows =
    selectedCrops.length > 0
      ? rows.filter((row) => !selectedCrops.includes(row.cultivo))
      : rows;
  const items = aggregateCrops(comparisonRows).slice(0, 10);
  const top = items.slice(0, 3).map((item) => item.label);
  const municipalityLabel =
    selectedMunicipalities.length === 1
      ? ` en ${selectedMunicipalities[0]}`
      : selectedMunicipalities.length > 1
        ? " en los municipios seleccionados"
        : "";
  let insight: string;

  if (top.length === 0) {
    insight =
      selectedCrops.length > 0
        ? "No quedan otros cultivos sin caña para comparar con la selección."
        : "No hay datos para esta selección.";
  } else if (selectedCrops.length > 0) {
    insight =
      top.length === 1
        ? `Sin contar los cultivos seleccionados, ${top[0]} lidera la producción en ${periodLabel}${municipalityLabel}.`
        : top.length === 2
          ? `Sin contar los cultivos seleccionados, ${top[0]} y ${top[1]} lideran la producción en ${periodLabel}${municipalityLabel}.`
          : `Sin contar los cultivos seleccionados, ${top[0]}, ${top[1]} y ${top[2]} lideran la producción en ${periodLabel}${municipalityLabel}.`;
  } else if (top.length === 1) {
    insight = `Sin caña, ${top[0]} lidera la producción en ${periodLabel}${municipalityLabel}.`;
  } else if (top.length === 2) {
    insight = `Sin caña, ${top[0]} y ${top[1]} lideran la producción en ${periodLabel}${municipalityLabel}.`;
  } else {
    insight = `Sin caña, ${top[0]}, ${top[1]} y ${top[2]} lideran la producción en ${periodLabel}${municipalityLabel}.`;
  }

  return {
    title: "¿Qué otros cultivos producen más?",
    insight,
    footnote: `Sin caña · ${periodLabel}`,
    items,
  };
}

function productivityInsight(
  prefix: string,
  items: YieldAggregate[],
): string {
  if (items.length === 0) {
    return "No hay datos para esta selección.";
  }

  if (items.length === 1) {
    return `${prefix} ${items[0].label} tiene el mayor rendimiento (${formatYield(items[0].yield)}).`;
  }

  return `${prefix} ${items[0].label} y ${items[1].label} tienen el mayor rendimiento (${formatYield(items[0].yield)} y ${formatYield(items[1].yield)}).`;
}

function buildProductivity(
  rows: Row[],
  selectedCrops: string[],
  selectedMunicipalities: string[],
  periodLabel: string,
): ProductivityData {
  if (selectedCrops.length === 1) {
    const crop = selectedCrops[0];
    const items = aggregateProductivity(rows, "municipio");
    const insight = productivityInsight(
      `Entre los principales productores de ${crop},`,
      items,
    );

    return {
      dimension: "municipio",
      dimensionLabel: "Municipio",
      title: `¿Dónde se produce más ${crop} por hectárea?`,
      insight,
      footnote: `${periodLabel} · solo los 10 principales por producción`,
      items,
    };
  }

  if (selectedCrops.length > 1) {
    const items = aggregateProductivity(rows, "cultivo");
    const insight = productivityInsight(
      "Entre los cultivos seleccionados,",
      items,
    );

    return {
      dimension: "cultivo",
      dimensionLabel: "Cultivo",
      title: "¿Qué cultivos seleccionados producen más por hectárea?",
      insight,
      footnote: `${periodLabel} · ${selectedCrops.length} cultivos seleccionados`,
      items,
    };
  }

  const items = aggregateProductivity(rows, "cultivo");
  const municipalityLabel =
    selectedMunicipalities.length === 1
      ? ` de ${selectedMunicipalities[0]}`
      : selectedMunicipalities.length > 1
        ? " de los municipios seleccionados"
        : "";
  const insight = productivityInsight(
    `Entre los cultivos principales${municipalityLabel},`,
    items,
  );

  return {
    dimension: "cultivo",
    dimensionLabel: "Cultivo",
    title: "¿Qué cultivos producen más por hectárea?",
    insight,
    footnote: `Sin caña · ${periodLabel} · solo los 10 principales por producción`,
    items,
  };
}

function buildMunicipalities(
  rows: Row[],
  periodLabel: string,
  selectedCrops: string[],
  selectedMunicipalities: string[],
): ChartData<MunicipalityAggregate> {
  const all = aggregateMunicipalities(
    rows,
    sumProduction(rows),
    selectedMunicipalities,
  );
  const cropLabel =
    selectedCrops.length === 1
      ? ` de ${selectedCrops[0]}`
      : selectedCrops.length > 1
        ? " de los cultivos seleccionados"
        : "";
  let items: MunicipalityAggregate[];
  let title: string;
  let insight: string;
  let footnote: string;

  if (selectedMunicipalities.length > 1) {
    items = all.filter((item) => item.selected);
    title = "Comparación de municipios seleccionados";

    if (items.length === 0) {
      insight = "No hay datos para esta selección.";
    } else if (items.length === 1) {
      insight = `En ${periodLabel}, ${items[0].label} produce ${formatProduction(items[0].production)} (${formatPercent(items[0].share)} del total${cropLabel}).`;
    } else {
      insight = `En ${periodLabel}, ${items[0].label} produce ${formatProduction(items[0].production)} (${formatPercent(items[0].share)}) y ${items[1].label} produce ${formatProduction(items[1].production)} (${formatPercent(items[1].share)})${cropLabel}.`;
    }

    footnote =
      items.length < selectedMunicipalities.length
        ? "Solo se muestran los municipios seleccionados con datos para el periodo."
        : `Comparación de ${items.length} municipios seleccionados · participación sobre el total departamental${cropLabel}.`;

    return { title, insight, footnote, items };
  }

  const top = all.slice(0, 10);
  const selected =
    selectedMunicipalities.length === 1
      ? all.find((item) => item.selected)
      : undefined;

  if (selected && !top.some((item) => item.selected)) {
    top.push(selected);
  }

  const top3 = top.slice(0, 3);
  const top3Share = top3.reduce((sum, item) => sum + item.share, 0);
  title = "¿Qué municipios producen más?";

  if (selected) {
    insight = `En ${periodLabel}, ${selected.label} representa el ${formatPercent(selected.share)} del total${cropLabel}.`;
    footnote = "El municipio seleccionado se resalta en ámbar.";
  } else if (top3.length === 0) {
    insight = "No hay datos para esta selección.";
    footnote = `Producción en ${periodLabel}.`;
  } else if (top3.length === 1) {
    insight = `En ${periodLabel}, ${top3[0].label} concentra el ${formatPercent(top3[0].share)} de la producción${cropLabel}.`;
    footnote = `Producción en ${periodLabel}.`;
  } else if (top3.length === 2) {
    insight = `En ${periodLabel}, ${top3[0].label} y ${top3[1].label} concentran el ${formatPercent(top3Share)} de la producción${cropLabel}.`;
    footnote = `Producción en ${periodLabel}.`;
  } else {
    insight = `En ${periodLabel}, ${top3[0].label}, ${top3[1].label} y ${top3[2].label} concentran el ${formatPercent(top3Share)} de la producción${cropLabel}.`;
    footnote = `Producción en ${periodLabel}.`;
  }

  return { title, insight, footnote, items: top };
}

function buildHarvest(
  rows: Row[],
  periodLabel: string,
  selectedCrops: string[],
  selectedMunicipalities: string[],
): ChartData<HarvestAggregate> {
  const items = aggregateHarvest(rows);
  const top = items[0];
  const bottom = items[items.length - 1];
  const municipalityLabel =
    selectedMunicipalities.length === 1
      ? ` en ${selectedMunicipalities[0]}`
      : selectedMunicipalities.length > 1
        ? " en los municipios seleccionados"
        : "";
  let insight: string;

  if (selectedCrops.length === 1) {
    insight = top
      ? `En ${periodLabel}${municipalityLabel}, ${selectedCrops[0]} cosechó el ${formatPercent(top.successRate)} del área sembrada.`
      : "No hay datos para esta selección.";
  } else if (selectedCrops.length > 1) {
    insight =
      top && bottom
        ? `En ${periodLabel}${municipalityLabel}, los ${selectedCrops.length} cultivos seleccionados cosecharon entre ${formatPercent(bottom.successRate)} y ${formatPercent(top.successRate)} del área sembrada.`
        : "No hay datos para esta selección.";
  } else if (!top) {
    insight = "No hay datos para esta selección.";
  } else if (items.length === 1) {
    insight = `En ${periodLabel}${municipalityLabel}, ${top.label} cosechó el ${formatPercent(top.successRate)} del área sembrada.`;
  } else {
    insight = `En ${periodLabel}${municipalityLabel}, los cultivos principales cosechan entre ${formatPercent(bottom.successRate)} y ${formatPercent(top.successRate)} del área sembrada.`;
  }

  return {
    title: "¿Qué porcentaje del área sembrada se cosecha?",
    insight,
    footnote: "100 % significa que se cosechó toda el área sembrada.",
    items,
  };
}

function buildSemestral(
  rows: Row[],
  selectedCrops: string[],
  selectedMunicipalities: string[],
): ChartData<SemestralAggregate> {
  const items = aggregateSemestral(rows);
  const cropLabel =
    selectedCrops.length === 1
      ? ` para ${selectedCrops[0]}`
      : selectedCrops.length > 1
        ? " para los cultivos seleccionados"
        : "";
  const municipalityLabel =
    selectedMunicipalities.length === 1
      ? ` en ${selectedMunicipalities[0]}`
      : selectedMunicipalities.length > 1
        ? " en los municipios seleccionados"
        : "";

  if (items.length === 0) {
    return {
      title: "¿Qué semestre produce más?",
      insight: "No hay reporte semestral para esta selección.",
      footnote: "Solo cultivos con reporte semestral (2019–2025).",
      items,
    };
  }

  if (items.length === 1) {
    const item = items[0];
    const winner =
      item.semA >= item.semB ? "primer semestre" : "segundo semestre";
    const winnerValue = Math.max(item.semA, item.semB);
    const loserValue = Math.min(item.semA, item.semB);
    return {
      title: "¿Qué semestre produce más?",
      insight: `En ${item.year}${municipalityLabel}, el ${winner} fue mayor (${formatProduction(winnerValue)} frente a ${formatProduction(loserValue)})${cropLabel}.`,
      footnote: "Solo cultivos con reporte semestral (2019–2025).",
      items,
    };
  }

  const secondGreater = items.filter((item) => item.semB > item.semA).length;
  const firstGreater = items.filter((item) => item.semA > item.semB).length;
  const insight =
    secondGreater === firstGreater
      ? `Entre 2019 y 2025 no hay una diferencia clara entre semestres${cropLabel}${municipalityLabel}.`
      : secondGreater > firstGreater
        ? `Entre 2019 y 2025, el segundo semestre fue mayor en ${secondGreater} de ${items.length} años${cropLabel}${municipalityLabel}.`
        : `Entre 2019 y 2025, el primer semestre fue mayor en ${firstGreater} de ${items.length} años${cropLabel}${municipalityLabel}.`;

  return {
    title: "¿Qué semestre produce más?",
    insight,
    footnote: "Solo cultivos con reporte semestral (2019–2025).",
    items,
  };
}

function buildTrend(
  rows: Row[],
  selectedCrops: string[],
  cropIndices: number[],
  hideCane: boolean,
  growth: number | null,
): TrendData {
  const multipleCrops = selectedCrops.length > 1;
  const totalItems = aggregateYears(rows);
  const series: TrendSeries[] = multipleCrops
    ? selectedCrops.map((label, position) => {
        const index = cropIndices[position];
        const cropRows = rows.filter((row) => row.cultivoIdx === index);

        return {
          key: String(index),
          label,
          items: aggregateYears(cropRows),
        };
      })
    : [
        {
          key: "total",
          label:
            selectedCrops.length === 1 ? selectedCrops[0] : "Producción",
          items: totalItems,
        },
      ];
  const title = multipleCrops
    ? `Evolución anual de ${joinLabels(selectedCrops, 2)}`
    : selectedCrops.length === 1
      ? `Evolución anual de ${selectedCrops[0]}`
      : hideCane
        ? "Evolución anual de la producción sin caña"
        : "Evolución anual de la producción";
  const growthInsight =
    growth === null
      ? "No hay datos suficientes para comparar 2007 y 2025."
      : `La producción ${hideCane && selectedCrops.length === 0 ? "sin caña " : ""}${growth >= 0 ? "creció" : "disminuyó"} ${formatPercent(Math.abs(growth))} entre 2007 y 2025.`;
  const insight = multipleCrops
    ? `Comparación 2007–2025 de ${selectedCrops.length} cultivos seleccionados; cada línea representa un cultivo.`
    : growthInsight;

  return {
    title,
    insight,
    footnote: "2006 no se incluye en la tendencia: fue un reporte parcial piloto.",
    items: totalItems,
    series,
    multipleCrops,
  };
}

export function buildDashboardData(
  payload: CompressedAgroPayload,
  filters: DashboardFilters,
  options: DashboardOptions,
): DashboardData {
  const rows = getRows(payload);
  const selectedMunicipalities = filters.municipios
    .map((value) => payload.dicts.municipios[Number(value)])
    .filter((label) => typeof label === "string");
  const selectedCropEntries = filters.cultivos.map((value) => ({
    index: Number(value),
    label: payload.dicts.cultivos[Number(value)],
  }));
  const selectedCrops = selectedCropEntries
    .map((entry) => entry.label)
    .filter((label) => typeof label === "string");
  const cropIndices = selectedCropEntries
    .filter((entry) => typeof entry.label === "string")
    .map((entry) => entry.index);
  const period = resolvePeriod(filters.anios);
  const isPartialYear = period.isPartial;
  const periodYears = period.years.map(String);
  const latestYear =
    filterRows(rows, {
      municipios: filters.municipios,
      cultivos: filters.cultivos,
      anios: [],
    }).reduce((max, row) => Math.max(max, row.anio), 0) || COMPARABLE_TO;

  const selectedRowsAll = dedupeYearly(
    filterRows(rows, {
      municipios: filters.municipios,
      cultivos: filters.cultivos,
      anios: periodYears,
    }),
  );
  const selectedRows = options.hideCane
    ? selectedRowsAll.filter((row) => !isCane(row))
    : selectedRowsAll;
  const totalSelected = sumProduction(selectedRows);
  const totalSelectedAll = sumProduction(selectedRowsAll);
  const trendRows = dedupeYearly(
    filterRows(rows, {
      municipios: filters.municipios,
      cultivos: filters.cultivos,
      anios: [],
    }),
  );
  const trendRowsCane = options.hideCane
    ? trendRows.filter((row) => !isCane(row))
    : trendRows;
  const productionByYearItems = aggregateYears(trendRowsCane);
  const growth = computeGrowth(productionByYearItems);
  const topCrops = aggregateCrops(selectedRows, totalSelected);
  const topCropsAll = aggregateCrops(selectedRowsAll, totalSelectedAll);
  const topCrop = topCrops[0] ?? null;
  const topCropWithoutCane =
    topCropsAll.filter((crop) => !CANE_CROPS.has(crop.label))[0] ?? null;
  const kpiRows = dedupeYearly(
    filterRows(rows, {
      municipios: filters.municipios,
      cultivos: [],
      anios: periodYears,
    }),
  );
  const kpiRowsCane = options.hideCane
    ? kpiRows.filter((row) => !isCane(row))
    : kpiRows;
  const kpiTotal = sumProduction(kpiRowsCane);
  const topCropShare =
    selectedCrops.length > 0
      ? kpiTotal > 0
        ? (totalSelected / kpiTotal) * 100
        : null
      : topCrop?.share ?? null;
  const rankingRows = dedupeYearly(
    filterRows(rows, {
      municipios: [],
      cultivos: filters.cultivos,
      anios: periodYears,
    }),
  );
  const rankingRowsCane = options.hideCane
    ? rankingRows.filter((row) => !isCane(row))
    : rankingRows;
  const municipalityTotal = sumProduction(rankingRowsCane);
  const municipalities = aggregateMunicipalities(
    rankingRowsCane,
    municipalityTotal,
    selectedMunicipalities,
  );
  const selectedMunicipalityAggregate = municipalities.find(
    (item) => item.selected,
  );
  const kpiMunicipality =
    selectedMunicipalityAggregate ?? municipalities[0] ?? null;
  const municipalityShare = kpiMunicipality?.share ?? null;
  const compositionRowsBase = dedupeYearly(
    filterRows(rows, {
      municipios: selectedCrops.length === 1 ? [] : filters.municipios,
      cultivos: filters.cultivos,
      anios: periodYears,
    }),
  );
  const compositionRows = options.hideCane
    ? compositionRowsBase.filter((row) => !isCane(row))
    : compositionRowsBase;
  const composition = buildComposition(
    compositionRows,
    compositionRowsBase,
    selectedCrops,
    selectedMunicipalities,
    period.label,
    options.hideCane,
  );
  const otherCropsRows = dedupeYearly(
    filterRows(rows, {
      municipios: filters.municipios,
      cultivos: [],
      anios: periodYears,
    }),
  ).filter((row) => !isCane(row));
  const otherCrops = buildOtherCrops(
    otherCropsRows,
    period.label,
    selectedMunicipalities,
    selectedCrops,
  );
  const productivityRows =
    selectedCrops.length === 1
      ? dedupeYearly(
          filterRows(rows, {
            municipios: [],
            cultivos: filters.cultivos,
            anios: periodYears,
          }),
        )
      : selectedRows;
  const productivity = buildProductivity(
    productivityRows,
    selectedCrops,
    selectedMunicipalities,
    period.label,
  );
  const municipalitiesData = buildMunicipalities(
    rankingRowsCane,
    period.label,
    selectedCrops,
    selectedMunicipalities,
  );
  const harvest = buildHarvest(
    selectedRows,
    period.label,
    selectedCrops,
    selectedMunicipalities,
  );
  const semestral = buildSemestral(
    filterRows(rows, filters),
    selectedCrops,
    selectedMunicipalities,
  );
  const averageYield = weightedYield(selectedRows);
  const totalAreaSown = sumAreaSown(selectedRows);
  const productionValue = totalSelected;

  return {
    selectedYears: filters.anios.map(Number),
    latestYear,
    isPartialYear,
    periodLabel: period.label,
    kpis: {
      productionValue,
      periodLabel: period.label,
      isPartialYear,
      growth,
      topCrop,
      topCropShare,
      topCropWithoutCane,
      topMunicipality: kpiMunicipality,
      municipalityShare,
      averageYield,
      totalAreaSown,
      selectedCrops,
      selectedMunicipalities,
      hideCane: options.hideCane,
    },
    composition,
    productionByYear: buildTrend(
      trendRowsCane,
      selectedCrops,
      cropIndices,
      options.hideCane,
      growth,
    ),
    otherCrops,
    productivity,
    municipalities: municipalitiesData,
    harvest,
    semestral,
    filteredRecords: selectedRows.length,
  };
}
