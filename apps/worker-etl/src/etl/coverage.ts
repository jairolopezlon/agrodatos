import type {
  AgroDataNormalized,
  CoverageReport,
  CoverageYear,
} from "@agrodatos/shared-types";
import { normalizeKey } from "./normalize.ts";

export interface CoverageThresholds {
  minRecords: number;
  expectedMunicipios: number;
  minYear: number;
  maxYear: number;
  minMunicipiosPerYear: number;
  minCultivosPerYear: number;
  warnCultivosPerYear: number;
}

export const DEFAULT_COVERAGE_THRESHOLDS: CoverageThresholds = {
  minRecords: 20_000,
  expectedMunicipios: 42,
  minYear: 2006,
  maxYear: 2025,
  minMunicipiosPerYear: 42,
  minCultivosPerYear: 20,
  warnCultivosPerYear: 50,
};

export function computeCoverage(rows: AgroDataNormalized[]): CoverageReport {
  const municipios = new Set<number>();
  const years = new Set<number>();
  const byYear = new Map<
    number,
    { municipios: Set<number>; cultivos: Set<string>; records: number }
  >();

  for (const row of rows) {
    municipios.add(row.municipioId);
    years.add(row.anio);

    const entry = byYear.get(row.anio) ?? {
      municipios: new Set<number>(),
      cultivos: new Set<string>(),
      records: 0,
    };

    entry.municipios.add(row.municipioId);
    entry.cultivos.add(normalizeKey(row.cultivo));
    entry.records += 1;
    byYear.set(row.anio, entry);
  }

  const perYear: CoverageYear[] = [...byYear.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([year, entry]) => ({
      year,
      municipios: entry.municipios.size,
      cultivos: entry.cultivos.size,
      records: entry.records,
      warnings: [],
    }));

  return {
    total_records: rows.length,
    unique_municipios: municipios.size,
    years: [...years].sort((a, b) => a - b),
    per_year: perYear,
    warnings: [],
    fatal_errors: [],
  };
}

export function validateCoverage(
  rows: AgroDataNormalized[],
  thresholds: CoverageThresholds = DEFAULT_COVERAGE_THRESHOLDS,
): CoverageReport {
  const report = computeCoverage(rows);
  const fatalErrors: string[] = [];
  const warnings: string[] = [];

  if (report.total_records < thresholds.minRecords) {
    fatalErrors.push(
      `Cobertura insuficiente: ${report.total_records} registros (mínimo ${thresholds.minRecords}).`,
    );
  }

  if (report.unique_municipios !== thresholds.expectedMunicipios) {
    fatalErrors.push(
      `Se esperaban ${thresholds.expectedMunicipios} municipios y se encontraron ${report.unique_municipios}.`,
    );
  }

  const expectedYears: number[] = [];

  for (let year = thresholds.minYear; year <= thresholds.maxYear; year += 1) {
    expectedYears.push(year);
  }

  const presentYears = new Set(report.years);
  const missingYears = expectedYears.filter((year) => !presentYears.has(year));

  if (missingYears.length > 0) {
    fatalErrors.push(`Faltan años: ${missingYears.join(", ")}.`);
  }

  for (const year of report.per_year) {
    if (year.municipios < thresholds.minMunicipiosPerYear) {
      fatalErrors.push(
        `El año ${year.year} tiene ${year.municipios} municipios (mínimo ${thresholds.minMunicipiosPerYear}).`,
      );
    }

    if (year.cultivos < thresholds.minCultivosPerYear) {
      fatalErrors.push(
        `El año ${year.year} tiene ${year.cultivos} cultivos (mínimo ${thresholds.minCultivosPerYear}).`,
      );
    } else if (year.cultivos < thresholds.warnCultivosPerYear) {
      const warning = `El año ${year.year} tiene cobertura parcial: ${year.cultivos} cultivos.`;
      year.warnings.push(warning);
      warnings.push(warning);
    }
  }

  report.fatal_errors = fatalErrors;
  report.warnings = warnings;
  return report;
}
