import type {
  AgroChangeSample,
  AgroChangeSummary,
  CompressedAgroPayload,
} from "@agrodatos/shared-types";
import { normalizeKey } from "./normalize.ts";

interface RecordValues {
  areaSembrada: number;
  areaCosechada: number;
  produccion: number;
  rendimiento: number;
}

interface RecordGroup {
  label: string;
  records: RecordValues[];
}

interface ParsedPayload {
  records: Map<string, RecordGroup>;
  duplicateKeys: number;
  municipios: Map<string, string>;
  cultivos: Map<string, Set<string>>;
  periodos: Map<string, string>;
}

const SAMPLE_LIMIT = 50;

function indexToLabel(record: Record<number, string>): Map<number, string> {
  const labels = new Map<number, string>();

  for (const [index, label] of Object.entries(record)) {
    labels.set(Number(index), label);
  }

  return labels;
}

function compareValues(a: RecordValues, b: RecordValues): number {
  return (
    a.areaSembrada - b.areaSembrada ||
    a.areaCosechada - b.areaCosechada ||
    a.produccion - b.produccion ||
    a.rendimiento - b.rendimiento
  );
}

function parsePayload(payload: CompressedAgroPayload): ParsedPayload {
  const municipioByIndex = indexToLabel(payload.dicts.municipios);
  const cultivoByIndex = indexToLabel(payload.dicts.cultivos);
  const periodoByIndex = indexToLabel(payload.dicts.periodos);
  const records = new Map<string, RecordGroup>();
  const municipios = new Map<string, string>();
  const cultivos = new Map<string, Set<string>>();
  const periodos = new Map<string, string>();

  for (const tuple of payload.data) {
    const [
      municipioIdx,
      cultivoIdx,
      periodoIdx,
      ,
      areaSembrada,
      areaCosechada,
      produccion,
      rendimiento,
    ] = tuple;
    const municipioLabel =
      municipioByIndex.get(municipioIdx) ?? String(municipioIdx);
    const cultivoLabel = cultivoByIndex.get(cultivoIdx) ?? String(cultivoIdx);
    const periodoLabel = periodoByIndex.get(periodoIdx) ?? String(periodoIdx);
    const municipioKey = normalizeKey(municipioLabel);
    const cultivoKey = normalizeKey(cultivoLabel);
    const periodoKey = normalizeKey(periodoLabel);
    const key = `${municipioKey}|${cultivoKey}|${periodoKey}`;

    municipios.set(municipioKey, municipioLabel);
    periodos.set(periodoKey, periodoLabel);

    const labels = cultivos.get(cultivoKey) ?? new Set<string>();
    labels.add(cultivoLabel);
    cultivos.set(cultivoKey, labels);

    const group = records.get(key) ?? {
      label: `${municipioLabel} | ${cultivoLabel} | ${periodoLabel}`,
      records: [],
    };

    group.records.push({
      areaSembrada,
      areaCosechada,
      produccion,
      rendimiento,
    });
    records.set(key, group);
  }

  let duplicateKeys = 0;

  for (const group of records.values()) {
    group.records.sort(compareValues);
    duplicateKeys += Math.max(0, group.records.length - 1);
  }

  return { records, duplicateKeys, municipios, cultivos, periodos };
}

function compareRecord(
  key: string,
  current: RecordValues,
  next: RecordValues,
  samples: AgroChangeSample[],
): boolean {
  const fields: Array<AgroChangeSample["field"]> = [
    "areaSembrada",
    "areaCosechada",
    "produccion",
    "rendimiento",
  ];
  let changed = false;

  for (const field of fields) {
    if (current[field] === next[field]) {
      continue;
    }

    changed = true;

    if (samples.length < SAMPLE_LIMIT) {
      samples.push({
        key,
        field,
        from: current[field],
        to: next[field],
      });
    }
  }

  return changed;
}

