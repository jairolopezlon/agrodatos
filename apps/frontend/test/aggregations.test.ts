import assert from "node:assert/strict";
import test from "node:test";
import type {
  AgroTuple,
  CompressedAgroPayload,
} from "@agrodatos/shared-types";
import {
  buildDashboardData,
  computeGrowth,
  dedupeYearly,
  getRows,
} from "../src/lib/aggregations.ts";

const filtersAll = {
  municipio: "all",
  cultivo: "all",
  anio: "all",
};

const visibleCane = { hideCane: false };
const hiddenCane = { hideCane: true };

function toRecord(labels: string[]): Record<number, string> {
  return Object.fromEntries(
    labels.map((label, index) => [index, label]),
  ) as Record<number, string>;
}

function tuple(
  municipioIdx: number,
  cultivoIdx: number,
  periodoIdx: number,
  anio: number,
  areaSown: number,
  areaHarvested: number,
  production: number,
): AgroTuple {
  return [
    municipioIdx,
    cultivoIdx,
    periodoIdx,
    anio,
    areaSown,
    areaHarvested,
    production,
    0,
  ];
}

function makePayload(
  municipios: string[],
  cultivos: string[],
  periodos: string[],
  data: AgroTuple[],
): CompressedAgroPayload {
  return {
    metadata: {
      version: "test",
      schema_version: 1,
      updated_at: "2026-01-01T00:00:00.000Z",
      total_records: data.length,
    },
    dicts: {
      municipios: toRecord(municipios),
      cultivos: toRecord(cultivos),
      periodos: toRecord(periodos),
    },
    data,
  };
}

test("deduplica anual sobre semestral para el mismo municipio, cultivo y año", () => {
  const payload = makePayload(
    ["MUNI A"],
    ["CAÑA"],
    ["2020", "2020A", "2020B"],
    [
      tuple(0, 0, 0, 2020, 100, 90, 900),
      tuple(0, 0, 1, 2020, 100, 90, 900),
      tuple(0, 0, 2, 2020, 100, 90, 900),
    ],
  );

  const rows = getRows(payload);
  const deduped = dedupeYearly(rows);
  assert.equal(deduped.length, 1);
  assert.equal(deduped[0].production, 900);

  const data = buildDashboardData(payload, filtersAll, visibleCane);
  assert.equal(data.selectedYear, 2020);
  assert.equal(data.kpis.productionValue, 900);
  assert.equal(data.composition.items[0].production, 900);
});

test("suma subcategorías anuales y descarta las semestrales", () => {
  const payload = makePayload(
    ["MUNI A"],
    ["MAÍZ"],
    ["2020", "2020A"],
    [
      tuple(0, 0, 0, 2020, 10, 10, 100),
      tuple(0, 0, 0, 2020, 20, 20, 200),
      tuple(0, 0, 1, 2020, 30, 30, 300),
    ],
  );

  const data = buildDashboardData(payload, filtersAll, visibleCane);
  assert.equal(data.kpis.productionValue, 300);
  assert.equal(data.composition.items[0].production, 300);
});

test("excluye 2006 de la tendencia y calcula crecimiento 2007–2025", () => {
  const payload = makePayload(
    ["MUNI A"],
    ["MAÍZ"],
    ["2006", "2007", "2025"],
    [
      tuple(0, 0, 0, 2006, 10, 10, 50),
      tuple(0, 0, 1, 2007, 10, 10, 100),
      tuple(0, 0, 2, 2025, 20, 20, 200),
    ],
  );

  const data = buildDashboardData(payload, filtersAll, visibleCane);
  assert.equal(data.selectedYear, 2025);
  assert.equal(
    data.productionByYear.items.some((item) => item.year === 2006),
    false,
  );
  assert.equal(
    data.productionByYear.items.find((item) => item.year === 2007)
      ?.production,
    100,
  );
  assert.equal(data.kpis.growth, 100);
  assert.equal(computeGrowth(data.productionByYear.items), 100);

  const partial = buildDashboardData(
    payload,
    { ...filtersAll, anio: "2006" },
    visibleCane,
  );
  assert.equal(partial.isPartialYear, true);
  assert.equal(partial.kpis.productionYear, 2006);
  assert.equal(partial.kpis.productionValue, 50);
  assert.equal(
    partial.productionByYear.items.some((item) => item.year === 2006),
    false,
  );
});

