import { validateCoverage } from "../src/etl/coverage.ts";
import { extractValleDelVaucaData } from "../src/etl/extract.ts";
import { buildCompressedPayload } from "../src/etl/transform.ts";
import { validateAgroData } from "../src/etl/validate.ts";
import { buildVersion } from "../src/etl/version.ts";

const rows = await extractValleDelVaucaData({});
const coverage = validateCoverage(rows);
const validation = validateAgroData(rows);

if (coverage.fatal_errors.length > 0) {
  throw new Error(
    `Cobertura fatal: ${coverage.fatal_errors.join(" | ")}`,
  );
}

if (validation.fatalErrors.length > 0) {
  throw new Error(`Validación fatal: ${validation.fatalErrors.join(" | ")}`);
}

const payload = buildCompressedPayload(validation.accepted, {
  updatedAt: new Date().toISOString(),
});
const version = await buildVersion(payload);

const summary = {
  total: rows.length,
  accepted: validation.accepted.length,
  rejected: validation.rejected.length,
  municipios: Object.keys(payload.dicts.municipios).length,
  cultivos: Object.keys(payload.dicts.cultivos).length,
  periodos: Object.keys(payload.dicts.periodos).length,
  gzipBytes: version.payload_gzip.byteLength,
  hash: version.hash,
  versionId: version.version_id,
  schemaVersion: payload.metadata.schema_version,
  coverageWarnings: coverage.warnings,
};

console.log(JSON.stringify(summary, null, 2));

if (rows.length < 20_000) {
  throw new Error(
    `Se esperaban más de 20 000 registros, se obtuvieron ${rows.length}.`,
  );
}

if (version.payload_gzip.byteLength >= 1.8 * 1024 * 1024) {
  throw new Error(
    `El gzip (${version.payload_gzip.byteLength} bytes) supera 1,8 MB.`,
  );
}

if (payload.metadata.schema_version !== 1) {
  throw new Error(
    `schema_version inesperado: ${payload.metadata.schema_version}.`,
  );
}
