import assert from "node:assert/strict";
import test from "node:test";
import type { AgroDataNormalized } from "@agrodatos/shared-types";
import {
  computeCoverage,
  validateCoverage,
  type CoverageThresholds,
} from "../src/etl/coverage.ts";

function makeRows(): AgroDataNormalized[] {
  const rows: AgroDataNormalized[] = [];

  for (let year = 2006; year <= 2025; year += 1) {
    for (let municipio = 0; municipio < 42; municipio += 1) {
      rows.push({
        municipioId: 76001 + municipio,
        municipioNombre: `Municipio ${municipio}`,
        cultivo: `Cultivo ${municipio % 24}`,
        anio: year,
        periodo: `${year}A`,
        areaSembrada: 1,
        areaCosechada: 1,
        produccion: 1,
        rendimiento: 1,
      });
    }
  }

  return rows;
}

const thresholds: CoverageThresholds = {
  minRecords: 0,
  expectedMunicipios: 42,
  minYear: 2006,
  maxYear: 2025,
  minMunicipiosPerYear: 42,
  minCultivosPerYear: 20,
  warnCultivosPerYear: 50,
};

test("computeCoverage calcula municipios, años y métricas por año", () => {
  const report = computeCoverage(makeRows());

  assert.equal(report.total_records, 840);
  assert.equal(report.unique_municipios, 42);
  assert.equal(report.years.length, 20);
  assert.equal(report.per_year[0].year, 2006);
  assert.equal(report.per_year[0].municipios, 42);
  assert.equal(report.per_year[0].cultivos, 24);
  assert.equal(report.per_year[0].records, 42);
});

test("validateCoverage acepta cobertura completa y marca años parciales", () => {
  const report = validateCoverage(makeRows(), thresholds);

  assert.deepEqual(report.fatal_errors, []);
  assert.equal(report.warnings.length, 20);
  assert.equal(
    report.warnings[0],
    "El año 2006 tiene cobertura parcial: 24 cultivos.",
  );
});

test("validateCoverage falla si falta un año", () => {
  const rows = makeRows().filter((row) => row.anio !== 2010);
  const report = validateCoverage(rows, thresholds);

  assert.equal(
    report.fatal_errors.some((error) => error.includes("Faltan años: 2010")),
    true,
  );
});

test("validateCoverage falla si un año pierde municipios", () => {
  const rows = makeRows().filter(
    (row) => !(row.anio === 2010 && row.municipioId === 76001),
  );
  const report = validateCoverage(rows, thresholds);

  assert.equal(
    report.fatal_errors.some((error) =>
      error.includes("El año 2010 tiene 41 municipios"),
    ),
    true,
  );
});

test("validateCoverage falla si un año pierde cultivos", () => {
  const rows = makeRows().map((row) => ({ ...row, cultivo: "Solo" }));
  const report = validateCoverage(rows, thresholds);

  assert.equal(
    report.fatal_errors.some((error) =>
      error.includes("El año 2006 tiene 1 cultivos"),
    ),
    true,
  );
});

test("validateCoverage aplica el mínimo de registros por defecto", () => {
  const report = validateCoverage(makeRows());

  assert.equal(
    report.fatal_errors.some((error) =>
      error.includes("Cobertura insuficiente: 840 registros"),
    ),
    true,
  );
});
