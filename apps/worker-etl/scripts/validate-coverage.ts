import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import {
  CURRENT_DATASET_ID,
  HISTORICAL_DATASET_ID,
  SOCRATA_BASE_URL,
  VALLE_DEL_CAUCA_CODE,
} from "../src/etl/extract.ts";
import { chooseLabel, normalizeKey } from "../src/etl/normalize.ts";

type SocrataRow = Record<string, string>;

interface DepartmentCoverage {
  total: number;
  names: Array<{ code: string; name: string; count: number }>;
}

interface MunicipalityCoverage {
  codes: string[];
  total: number;
}

interface YearCoverage {
  year: number;
  municipios: number;
  cultivos: number;
  registros: number;
  warnings: string[];
}

interface YearCoverageResult {
  years: YearCoverage[];
  total: number;
  warnings: string[];
}

interface CropCoverage {
  raw_historical: number;
  raw_current: number;
  canonical: number;
  with_variants: number;
  labels: Record<string, string>;
}

const SNAPSHOT_URL = new URL("./coverage.snapshot.json", import.meta.url);

async function querySocrata(
  datasetId: string,
  params: Record<string, string>,
): Promise<SocrataRow[]> {
  const url = new URL(`${SOCRATA_BASE_URL}/${datasetId}.json`);

  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  const response = await fetch(url);

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Socrata ${datasetId} falló (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  const json: unknown = await response.json();

  if (!Array.isArray(json)) {
    throw new Error(`Socrata ${datasetId} devolvió una respuesta no-array.`);
  }

  return json as SocrataRow[];
}

async function assertDepartment(
  datasetId: string,
  codeField: string,
  nameField: string,
): Promise<DepartmentCoverage> {
  const rows = await querySocrata(datasetId, {
    $select: `${codeField},${nameField},count(*)`,
    $group: `${codeField},${nameField}`,
    $limit: "1000",
  });
  const valleRows = rows.filter((row) =>
    normalizeKey(row[nameField] ?? "").includes("VALLE"),
  );

  if (valleRows.length === 0) {
    throw new Error(`${datasetId}: no se encontró ningún nombre tipo Valle.`);
  }

  for (const row of valleRows) {
    if (row[codeField] !== VALLE_DEL_CAUCA_CODE) {
      throw new Error(
        `${datasetId}: ${row[nameField]} tiene código ${row[codeField]}, esperado ${VALLE_DEL_CAUCA_CODE}.`,
      );
    }

    if (normalizeKey(row[nameField] ?? "") !== "VALLE DEL CAUCA") {
      throw new Error(
        `${datasetId}: nombre inesperado para Valle: ${row[nameField]}.`,
      );
    }
  }

  const codeRows = rows.filter(
    (row) => row[codeField] === VALLE_DEL_CAUCA_CODE,
  );

  if (codeRows.length !== 1) {
    throw new Error(
      `${datasetId}: se esperaba un único nombre para el código ${VALLE_DEL_CAUCA_CODE}.`,
    );
  }

  if (normalizeKey(codeRows[0][nameField] ?? "") !== "VALLE DEL CAUCA") {
    throw new Error(
      `${datasetId}: el código ${VALLE_DEL_CAUCA_CODE} tiene nombre ${codeRows[0][nameField]}.`,
    );
  }

  return {
    total: codeRows.reduce((total, row) => total + Number(row.count ?? 0), 0),
    names: valleRows.map((row) => ({
      code: row[codeField],
      name: row[nameField],
      count: Number(row.count ?? 0),
    })),
  };
}

async function assertMunicipalities(
  datasetId: string,
  codeField: string,
  municipalityField: string,
  expectedTotal: number,
): Promise<MunicipalityCoverage> {
  const rows = await querySocrata(datasetId, {
    $select: `${municipalityField},count(*)`,
    $group: municipalityField,
    $limit: "1000",
    [codeField]: VALLE_DEL_CAUCA_CODE,
  });
  const codes = new Set<string>();
  let total = 0;

  for (const row of rows) {
    const code = row[municipalityField];

    if (!/^76\d{3}$/.test(code)) {
      throw new Error(`${datasetId}: código de municipio inválido: ${code}.`);
    }

    codes.add(code);
    total += Number(row.count ?? 0);
  }

  if (codes.size !== 42) {
    throw new Error(
      `${datasetId}: se esperaban 42 municipios y se encontraron ${codes.size}.`,
    );
  }

  if (total !== expectedTotal) {
    throw new Error(
      `${datasetId}: la suma de municipios (${total}) no coincide con el total (${expectedTotal}).`,
    );
  }

  return { codes: [...codes].sort(), total };
}

async function assertYears(
  datasetId: string,
  codeField: string,
  municipalityField: string,
  cropField: string,
  yearField: string,
  minYear: number,
  maxYear: number,
  expectedTotal: number,
): Promise<YearCoverageResult> {
  const rows = await querySocrata(datasetId, {
    $select: `${yearField},count(distinct ${municipalityField}) as municipios,count(distinct ${cropField}) as cultivos,count(*) as registros`,
    $group: yearField,
    $order: yearField,
    $limit: "100",
    [codeField]: VALLE_DEL_CAUCA_CODE,
  });
  const expectedYears: number[] = [];

  for (let year = minYear; year <= maxYear; year += 1) {
    expectedYears.push(year);
  }

  const years = rows.map((row) => Number(row[yearField]));
  assert.deepEqual(years, expectedYears);

  const warnings: string[] = [];
  let total = 0;
  const perYear: YearCoverage[] = [];

  for (const row of rows) {
    const year = Number(row[yearField]);
    const municipios = Number(row.municipios);
    const cultivos = Number(row.cultivos);
    const registros = Number(row.registros);
    const yearWarnings: string[] = [];

    if (municipios !== 42) {
      throw new Error(
        `${datasetId}: el año ${year} tiene ${municipios} municipios.`,
      );
    }

    if (cultivos < 20) {
      throw new Error(
        `${datasetId}: el año ${year} tiene ${cultivos} cultivos.`,
      );
    }

    if (cultivos < 50) {
      const warning = `${datasetId}: el año ${year} tiene cobertura parcial (${cultivos} cultivos).`;
      yearWarnings.push(warning);
      warnings.push(warning);
    }

    total += registros;
    perYear.push({ year, municipios, cultivos, registros, warnings: yearWarnings });
  }

  if (total !== expectedTotal) {
    throw new Error(
      `${datasetId}: la suma por año (${total}) no coincide con el total (${expectedTotal}).`,
    );
  }

  return { years: perYear, total, warnings };
}

async function collectCrops(
  datasetId: string,
  codeField: string,
): Promise<Array<{ label: string; count: number }>> {
  const rows = await querySocrata(datasetId, {
    $select: "cultivo,count(*)",
    $group: "cultivo",
    $limit: "1000",
    [codeField]: VALLE_DEL_CAUCA_CODE,
  });

  return rows.map((row) => ({
    label: row.cultivo,
    count: Number(row.count ?? 0),
  }));
}

async function buildReport() {
  const historicalDepartment = await assertDepartment(
    HISTORICAL_DATASET_ID,
    "c_d_dep",
    "departamento",
  );
  const currentDepartment = await assertDepartment(
    CURRENT_DATASET_ID,
    "c_digo_dane_departamento",
    "departamento",
  );
  const historicalMunicipalities = await assertMunicipalities(
    HISTORICAL_DATASET_ID,
    "c_d_dep",
    "c_d_mun",
    historicalDepartment.total,
  );
  const currentMunicipalities = await assertMunicipalities(
    CURRENT_DATASET_ID,
    "c_digo_dane_departamento",
    "c_digo_dane_municipio",
    currentDepartment.total,
  );

  if (
    historicalMunicipalities.codes.join(",") !==
    currentMunicipalities.codes.join(",")
  ) {
    throw new Error(
      "Los códigos de municipio no coinciden entre la fuente histórica y la vigente.",
    );
  }

  const historicalYears = await assertYears(
    HISTORICAL_DATASET_ID,
    "c_d_dep",
    "c_d_mun",
    "cultivo",
    "a_o",
    2006,
    2018,
    historicalDepartment.total,
  );
  const currentYears = await assertYears(
    CURRENT_DATASET_ID,
    "c_digo_dane_departamento",
    "c_digo_dane_municipio",
    "cultivo",
    "a_o",
    2019,
    2025,
    currentDepartment.total,
  );
  const historicalCrops = await collectCrops(
    HISTORICAL_DATASET_ID,
    "c_d_dep",
  );
  const currentCrops = await collectCrops(
    CURRENT_DATASET_ID,
    "c_digo_dane_departamento",
  );
  const cropVariants = new Map<string, Map<string, number>>();

  for (const crop of [...historicalCrops, ...currentCrops]) {
    const key = normalizeKey(crop.label);
    const variants = cropVariants.get(key) ?? new Map<string, number>();
    variants.set(crop.label, (variants.get(crop.label) ?? 0) + crop.count);
    cropVariants.set(key, variants);
  }

  const labels = new Map<string, string>();

  for (const [key, variants] of cropVariants) {
    labels.set(key, chooseLabel(variants));
  }

  const crops: CropCoverage = {
    raw_historical: historicalCrops.length,
    raw_current: currentCrops.length,
    canonical: cropVariants.size,
    with_variants: [...cropVariants.values()].filter(
      (variants) => variants.size > 1,
    ).length,
    labels: Object.fromEntries(
      [...labels.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    ),
  };

  return {
    valle_code: VALLE_DEL_CAUCA_CODE,
    historical: {
      total: historicalDepartment.total,
      names: historicalDepartment.names,
      municipios: historicalMunicipalities.codes,
      years: historicalYears.years,
      warnings: historicalYears.warnings,
    },
    current: {
      total: currentDepartment.total,
      names: currentDepartment.names,
      municipios: currentMunicipalities.codes,
      years: currentYears.years,
      warnings: currentYears.warnings,
    },
    total: historicalDepartment.total + currentDepartment.total,
    crops,
  };
}

async function main(): Promise<void> {
  const strict = process.argv.includes("--strict");
  const update = process.argv.includes("--update");
  const report = await buildReport();

  if (update) {
    writeFileSync(SNAPSHOT_URL, `${JSON.stringify(report, null, 2)}\n`);
    console.log("Snapshot de cobertura actualizado.");
  }

  if (strict) {
    const snapshot = JSON.parse(readFileSync(SNAPSHOT_URL, "utf8"));
    assert.deepEqual(report, snapshot);
    console.log("Cobertura estricta OK.");
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
