import type { CompressedAgroPayload } from "@agrodatos/shared-types";
import {
  formatPercent,
  formatProduction,
  formatYield,
} from "./format.ts";

export interface DashboardFilters {
  municipio: string;
  cultivo: string;
  anio: string;
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

export interface KpiData {
  productionValue: number;
  productionYear: number;
  isPartialYear: boolean;
  growth: number | null;
  topCrop: CropAggregate | null;
  topCropShare: number | null;
  topCropWithoutCane: CropAggregate | null;
  topMunicipality: MunicipalityAggregate | null;
  municipalityShare: number | null;
  averageYield: number | null;
  totalAreaSown: number;
  selectedCrop: string | null;
  selectedMunicipality: string | null;
  hideCane: boolean;
}

export interface DashboardData {
  selectedYear: number;
  latestYear: number;
  isPartialYear: boolean;
  kpis: KpiData;
  composition: CompositionData;
  productionByYear: ChartData<YearAggregate>;
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

const CANE_CROPS = new Set(["CAÑA", "CAÑA AZUCARERA"]);
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

export function filterRows(
  rows: Row[],
  filters: DashboardFilters,
): Row[] {
  const municipioIdx =
    filters.municipio === "all" ? null : Number(filters.municipio);
  const cultivoIdx =
    filters.cultivo === "all" ? null : Number(filters.cultivo);
  const anio = filters.anio === "all" ? null : Number(filters.anio);

  return rows.filter(
    (row) =>
      (municipioIdx === null || row.municipioIdx === municipioIdx) &&
      (cultivoIdx === null || row.cultivoIdx === cultivoIdx) &&
      (anio === null || row.anio === anio),
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
  selectedMunicipality: string | null = null,
): MunicipalityAggregate[] {
  const map = new Map<string, MunicipalityEntry>();

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
      selected: entry.label === selectedMunicipality,
    }))
    .sort((a, b) => b.production - a.production);
}