test("calcula top de cultivos con y sin caña", () => {
  const payload = makePayload(
    ["MUNI A"],
    ["CAÑA", "CAÑA AZUCARERA", "MAÍZ", "PLÁTANO"],
    ["2025"],
    [
      tuple(0, 0, 0, 2025, 100, 90, 1000),
      tuple(0, 1, 0, 2025, 100, 90, 500),
      tuple(0, 2, 0, 2025, 20, 20, 100),
      tuple(0, 3, 0, 2025, 20, 20, 50),
    ],
  );

  const visible = buildDashboardData(payload, filtersAll, visibleCane);
  assert.equal(visible.kpis.topCrop?.label, "CAÑA");
  assert.equal(visible.kpis.topCropWithoutCane?.label, "MAÍZ");
  assert.equal(
    visible.otherCrops.items.some((item) => item.label === "CAÑA"),
    false,
  );
  assert.equal(
    visible.composition.items.some((item) => item.label === "CAÑA"),
    true,
  );

  const hidden = buildDashboardData(payload, filtersAll, hiddenCane);
  assert.equal(hidden.kpis.topCrop?.label, "MAÍZ");
  assert.equal(
    hidden.composition.items.some((item) => item.label === "CAÑA"),
    false,
  );
});

test("calcula rendimiento ponderado y éxito de cosecha", () => {
  const payload = makePayload(
    ["MUNI A"],
    ["MAÍZ"],
    ["2025"],
    [
      tuple(0, 0, 0, 2025, 60, 50, 200),
      tuple(0, 0, 0, 2025, 40, 30, 100),
    ],
  );

  const data = buildDashboardData(payload, filtersAll, visibleCane);
  assert.equal(data.kpis.averageYield, 300 / 80);
  assert.equal(data.kpis.totalAreaSown, 100);
  assert.equal(data.productivity.items[0].yield, 300 / 80);
  assert.equal(data.harvest.items[0].successRate, 80);
});

test("calcula participación del municipio y adapta el filtro", () => {
  const payload = makePayload(
    ["MUNI A", "MUNI B"],
    ["MAÍZ"],
    ["2025"],
    [
      tuple(0, 0, 0, 2025, 10, 10, 60),
      tuple(1, 0, 0, 2025, 10, 10, 40),
    ],
  );

  const all = buildDashboardData(payload, filtersAll, visibleCane);
  assert.equal(all.kpis.topMunicipality?.label, "MUNI A");
  assert.equal(all.kpis.municipalityShare, 60);

  const selected = buildDashboardData(
    payload,
    { ...filtersAll, municipio: "1" },
    visibleCane,
  );
  assert.equal(selected.kpis.selectedMunicipality, "MUNI B");
  assert.equal(selected.kpis.topMunicipality?.label, "MUNI B");
  assert.equal(selected.kpis.municipalityShare, 40);
  assert.equal(selected.kpis.productionValue, 40);
});

test("adapta cultivo seleccionado a municipios y productividad", () => {
  const payload = makePayload(
    ["MUNI A", "MUNI B"],
    ["MAÍZ", "CAFÉ"],
    ["2025"],
    [
      tuple(0, 0, 0, 2025, 10, 10, 100),
      tuple(1, 0, 0, 2025, 10, 10, 50),
      tuple(0, 1, 0, 2025, 10, 10, 300),
    ],
  );

  const data = buildDashboardData(
    payload,
    { ...filtersAll, cultivo: "0" },
    visibleCane,
  );
  assert.equal(data.kpis.selectedCrop, "MAÍZ");
  assert.equal(data.kpis.topCrop?.label, "MAÍZ");
  assert.equal(data.kpis.productionValue, 150);
  assert.equal(data.composition.dimension, "municipio");
  assert.equal(data.composition.title, "¿Dónde se produce MAÍZ?");
  assert.equal(data.productivity.dimension, "municipio");
  assert.equal(data.municipalities.items.length, 2);
});

test("compara semestres sin doble conteo anual", () => {
  const payload = makePayload(
    ["MUNI A"],
    ["MAÍZ"],
    ["2020", "2020A", "2020B"],
    [
      tuple(0, 0, 0, 2020, 100, 90, 999),
      tuple(0, 0, 1, 2020, 100, 90, 100),
      tuple(0, 0, 2, 2020, 100, 90, 150),
    ],
  );

  const data = buildDashboardData(payload, filtersAll, visibleCane);
  assert.equal(data.kpis.productionValue, 999);
  assert.deepEqual(data.semestral.items, [
    { year: 2020, semA: 100, semB: 150 },
  ]);
});
