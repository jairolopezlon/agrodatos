import type {
  AgroChangeSummary,
  DataVersionRecord,
  DataVersionStatus,
  EtlLogRecord,
  EtlLogStatus,
  EtlTriggerSource,
  PendingVersion,
  VersionHistoryItem,
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

const PENDING_VERSION_COLUMNS = [
  ...VERSION_METADATA_COLUMNS.split(", "),
  "status",
  "change_summary",
  "etl_log_id",
  "applied_at",
  "discarded_at",
].join(", ");

const VERSION_HISTORY_COLUMNS = [
  ...VERSION_METADATA_COLUMNS.split(", "),
  "status",
  "is_active",
  "etl_log_id",
  "applied_at",
  "discarded_at",
].join(", ");

const INSERT_VERSION_SQL = `INSERT INTO data_versions (
  version_id,
  created_at,
  schema_version,
  hash,
  total_records,
  payload_gzip,
  is_active,
  status,
  change_summary,
  applied_at,
  discarded_at,
  etl_log_id
) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const STAGE_VERSION_SQL = `${INSERT_VERSION_SQL}
ON CONFLICT(version_id) DO UPDATE SET
  created_at = excluded.created_at,
  schema_version = excluded.schema_version,
  hash = excluded.hash,
  total_records = excluded.total_records,
  payload_gzip = excluded.payload_gzip,
  is_active = excluded.is_active,
  status = excluded.status,
  change_summary = excluded.change_summary,
  applied_at = excluded.applied_at,
  discarded_at = excluded.discarded_at,
  etl_log_id = excluded.etl_log_id
WHERE data_versions.is_active = 0`;

interface PendingVersionRow extends VersionMetadata {
  status: DataVersionStatus;
  change_summary: string | null;
  etl_log_id: number;
  applied_at: string | null;
  discarded_at: string | null;
}

function toPayloadBytes(
  payload: DataVersionRecord["payload_gzip"],
): Uint8Array {
  return payload instanceof Uint8Array ? payload : Uint8Array.from(payload);
}

function insertVersionStatement(
  env: DbEnv,
  record: DataVersionRecord,
  sql = INSERT_VERSION_SQL,
): D1PreparedStatement {
  return env.DB.prepare(sql).bind(
    record.version_id,
    record.created_at,
    record.schema_version,
    record.hash,
    record.total_records,
    toPayloadBytes(record.payload_gzip),
    record.is_active,
    record.status,
    record.change_summary,
    record.applied_at,
    record.discarded_at,
    record.etl_log_id,
  );
}

function toPendingVersion(row: PendingVersionRow): PendingVersion {
  let changeSummary: AgroChangeSummary | null = null;

  if (row.change_summary) {
    try {
      changeSummary = JSON.parse(row.change_summary) as AgroChangeSummary;
    } catch {
      changeSummary = null;
    }
  }

  return {
    version_id: row.version_id,
    created_at: row.created_at,
    hash: row.hash,
    total_records: row.total_records,
    schema_version: row.schema_version,
    status: row.status,
    change_summary: changeSummary,
    etl_log_id: row.etl_log_id,
    applied_at: row.applied_at,
    discarded_at: row.discarded_at,
  };
}

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
  await insertVersionStatement(env, record).run();
}

export async function stageDataVersion(
  env: DbEnv,
  record: DataVersionRecord,
): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE data_versions SET status = 'SUPERSEDED' WHERE status = 'PENDING'",
    ),
    insertVersionStatement(env, record, STAGE_VERSION_SQL),
  ]);
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
): Promise<Uint8Array<ArrayBuffer> | null> {
  const row = await env.DB.prepare(
    "SELECT payload_gzip FROM data_versions WHERE version_id = ? LIMIT 1",
  )
    .bind(versionId)
    .first<{ payload_gzip: number[] | Uint8Array | ArrayBuffer | null }>();

  if (!row || row.payload_gzip === null) {
    return null;
  }

  if (row.payload_gzip instanceof Uint8Array) {
    return new Uint8Array(row.payload_gzip);
  }

  if (row.payload_gzip instanceof ArrayBuffer) {
    return new Uint8Array(row.payload_gzip);
  }

  return Uint8Array.from(row.payload_gzip);
}

export async function listPendingVersions(
  env: DbEnv,
  limit = 20,
): Promise<PendingVersion[]> {
  const normalizedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 20;
  const safeLimit = Math.min(Math.max(normalizedLimit, 1), 100);
  const result = await env.DB.prepare(
    `SELECT ${PENDING_VERSION_COLUMNS}
     FROM data_versions
     WHERE status = 'PENDING'
     ORDER BY created_at DESC
     LIMIT ?`,
  )
    .bind(safeLimit)
    .all<PendingVersionRow>();

  return result.results.map(toPendingVersion);
}

export async function listVersions(
  env: DbEnv,
  limit = 20,
): Promise<VersionHistoryItem[]> {
  const normalizedLimit = Number.isFinite(limit) ? Math.trunc(limit) : 20;
  const safeLimit = Math.min(Math.max(normalizedLimit, 1), 100);
  const result = await env.DB.prepare(
    `SELECT ${VERSION_HISTORY_COLUMNS}
     FROM data_versions
     ORDER BY created_at DESC
     LIMIT ?`,
  )
    .bind(safeLimit)
    .all<VersionHistoryItem>();

  return result.results;
}

export async function getLatestDiscardedVersion(
  env: DbEnv,
): Promise<{ version_id: string; hash: string } | null> {
  return env.DB.prepare(
    `SELECT version_id, hash
     FROM data_versions
     WHERE status = 'DISCARDED'
     ORDER BY created_at DESC
     LIMIT 1`,
  ).first<{ version_id: string; hash: string }>();
}

export async function activateVersion(
  env: DbEnv,
  versionId: string,
): Promise<void> {
  const version = await env.DB.prepare(
    "SELECT status FROM data_versions WHERE version_id = ? LIMIT 1",
  )
    .bind(versionId)
    .first<{ status: DataVersionStatus }>();

  if (!version) {
    throw new Error(`La versión ${versionId} no existe.`);
  }

  if (version.status !== "PENDING") {
    throw new Error(
      `La versión ${versionId} no está pendiente de aprobación (estado: ${version.status}).`,
    );
  }

  await env.DB.batch([
    env.DB.prepare(
      `UPDATE data_versions
       SET is_active = 0, status = 'SUPERSEDED'
       WHERE is_active = 1 AND version_id <> ?`,
    ).bind(versionId),
    env.DB.prepare(
      `UPDATE data_versions
       SET is_active = 1,
           status = 'ACTIVE',
           applied_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
       WHERE version_id = ? AND status = 'PENDING'`,
    ).bind(versionId),
    env.DB.prepare(
      `UPDATE data_versions
       SET status = 'SUPERSEDED'
       WHERE status = 'PENDING' AND version_id <> ?`,
    ).bind(versionId),
  ]);
}

export async function discardVersion(
  env: DbEnv,
  versionId: string,
): Promise<void> {
  const result = await env.DB.prepare(
    `UPDATE data_versions
     SET status = 'DISCARDED',
         discarded_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
     WHERE version_id = ? AND status = 'PENDING'`,
  )
    .bind(versionId)
    .run();

  if (result.meta.changes === 0) {
    throw new Error(
      `La versión ${versionId} no existe o no está pendiente de aprobación.`,
    );
  }
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