export function aggregateYears(
  rows: Row[],
  from = 2007,
  to = 2025,
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
  const first = series.find((item) => item.year === 2007)?.production ?? null;
  const last = series.find((item) => item.year === 2025)?.production ?? null;

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
  selectedCrop: string | null,
  selectedMunicipality: string | null,
  selectedYear: number,
  hideCane: boolean,
): CompositionData {
  const total = sumProduction(rows);
  const allTotal = sumProduction(allRows);
  const caneShare =
    allTotal > 0
      ? (sumProduction(allRows.filter(isCane)) / allTotal) * 100
      : 0;
  const dimension = selectedCrop ? "municipio" : "cultivo";
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

  if (dimension === "municipio") {
    return {
      dimension,
      dimensionLabel: "Municipio",
      title: `¿Dónde se produce ${selectedCrop}?`,
      insight: top1
        ? `El ${formatPercent(top3Share)} de ${selectedCrop} se produce en ${top1.label}${top2 ? `, ${top2.label}` : ""}${top3 ? ` y ${top3.label}` : ""}.`
        : "No hay datos para esta selección.",
      footnote: `Participación dentro de ${selectedCrop} · ${selectedYear}.`,
      items: slices,
    };
  }

  if (selectedMunicipality) {
    const insight = hideCane
      ? top1
        ? `Sin caña, ${top1.label} representa el ${formatPercent(top1.share)} de la producción. Le siguen ${top2?.label ?? "otros cultivos"}.`
        : "No hay datos para esta selección."
      : caneShare > 0
        ? `La caña representa el ${formatPercent(caneShare)} de la producción de ${selectedMunicipality}. Sin caña, ${nonCaneTop[0]?.label ?? "otros cultivos"} lidera.`
        : top1
          ? `En ${selectedMunicipality}, ${top1.label} representa el ${formatPercent(top1.share)} de la producción.`
          : "No hay datos para esta selección.";

    return {
      dimension,
      dimensionLabel: "Cultivo",
      title: `¿Qué produce ${selectedMunicipality}?`,
      insight,
      footnote: hideCane
        ? `Año ${selectedYear}. Vista sin caña.`
        : `Año ${selectedYear}.`,
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
      ? `Año ${selectedYear}. Vista sin caña.`
      : `Año ${selectedYear}. La caña incluye caña azucarera y caña panelera.`,
    items: slices,
  };
}

function buildOtherCrops(
  rows: Row[],
  selectedYear: number,
  selectedMunicipality: string | null,
  selectedCrop: string | null,
): ChartData<CropAggregate> {
  const items = aggregateCrops(rows).slice(0, 10);
  const top = items.slice(0, 3).map((item) => item.label);
  let insight: string;

  if (selectedCrop !== null) {
    insight = `Estás viendo ${selectedCrop}. Quita el filtro de cultivo para comparar con otros cultivos.`;
  } else if (top.length === 0) {
    insight = "No hay datos para esta selección.";
  } else if (top.length === 1) {
    insight = `Sin caña, ${top[0]} lidera la producción en ${selectedYear}${selectedMunicipality ? ` en ${selectedMunicipality}` : ""}.`;
  } else if (top.length === 2) {
    insight = `Sin caña, ${top[0]} y ${top[1]} lideran la producción en ${selectedYear}${selectedMunicipality ? ` en ${selectedMunicipality}` : ""}.`;
  } else {
    insight = `Sin caña, ${top[0]}, ${top[1]} y ${top[2]} lideran la producción en ${selectedYear}${selectedMunicipality ? ` en ${selectedMunicipality}` : ""}.`;
  }

  return {
    title: "¿Qué otros cultivos producen más?",
    insight,
    footnote: `Sin caña · ${selectedYear}`,
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
  selectedCrop: string | null,
  selectedMunicipality: string | null,
  selectedYear: number,
): ProductivityData {
  if (selectedCrop) {
    const items = aggregateProductivity(rows, "municipio");
    const insight = productivityInsight(
      `Entre los principales productores de ${selectedCrop},`,
      items,
    );

    return {
      dimension: "municipio",
      dimensionLabel: "Municipio",
      title: `¿Dónde se produce más ${selectedCrop} por hectárea?`,
      insight,
      footnote: `${selectedYear} · solo los 10 principales por producción`,
      items,
    };
  }

  const items = aggregateProductivity(rows, "cultivo");
  const insight = productivityInsight(
    `Entre los cultivos principales${selectedMunicipality ? ` de ${selectedMunicipality}` : ""},`,
    items,
  );

  return {
    dimension: "cultivo",
    dimensionLabel: "Cultivo",
    title: "¿Qué cultivos producen más por hectárea?",
    insight,
    footnote: `Sin caña · ${selectedYear} · solo los 10 principales por producción`,
    items,
  };
}

function buildMunicipalities(
  rows: Row[],
  selectedYear: number,
  selectedCrop: string | null,
  selectedMunicipality: string | null,
): ChartData<MunicipalityAggregate> {
  const all = aggregateMunicipalities(
    rows,
    sumProduction(rows),
    selectedMunicipality,
  );
  const top = all.slice(0, 10);
  const selected = selectedMunicipality
    ? all.find((item) => item.selected)
    : undefined;

  if (selected && !top.some((item) => item.selected)) {
    top.push(selected);
  }

  const top3 = top.slice(0, 3);
  const top3Share = top3.reduce((sum, item) => sum + item.share, 0);
  const cropLabel = selectedCrop ? ` de ${selectedCrop}` : "";
  let insight: string;

  if (selectedMunicipality) {
    insight = selected
      ? `En ${selectedYear}, ${selectedMunicipality} representa el ${formatPercent(selected.share)} del total${cropLabel}.`
      : "No hay datos para esta selección.";
  } else if (top3.length === 0) {
    insight = "No hay datos para esta selección.";
  } else if (top3.length === 1) {
    insight = `En ${selectedYear}, ${top3[0].label} concentra el ${formatPercent(top3[0].share)} de la producción${cropLabel}.`;
  } else if (top3.length === 2) {
    insight = `En ${selectedYear}, ${top3[0].label} y ${top3[1].label} concentran el ${formatPercent(top3Share)} de la producción${cropLabel}.`;
  } else {
    insight = `En ${selectedYear}, ${top3[0].label}, ${top3[1].label} y ${top3[2].label} concentran el ${formatPercent(top3Share)} de la producción${cropLabel}.`;
  }

  return {
    title: "¿Qué municipios producen más?",
    insight,
    footnote: selectedMunicipality
      ? "El municipio seleccionado se resalta en ámbar."
      : `Producción en ${selectedYear}.`,
    items: top,
  };
}

function buildHarvest(
  rows: Row[],
  selectedYear: number,
  selectedCrop: string | null,
  selectedMunicipality: string | null,
): ChartData<HarvestAggregate> {
  const items = aggregateHarvest(rows);
  const top = items[0];
  const bottom = items[items.length - 1];
  let insight: string;

  if (selectedCrop) {
    insight = top
      ? `En ${selectedYear}, ${selectedCrop} cosechó el ${formatPercent(top.successRate)} del área sembrada.`
      : "No hay datos para esta selección.";
  } else if (!top) {
    insight = "No hay datos para esta selección.";
  } else if (items.length === 1) {
    insight = `En ${selectedYear}${selectedMunicipality ? ` en ${selectedMunicipality}` : ""}, ${top.label} cosechó el ${formatPercent(top.successRate)} del área sembrada.`;
  } else {
    insight = `En ${selectedYear}${selectedMunicipality ? ` en ${selectedMunicipality}` : ""}, los cultivos principales cosechan entre ${formatPercent(bottom.successRate)} y ${formatPercent(top.successRate)} del área sembrada.`;
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
  selectedCrop: string | null,
  selectedMunicipality: string | null,
): ChartData<SemestralAggregate> {
  const items = aggregateSemestral(rows);

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
      insight: `En ${item.year}${selectedMunicipality ? ` en ${selectedMunicipality}` : ""}, el ${winner} fue mayor (${formatProduction(winnerValue)} frente a ${formatProduction(loserValue)}).`,
      footnote: "Solo cultivos con reporte semestral (2019–2025).",
      items,
    };
  }

  const secondGreater = items.filter((item) => item.semB > item.semA).length;
  const firstGreater = items.filter((item) => item.semA > item.semB).length;
  const insight =
    secondGreater === firstGreater
      ? `Entre 2019 y 2025 no hay una diferencia clara entre semestres${selectedCrop ? ` para ${selectedCrop}` : ""}.`
      : secondGreater > firstGreater
        ? `Entre 2019 y 2025, el segundo semestre fue mayor en ${secondGreater} de ${items.length} años${selectedCrop ? ` para ${selectedCrop}` : ""}.`
        : `Entre 2019 y 2025, el primer semestre fue mayor en ${firstGreater} de ${items.length} años${selectedCrop ? ` para ${selectedCrop}` : ""}.`;

  return {
    title: "¿Qué semestre produce más?",
    insight,
    footnote: "Solo cultivos con reporte semestral (2019–2025).",
    items,
  };
}

export function buildDashboardData(
  payload: CompressedAgroPayload,
  filters: DashboardFilters,
  options: DashboardOptions,
): DashboardData {
  const rows = getRows(payload);
  const selectedMunicipality =
    filters.municipio === "all"
      ? null
      : (payload.dicts.municipios[Number(filters.municipio)] ?? null);
  const selectedCrop =
    filters.cultivo === "all"
      ? null
      : (payload.dicts.cultivos[Number(filters.cultivo)] ?? null);
  const selectionRows = filterRows(rows, { ...filters, anio: "all" });
  const latestYear =
    selectionRows.reduce((max, row) => Math.max(max, row.anio), 0) || 2025;
  const selectedYear =
    filters.anio === "all" ? latestYear : Number(filters.anio);
  const isPartialYear = selectedYear === 2006;
  const yearFilter = String(selectedYear);
  const selectedRowsAll = dedupeYearly(
    filterRows(rows, { ...filters, anio: yearFilter }),
  );
  const selectedRows = options.hideCane
    ? selectedRowsAll.filter((row) => !isCane(row))
    : selectedRowsAll;
  const totalSelected = sumProduction(selectedRows);
  const totalSelectedAll = sumProduction(selectedRowsAll);
  const trendRows = dedupeYearly(
    filterRows(rows, { ...filters, anio: "all" }),
  );
  const trendRowsCane = options.hideCane
    ? trendRows.filter((row) => !isCane(row))
    : trendRows;
  const productionByYearItems = aggregateYears(trendRowsCane, 2007, 2025);
  const growth = computeGrowth(productionByYearItems);
  const topCrops = aggregateCrops(selectedRows, totalSelected);
  const topCropsAll = aggregateCrops(selectedRowsAll, totalSelectedAll);
  const topCrop = topCrops[0] ?? null;
  const topCropWithoutCane =
    topCropsAll.filter((crop) => !CANE_CROPS.has(crop.label))[0] ?? null;
  const kpiRows = dedupeYearly(
    filterRows(rows, {
      ...filters,
      cultivo: "all",
      anio: yearFilter,
    }),
  );
  const kpiRowsCane = options.hideCane
    ? kpiRows.filter((row) => !isCane(row))
    : kpiRows;
  const kpiTotal = sumProduction(kpiRowsCane);
  const topCropShare = selectedCrop
    ? kpiTotal > 0
      ? (totalSelected / kpiTotal) * 100
      : null
    : topCrop?.share ?? null;
  const rankingRows = dedupeYearly(
    filterRows(rows, {
      ...filters,
      municipio: "all",
      anio: yearFilter,
    }),
  );
  const rankingRowsCane = options.hideCane
    ? rankingRows.filter((row) => !isCane(row))
    : rankingRows;
  const municipalityTotal = sumProduction(rankingRowsCane);
  const municipalities = aggregateMunicipalities(
    rankingRowsCane,
    municipalityTotal,
    selectedMunicipality,
  );
  const topMunicipality = municipalities[0] ?? null;
  const selectedMunicipalityAggregate = selectedMunicipality
    ? municipalities.find((item) => item.selected) ?? null
    : null;
  const kpiMunicipality =
    selectedMunicipalityAggregate ?? topMunicipality;
  const municipalityShare = kpiMunicipality?.share ?? null;
  const compositionRowsBase = dedupeYearly(
    filterRows(rows, {
      municipio: selectedCrop ? "all" : filters.municipio,
      cultivo: filters.cultivo,
      anio: yearFilter,
    }),
  );
  const compositionRows = options.hideCane
    ? compositionRowsBase.filter((row) => !isCane(row))
    : compositionRowsBase;
  const composition = buildComposition(
    compositionRows,
    compositionRowsBase,
    selectedCrop,
    selectedMunicipality,
    selectedYear,
    options.hideCane,
  );
  const otherCrops = buildOtherCrops(
    selectedRowsAll.filter((row) => !isCane(row)),
    selectedYear,
    selectedMunicipality,
    selectedCrop,
  );
  const productivityRows = selectedCrop
    ? dedupeYearly(
        filterRows(rows, {
          municipio: "all",
          cultivo: filters.cultivo,
          anio: yearFilter,
        }),
      )
    : selectedRowsAll.filter((row) => !isCane(row));
  const productivity = buildProductivity(
    productivityRows,
    selectedCrop,
    selectedMunicipality,
    selectedYear,
  );
  const municipalitiesData = buildMunicipalities(
    rankingRowsCane,
    selectedYear,
    selectedCrop,
    selectedMunicipality,
  );
  const harvest = buildHarvest(
    selectedRows,
    selectedYear,
    selectedCrop,
    selectedMunicipality,
  );
  const semestral = buildSemestral(
    filterRows(rows, filters),
    selectedCrop,
    selectedMunicipality,
  );
  const averageYield = weightedYield(selectedRows);
  const totalAreaSown = sumAreaSown(selectedRows);
  const productionValue = totalSelected;
  const growthInsight =
    growth === null
      ? "No hay datos suficientes para comparar 2007 y 2025."
      : `La producción ${options.hideCane ? "sin caña " : ""}${growth >= 0 ? "creció" : "disminuyó"} ${formatPercent(Math.abs(growth))} entre 2007 y 2025.`;

  return {
    selectedYear,
    latestYear,
    isPartialYear,
    kpis: {
      productionValue,
      productionYear: selectedYear,
      isPartialYear,
      growth,
      topCrop,
      topCropShare,
      topCropWithoutCane,
      topMunicipality: kpiMunicipality,
      municipalityShare,
      averageYield,
      totalAreaSown,
      selectedCrop,
      selectedMunicipality,
      hideCane: options.hideCane,
    },
    composition,
    productionByYear: {
      title: options.hideCane
        ? "Evolución anual de la producción sin caña"
        : "Evolución anual de la producción",
      insight: growthInsight,
      footnote: "2006 no se incluye en la tendencia: fue un reporte parcial piloto.",
      items: productionByYearItems,
    },
    otherCrops,
    productivity,
    municipalities: municipalitiesData,
    harvest,
    semestral,
    filteredRecords: selectedRows.length,
  };
}
