import type {
  DataVersionRecord,
  EtlLogRecord,
  EtlLogStatus,
  EtlTriggerSource,
  VersionMetadata,
} from "@agrodatos/shared-types";

export interface DbEnv {
  DB: D1Database;
}

export interface EtlLogCompletion {
  status: Exclude<EtlLogStatus, "RUNNING">;
  recordsExtracted: number;
  recordsRejected: number;
  errorMessage?: string | null;
  validationReport?: unknown;
  executionTimeMs: number;
}

const ETL_LOG_COLUMNS = [
  "id",
  "started_at",
  "completed_at",
  "status",
  "trigger_source",
  "records_extracted",
  "records_rejected",
  "error_message",
  "validation_report",
  "execution_time_ms",
].join(", ");

const VERSION_METADATA_COLUMNS = [
  "version_id",
  "created_at",
  "hash",
  "total_records",
  "schema_version",
].join(", ");

export async function createEtlLog(
  env: DbEnv,
  triggerSource: EtlTriggerSource,
): Promise<number> {
  const result = await env.DB.prepare(
    "INSERT INTO etl_logs (status, trigger_source) VALUES ('RUNNING', ?)",
  )
    .bind(triggerSource)
    .run();

  return result.meta.last_row_id;
}

export async function finishEtlLog(
  env: DbEnv,
  id: number,
  result: EtlLogCompletion,
): Promise<void> {
  const validationReport =
    result.validationReport === null || result.validationReport === undefined
      ? null
      : typeof result.validationReport === "string"
        ? result.validationReport
        : JSON.stringify(result.validationReport);

  await env.DB.prepare(
    `UPDATE etl_logs
     SET completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
         status = ?,
         records_extracted = ?,
         records_rejected = ?,
         error_message = ?,
         validation_report = ?,
         execution_time_ms = ?
     WHERE id = ?`,
  )
    .bind(
      result.status,
      result.recordsExtracted,
      result.recordsRejected,
      result.errorMessage ?? null,
      validationReport,
      result.executionTimeMs,
      id,
    )
    .run();
}

export async function insertDataVersion(
  env: DbEnv,
  record: DataVersionRecord,
): Promise<void> {
  const payload =
    record.payload_gzip instanceof Uint8Array
      ? record.payload_gzip
      : Uint8Array.from(record.payload_gzip);

  await env.DB.prepare(
    `INSERT INTO data_versions (
       version_id,
       created_at,
       schema_version,
       hash,
       total_records,
       payload_gzip,
       is_active,
       etl_log_id
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      record.version_id,
      record.created_at,
      record.schema_version,
      record.hash,
      record.total_records,
      payload,
      record.is_active,
      record.etl_log_id,
    )
    .run();
}

export async function getActiveVersionMetadata(
  env: DbEnv,
): Promise<VersionMetadata | null> {
  return env.DB.prepare(
    `SELECT ${VERSION_METADATA_COLUMNS}
     FROM data_versions
     WHERE is_active = 1
     ORDER BY created_at DESC
     LIMIT 1`,
  ).first<VersionMetadata>();
}

export async function getVersionMetadata(
  env: DbEnv,
  versionId: string,
): Promise<VersionMetadata | null> {
  return env.DB.prepare(
    `SELECT ${VERSION_METADATA_COLUMNS}
     FROM data_versions
     WHERE version_id = ?
     LIMIT 1`,
  )
    .bind(versionId)
    .first<VersionMetadata>();
}

export async function getVersionPayload(
  env: DbEnv,
  versionId: string,
): Promise<Uint8Array | null> {
  const row = await env.DB.prepare(
    "SELECT payload_gzip FROM data_versions WHERE version_id = ? LIMIT 1",
  )
    .bind(versionId)
    .first<{ payload_gzip: number[] | Uint8Array | ArrayBuffer | null }>();

  if (!row || row.payload_gzip === null) {
    return null;
  }

  if (row.payload_gzip instanceof Uint8Array) {
    return row.payload_gzip;
  }

  if (row.payload_gzip instanceof ArrayBuffer) {
    return new Uint8Array(row.payload_gzip);
  }

  return Uint8Array.from(row.payload_gzip);
}

export async function activateVersion(
  env: DbEnv,
  versionId: string,
): Promise<void> {
  const exists = await env.DB.prepare(
    "SELECT 1 AS found FROM data_versions WHERE version_id = ? LIMIT 1",
  )
    .bind(versionId)
    .first<{ found: number }>();

  if (!exists) {
    throw new Error(`La versión ${versionId} no existe.`);
  }

  await env.DB.batch([
    env.DB.prepare("UPDATE data_versions SET is_active = 0 WHERE is_active = 1"),
    env.DB.prepare(
      "UPDATE data_versions SET is_active = 1 WHERE version_id = ?",
    ).bind(versionId),
  ]);
}

export async function getEtlLog(
  env: DbEnv,
  id: number,
): Promise<EtlLogRecord | null> {
  return env.DB.prepare(
    `SELECT ${ETL_LOG_COLUMNS} FROM etl_logs WHERE id = ? LIMIT 1`,
  )
    .bind(id)
    .first<EtlLogRecord>();
}

export async function listEtlLogs(
  env: DbEnv,
  limit = 20,
): Promise<EtlLogRecord[]> {
  const normalizedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 20;
  const safeLimit = Math.min(Math.max(normalizedLimit, 1), 100);

  const result = await env.DB.prepare(
    `SELECT ${ETL_LOG_COLUMNS}
     FROM etl_logs
     ORDER BY started_at DESC, id DESC
     LIMIT ?`,
  )
    .bind(safeLimit)
    .all<EtlLogRecord>();

  return result.results;
}