function diffSets(
  previous: Map<string, string>,
  next: Map<string, string>,
): { added: string[]; removed: string[] } {
  const added = [...next.entries()]
    .filter(([key]) => !previous.has(key))
    .map(([, label]) => label)
    .sort();
  const removed = [...previous.entries()]
    .filter(([key]) => !next.has(key))
    .map(([, label]) => label)
    .sort();

  return { added, removed };
}

export function computeChangeSummary(
  activePayload: CompressedAgroPayload | null,
  nextPayload: CompressedAgroPayload,
  activeVersionId: string | null,
  newVersionId: string,
): AgroChangeSummary {
  const previous = activePayload ? parsePayload(activePayload) : null;
  const next = parsePayload(nextPayload);
  const samples: AgroChangeSample[] = [];
  let added = 0;
  let removed = 0;
  let modified = 0;
  let unchanged = 0;

  for (const [key, group] of next.records) {
    const previousGroup = previous?.records.get(key);

    if (!previousGroup) {
      added += group.records.length;
      continue;
    }

    const pairCount = Math.min(
      previousGroup.records.length,
      group.records.length,
    );
    const hasDuplicates =
      previousGroup.records.length > 1 || group.records.length > 1;

    for (let index = 0; index < pairCount; index += 1) {
      const sampleKey = hasDuplicates
        ? `${group.label} #${index + 1}`
        : group.label;

      if (
        compareRecord(
          sampleKey,
          previousGroup.records[index],
          group.records[index],
          samples,
        )
      ) {
        modified += 1;
      } else {
        unchanged += 1;
      }
    }

    added += Math.max(0, group.records.length - pairCount);
    removed += Math.max(0, previousGroup.records.length - pairCount);
  }

  if (previous) {
    for (const [key, group] of previous.records) {
      if (!next.records.has(key)) {
        removed += group.records.length;
      }
    }
  }

  const previousMunicipios = previous?.municipios ?? new Map<string, string>();
  const previousPeriodos = previous?.periodos ?? new Map<string, string>();
  const previousCultivos = previous?.cultivos ?? new Map<string, Set<string>>();
  const municipioDiff = diffSets(previousMunicipios, next.municipios);
  const periodoDiff = diffSets(previousPeriodos, next.periodos);
  const addedCultivos = [...next.cultivos.keys()]
    .filter((key) => !previousCultivos.has(key))
    .sort();
  const removedCultivos = [...previousCultivos.keys()]
    .filter((key) => !next.cultivos.has(key))
    .sort();
  const normalizedCultivos: AgroChangeSummary["normalized_cultivos"] = [];

  for (const [key, labels] of next.cultivos) {
    const previousLabels = previousCultivos.get(key);

    if (!previousLabels) {
      continue;
    }

    const nextLabel = [...labels][0] ?? key;
    const previousLabelList = [...previousLabels].sort();

    if (
      previousLabelList.length > 1 ||
      previousLabelList[0] !== nextLabel
    ) {
      normalizedCultivos.push({
        key,
        from: previousLabelList,
        to: nextLabel,
      });
    }
  }

  normalizedCultivos.sort((a, b) => a.key.localeCompare(b.key));

  return {
    active_version_id: activeVersionId,
    new_version_id: newVersionId,
    active_total_records: activePayload?.metadata.total_records ?? 0,
    new_total_records: nextPayload.metadata.total_records,
    added,
    removed,
    modified,
    unchanged,
    added_municipios: municipioDiff.added,
    removed_municipios: municipioDiff.removed,
    added_cultivos: addedCultivos,
    removed_cultivos: removedCultivos,
    normalized_cultivos: normalizedCultivos,
    added_periodos: periodoDiff.added,
    removed_periodos: periodoDiff.removed,
    sample_changes: samples,
    duplicate_keys: next.duplicateKeys,
    schema_version_changed:
      activePayload !== null &&
      activePayload.metadata.schema_version !==
        nextPayload.metadata.schema_version,
  };
}
