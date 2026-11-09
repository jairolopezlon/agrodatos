import assert from "node:assert/strict";
import test from "node:test";
import type { CompressedAgroPayload } from "@agrodatos/shared-types";
import {
  buildVersion,
  buildVersionId,
  canonicalize,
  gzipJson,
  sha256Hex,
} from "../src/etl/version.ts";

const payload: CompressedAgroPayload = {
  metadata: {
    version: "1.0.0",
    schema_version: 1,
    updated_at: "2026-01-01T00:00:00.000Z",
    total_records: 1,
  },
  dicts: {
    municipios: { 0: "Cali" },
    cultivos: { 0: "Acelga" },
    periodos: { 0: "2019A" },
  },
  data: [[0, 0, 0, 2019, 3, 3, 12, 4]],
};

test("sha256Hex conoce el hash de abc", async () => {
  assert.equal(
    await sha256Hex("abc"),
    "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
  );
});

test("canonicalize excluye metadatos volátiles", () => {
  const canonical = canonicalize(payload);

  assert.equal(canonical.includes("updated_at"), false);
  assert.equal(canonical.includes("schema_version"), true);
  assert.equal(canonical.includes("dicts"), true);
  assert.equal(canonical.includes("data"), true);
});

test("gzipJson comprime y descomprime", async () => {
  const input = JSON.stringify({ hello: "mundo" });
  const compressed = await gzipJson(input);
  const decompressed = await new Response(
    new Blob([compressed]).stream().pipeThrough(
      new DecompressionStream("gzip"),
    ),
  ).text();

  assert.equal(decompressed, input);
});

test("buildVersionId usa el formato YYYY.MM.DD-hash", () => {
  assert.equal(
    buildVersionId(
      new Date("2026-11-09T00:00:00.000Z"),
      "abcdef1234567890",
    ),
    "2026.11.09-abcdef123456",
  );
});

test("buildVersion es determinista con el mismo contenido y fecha", async () => {
  const first = await buildVersion(payload, {
    now: new Date("2026-11-09T00:00:00.000Z"),
  });
  const second = await buildVersion(payload, {
    now: new Date("2026-11-09T00:00:00.000Z"),
  });

  assert.equal(first.hash, second.hash);
  assert.equal(first.version_id, second.version_id);
  assert.deepEqual(
    Array.from(first.payload_gzip),
    Array.from(second.payload_gzip),
  );
  assert.equal(first.schema_version, 1);
  assert.equal(first.total_records, 1);
  assert.match(first.version_id, /^\d{4}\.\d{2}\.\d{2}-[0-9a-f]{12}$/);
});
