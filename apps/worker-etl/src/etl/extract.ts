import type {
  AgroDataNormalized,
  RawSocrataCurrent,
  RawSocrataHistorical,
} from "@agrodatos/shared-types";

const SOCRATA_BASE_URL = "https://www.datos.gov.co/resource";
const HISTORICAL_DATASET_ID = "2pnw-mmge";
const CURRENT_DATASET_ID = "uejq-wxrr";
const VALLE_DEL_CAUCA_CODE = "76";
const DEFAULT_PAGE_SIZE = 10_000;
const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_TIMEOUT_MS = 30_000;

export interface Env {
  SOCRATA_APP_TOKEN?: string;
  DB?: D1Database;
}

export interface SocrataFetchOptions {
  appToken?: string;
  pageSize?: number;
  maxRetries?: number;
  timeoutMs?: number;
  fetcher?: typeof fetch;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function normalizeNumberString(value: string): string {
  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      return value.replace(/\./g, "").replace(",", ".");
    }
    return value.replace(/,/g, "");
  }

  if (lastComma !== -1) {
    return value.replace(",", ".");
  }

  return value;
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value !== "string") {
    return 0;
  }

  const trimmed = value.trim();
  if (trimmed === "") {
    return 0;
  }

  const parsed = Number(normalizeNumberString(trimmed));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toText(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

export function adaptHistorical(row: RawSocrataHistorical): AgroDataNormalized {
  const anio = toNumber(row.a_o);

  return {
    municipioId: toNumber(row.c_d_mun),
    municipioNombre: toText(row.municipio),
    cultivo: toText(row.cultivo),
    anio,
    periodo: toText(row.periodo) || String(anio),
    areaSembrada: toNumber(row.rea_sembrada_ha),
    areaCosechada: toNumber(row.rea_cosechada_ha),
    produccion: toNumber(row.producci_n_t),
    rendimiento: toNumber(row.rendimiento_t_ha),
  };
}

export function adaptCurrent(row: RawSocrataCurrent): AgroDataNormalized {
  const anio = toNumber(row.a_o);

  return {
    municipioId: toNumber(row.c_digo_dane_municipio),
    municipioNombre: toText(row.municipio),
    cultivo: toText(row.cultivo),
    anio,
    periodo: toText(row.periodo) || String(anio),
    areaSembrada: toNumber(row.rea_sembrada),
    areaCosechada: toNumber(row.rea_cosechada),
    produccion: toNumber(row.producci_n),
    rendimiento: toNumber(row.rendimiento),
  };
}

function buildSocrataUrl(
  datasetId: string,
  filters: Record<string, string>,
  offset: number,
  pageSize: number,
): URL {
  const url = new URL(`${SOCRATA_BASE_URL}/${datasetId}.json`);

  for (const [key, value] of Object.entries(filters)) {
    url.searchParams.set(key, value);
  }

  url.searchParams.set("$limit", String(pageSize));
  url.searchParams.set("$offset", String(offset));
  url.searchParams.set("$order", ":id");

  return url;
}

async function fetchPage(
  url: URL,
  options: SocrataFetchOptions,
): Promise<Response> {
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const fetcher = options.fetcher ?? fetch;
  const headers: Record<string, string> = { Accept: "application/json" };

  if (options.appToken) {
    headers["X-App-Token"] = options.appToken;
  }

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    let response: Response;

    try {
      response = await fetcher(url.toString(), {
        headers,
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      if (attempt < maxRetries) {
        await sleep(500 * 2 ** attempt);
        continue;
      }
      throw error;
    }

    if (response.ok) {
      return response;
    }

    if (
      (response.status === 429 || response.status >= 500) &&
      attempt < maxRetries
    ) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      const delay =
        Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1000
          : 500 * 2 ** attempt;

      await sleep(delay);
      continue;
    }

    const body = await response.text().catch(() => "");
    const detail = body ? ` - ${body.slice(0, 500)}` : "";

    throw new Error(
      `Socrata request failed (${response.status} ${response.statusText}) for ${url.toString()}${detail}`,
    );
  }

  throw new Error(
    `Socrata request failed after ${maxRetries} retries: ${url.toString()}`,
  );
}

export async function fetchSocrataPaginated<T>(
  datasetId: string,
  filters: Record<string, string>,
  options: SocrataFetchOptions = {},
): Promise<T[]> {
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const rows: T[] = [];
  let offset = 0;

  while (true) {
    const url = buildSocrataUrl(datasetId, filters, offset, pageSize);
    const response = await fetchPage(url, options);

    let page: unknown;

    try {
      page = await response.json();
    } catch {
      throw new Error(
        `Socrata returned invalid JSON for ${datasetId} at offset ${offset}`,
      );
    }

    if (!Array.isArray(page)) {
      throw new Error(
        `Socrata returned a non-array JSON response for ${datasetId} at offset ${offset}`,
      );
    }

    rows.push(...(page as T[]));

    if (page.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return rows;
}

export async function extractValleDelVaucaData(
  env: Env,
): Promise<AgroDataNormalized[]> {
  const options: SocrataFetchOptions = { appToken: env.SOCRATA_APP_TOKEN };

  const [historicalRows, currentRows] = await Promise.all([
    fetchSocrataPaginated<RawSocrataHistorical>(
      HISTORICAL_DATASET_ID,
      { c_d_dep: VALLE_DEL_CAUCA_CODE },
      options,
    ),
    fetchSocrataPaginated<RawSocrataCurrent>(
      CURRENT_DATASET_ID,
      { c_digo_dane_departamento: VALLE_DEL_CAUCA_CODE },
      options,
    ),
  ]);

  return [
    ...historicalRows.map(adaptHistorical),
    ...currentRows.map(adaptCurrent),
  ];
}
