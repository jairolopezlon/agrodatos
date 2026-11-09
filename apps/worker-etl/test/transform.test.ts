import assert from "node:assert/strict";
import test from "node:test";
import type { AgroDataNormalized } from "@agrodatos/shared-types";
import { buildCompressedPayload } from "../src/etl/transform.ts";

const rows: AgroDataNormalized[] = [
  {
    municipioId: 76001,
    municipioNombre: "Cali",
    cultivo: "Acelga",
    anio: 2020,
    periodo: "2020B",
    areaSembrada: 2,
    areaCosechada: 2,
    produccion: 8,
    rendimiento: 4,
  },
  {
    municipioId: 76563,
    municipioNombre: "Pradera",
    cultivo: "Yuca",
    anio: 2019,
    periodo: "2019A",
    areaSembrada: 1,
    areaCosechada: 1,
    produccion: 10,
    rendimiento: 10,
  },
  {
    municipioId: 76001,
    municipioNombre: "Cali",
    cultivo: "Acelga",
    anio: 2020,
    periodo: "2020A",
    areaSembrada: 3,
    areaCosechada: 3,
    produccion: 12,
    rendimiento: 4,
  },
];

test("buildCompressedPayload produce diccionarios y tuplas deterministas", () => {
  const first = buildCompressedPayload(rows, {
    updatedAt: "2026-01-01T00:00:00.000Z",
  });
  const second = buildCompressedPayload(rows, {
    updatedAt: "2026-01-01T00:00:00.000Z",
  });

  assert.deepEqual(first, second);
  assert.equal(first.metadata.total_records, 3);
  assert.deepEqual(first.dicts.municipios, { 0: "Cali", 1: "Pradera" });
  assert.deepEqual(first.dicts.cultivos, { 0: "ACELGA", 1: "YUCA" });
  assert.deepEqual(first.dicts.periodos, {
    0: "2019A",
    1: "2020A",
    2: "2020B",
  });
  assert.deepEqual(first.data[0], [0, 0, 2, 2020, 2, 2, 8, 4]);
  assert.deepEqual(first.data[1], [1, 1, 0, 2019, 1, 1, 10, 10]);
  assert.deepEqual(first.data[2], [0, 0, 1, 2020, 3, 3, 12, 4]);
});

test("buildCompressedPayload maneja entrada vacía", () => {
  const payload = buildCompressedPayload([], {
    updatedAt: "2026-01-01T00:00:00.000Z",
  });

  assert.equal(payload.metadata.total_records, 0);
  assert.deepEqual(payload.dicts, {
    municipios: {},
    cultivos: {},
    periodos: {},
  });
  assert.deepEqual(payload.data, []);
});

test("buildCompressedPayload unifica variantes de cultivo", () => {
  const payload = buildCompressedPayload(
    [
      {
        municipioId: 76001,
        municipioNombre: "Cali",
        cultivo: "Café",
        anio: 2019,
        periodo: "2019A",
        areaSembrada: 1,
        areaCosechada: 1,
        produccion: 1,
        rendimiento: 1,
      },
      {
        municipioId: 76001,
        municipioNombre: "Cali",
        cultivo: "CAFE",
        anio: 2019,
        periodo: "2019B",
        areaSembrada: 2,
        areaCosechada: 2,
        produccion: 2,
        rendimiento: 2,
      },
    ],
    { updatedAt: "2026-01-01T00:00:00.000Z" },
  );

  assert.deepEqual(payload.dicts.cultivos, { 0: "CAFÉ" });
  assert.deepEqual(
    payload.data.map((tuple) => tuple[1]),
    [0, 0],
  );
});
