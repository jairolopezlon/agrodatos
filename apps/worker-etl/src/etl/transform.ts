import type {
  AgroDataNormalized,
  AgroTuple,
  CompressedAgroPayload,
} from "@agrodatos/shared-types";
import { chooseLabel, normalizeKey } from "./normalize.ts";

export interface TransformOptions {
  version?: string;
  schemaVersion?: number;
  updatedAt?: string;
}

function toRecord(values: string[]): Record<number, string> {
  const record: Record<number, string> = {};

  values.forEach((value, index) => {
    record[index] = value;
  });

  return record;
}

function periodoKey(periodo: string): [number, string] {
  const match = /^(\d{4})(.*)$/.exec(periodo);
  return match ? [Number(match[1]), match[2]] : [0, periodo];
}

function comparePeriodos(a: string, b: string): number {
  const [yearA, suffixA] = periodoKey(a);
  const [yearB, suffixB] = periodoKey(b);

  if (yearA !== yearB) {
    return yearA - yearB;
  }

  if (suffixA < suffixB) {
    return -1;
  }

  if (suffixA > suffixB) {
    return 1;
  }

  return 0;
}

export function buildCompressedPayload(
  rows: AgroDataNormalized[],
  options: TransformOptions = {},
): CompressedAgroPayload {
  const municipioNameById = new Map<number, string>();
  const cultivoVariants = new Map<string, Map<string, number>>();
  const periodoSet = new Set<string>();

  for (const row of rows) {
    if (!municipioNameById.has(row.municipioId)) {
      municipioNameById.set(row.municipioId, row.municipioNombre);
    }

    const cultivoKey = normalizeKey(row.cultivo);
    const variants = cultivoVariants.get(cultivoKey) ?? new Map<string, number>();
    variants.set(row.cultivo, (variants.get(row.cultivo) ?? 0) + 1);
    cultivoVariants.set(cultivoKey, variants);

    periodoSet.add(row.periodo);
  }

  const municipioIds = [...municipioNameById.keys()].sort((a, b) => a - b);
  const cultivoKeys = [...cultivoVariants.keys()].sort((a, b) =>
    a.localeCompare(b, "es"),
  );
  const periodos = [...periodoSet].sort(comparePeriodos);

  const municipioIndex = new Map<number, number>(
    municipioIds.map((id, index) => [id, index]),
  );
  const cultivoIndex = new Map<string, number>(
    cultivoKeys.map((key, index) => [key, index]),
  );
  const periodoIndex = new Map<string, number>(
    periodos.map((periodo, index) => [periodo, index]),
  );

  const data: AgroTuple[] = rows.map((row) => [
    municipioIndex.get(row.municipioId) ?? 0,
    cultivoIndex.get(normalizeKey(row.cultivo)) ?? 0,
    periodoIndex.get(row.periodo) ?? 0,
    row.anio,
    row.areaSembrada,
    row.areaCosechada,
    row.produccion,
    row.rendimiento,
  ]);

  return {
    metadata: {
      version: options.version ?? "1.0.0",
      schema_version: options.schemaVersion ?? 1,
      updated_at: options.updatedAt ?? new Date().toISOString(),
      total_records: data.length,
    },
    dicts: {
      municipios: toRecord(
        municipioIds.map((id) => municipioNameById.get(id) ?? ""),
      ),
      cultivos: toRecord(
        cultivoKeys.map((key) =>
          chooseLabel(cultivoVariants.get(key) ?? new Map<string, number>()),
        ),
      ),
      periodos: toRecord(periodos),
    },
    data,
  };
}
