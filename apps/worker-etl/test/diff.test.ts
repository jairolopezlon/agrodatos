import assert from "node:assert/strict";
import test from "node:test";
import type { CompressedAgroPayload } from "@agrodatos/shared-types";
import { computeChangeSummary } from "../src/etl/diff.ts";

const active: CompressedAgroPayload = {
  metadata: {
    version: "1.0.0",
    schema_version: 1,
    updated_at: "2026-01-01T00:00:00.000Z",
    total_records: 2,
  },
  dicts: {
    municipios: { 0: "CALI" },
    cultivos: { 0: "CAFE", 1: "Café" },
    periodos: { 0: "2019A", 1: "2019B" },
  },
  data: [
    [0, 0, 0, 2019, 1, 1, 10, 10],
    [0, 1, 1, 2019, 2, 2, 20, 10],
  ],
};

const next: CompressedAgroPayload = {
  metadata: {
    version: "1.0.0",
    schema_version: 1,
    updated_at: "2026-01-02T00:00:00.000Z",
    total_records: 3,
  },
  dicts: {
    municipios: { 0: "CALI" },
    cultivos: { 0: "CAFÉ" },
    periodos: { 0: "2019A", 1: "2019B", 2: "2020A" },
  },
  data: [
    [0, 0, 0, 2019, 1, 1, 12, 10],
    [0, 0, 1, 2019, 2, 2, 20, 10],
    [0, 0, 2, 2020, 3, 3, 30, 10],
  ],
};

test("computeChangeSummary cuenta altas, bajas, cambios y sin cambios", () => {
  const summary = computeChangeSummary(active, next, "v1", "v2");

  assert.equal(summary.active_version_id, "v1");
  assert.equal(summary.new_version_id, "v2");
  assert.equal(summary.active_total_records, 2);
  assert.equal(summary.new_total_records, 3);
  assert.equal(summary.added, 1);
  assert.equal(summary.removed, 0);
  assert.equal(summary.modified, 1);
  assert.equal(summary.unchanged, 1);
  assert.deepEqual(summary.added_periodos, ["2020A"]);
  assert.deepEqual(summary.removed_periodos, []);
  assert.deepEqual(summary.added_municipios, []);
  assert.deepEqual(summary.removed_municipios, []);
  assert.deepEqual(summary.added_cultivos, []);
  assert.deepEqual(summary.removed_cultivos, []);
  assert.deepEqual(summary.normalized_cultivos, [
    { key: "CAFE", from: ["CAFE", "Café"], to: "CAFÉ" },
  ]);
  assert.equal(summary.sample_changes.length, 1);
  assert.deepEqual(summary.sample_changes[0], {
    key: "CALI | CAFÉ | 2019A",
    field: "produccion",
    from: 10,
    to: 12,
  });
  assert.equal(summary.duplicate_keys, 0);
  assert.equal(summary.schema_version_changed, false);
});

test("computeChangeSummary sin versión activa marca todo como agregado", () => {
  const summary = computeChangeSummary(null, active, null, "v1");

  assert.equal(summary.active_version_id, null);
  assert.equal(summary.active_total_records, 0);
  assert.equal(summary.added, 2);
  assert.equal(summary.removed, 0);
  assert.equal(summary.modified, 0);
  assert.equal(summary.unchanged, 0);
});

test("computeChangeSummary detecta eliminaciones y cambio de schema", () => {
  const removedPayload: CompressedAgroPayload = {
    ...next,
    metadata: { ...next.metadata, schema_version: 2, total_records: 1 },
    data: [[0, 0, 0, 2019, 1, 1, 12, 10]],
  };
  const summary = computeChangeSummary(active, removedPayload, "v1", "v2");

  assert.equal(summary.removed, 1);
  assert.equal(summary.schema_version_changed, true);
});

test("computeChangeSummary maneja claves duplicadas", () => {
  const duplicateActive: CompressedAgroPayload = {
    ...active,
    dicts: {
      municipios: { 0: "CALI" },
      cultivos: { 0: "CAFE" },
      periodos: { 0: "2019A" },
    },
    data: [
      [0, 0, 0, 2019, 1, 1, 10, 10],
      [0, 0, 0, 2019, 2, 2, 20, 10],
    ],
    metadata: { ...active.metadata, total_records: 2 },
  };
  const duplicateNext: CompressedAgroPayload = {
    ...duplicateActive,
    data: [
      [0, 0, 0, 2019, 1, 1, 10, 10],
      [0, 0, 0, 2019, 2, 2, 25, 10],
      [0, 0, 0, 2019, 3, 3, 30, 10],
    ],
    metadata: { ...duplicateActive.metadata, total_records: 3 },
  };
  const summary = computeChangeSummary(
    duplicateActive,
    duplicateNext,
    "v1",
    "v2",
  );

  assert.equal(summary.added, 1);
  assert.equal(summary.removed, 0);
  assert.equal(summary.modified, 1);
  assert.equal(summary.unchanged, 1);
  assert.equal(summary.duplicate_keys, 2);
  assert.deepEqual(summary.sample_changes[0], {
    key: "CALI | CAFE | 2019A #2",
    field: "produccion",
    from: 20,
    to: 25,
  });
});
