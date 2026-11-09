import type { EtlTriggerSource } from "@agrodatos/shared-types";
import {
  activateVersion,
  createEtlLog,
  finishEtlLog,
  getActiveVersionMetadata,
  insertDataVersion,
} from "../db/repositories";
import { extractValleDelVaucaData } from "./extract";
import { buildCompressedPayload } from "./transform";
import type { ValidationReport } from "./validate";
import { validateAgroData } from "./validate";
import { buildVersion } from "./version";

export interface RunEnv {
  DB: D1Database;
  SOCRATA_APP_TOKEN?: string;
}

export interface RunSummary {
  etl_log_id: number;
  status: "SUCCESS" | "FAILED";
  version_id: string | null;
  hash: string | null;
  records_extracted: number;
  records_rejected: number;
  execution_time_ms: number;
  created_version: boolean;
  error_message: string | null;
  validation_report: ValidationReport | null;
}

export async function runEtl(
  env: RunEnv,
  triggerSource: EtlTriggerSource,
): Promise<RunSummary> {
  const startedAt = Date.now();
  const etlLogId = await createEtlLog(env, triggerSource);

  let recordsExtracted = 0;
  let recordsRejected = 0;
  let validationReport: ValidationReport | null = null;
  let versionId: string | null = null;
  let hash: string | null = null;
  let createdVersion = false;

  try {
    const rows = await extractValleDelVaucaData(env);
    recordsExtracted = rows.length;

    const validation = validateAgroData(rows);
    recordsRejected = validation.rejected.length;
    validationReport = validation.report;

    if (validation.fatalErrors.length > 0) {
      throw new Error(
        `Validación fallida: ${validation.fatalErrors.join(" | ")}`,
      );
    }

    const payload = buildCompressedPayload(validation.accepted, {
      updatedAt: new Date().toISOString(),
    });
    const built = await buildVersion(payload);
    hash = built.hash;

    const active = await getActiveVersionMetadata(env);

    if (active && active.hash === built.hash) {
      versionId = active.version_id;
    } else {
      await insertDataVersion(env, {
        ...built,
        is_active: 0,
        etl_log_id: etlLogId,
      });
      await activateVersion(env, built.version_id);
      versionId = built.version_id;
      createdVersion = true;
    }

    const executionTimeMs = Date.now() - startedAt;

    await finishEtlLog(env, etlLogId, {
      status: "SUCCESS",
      recordsExtracted,
      recordsRejected,
      executionTimeMs,
      validationReport,
    });

    return {
      etl_log_id: etlLogId,
      status: "SUCCESS",
      version_id: versionId,
      hash,
      records_extracted: recordsExtracted,
      records_rejected: recordsRejected,
      execution_time_ms: executionTimeMs,
      created_version: createdVersion,
      error_message: null,
      validation_report: validationReport,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startedAt;
    const errorMessage =
      error instanceof Error ? error.message : String(error);

    await finishEtlLog(env, etlLogId, {
      status: "FAILED",
      recordsExtracted,
      recordsRejected,
      executionTimeMs,
      errorMessage,
      validationReport,
    });

    return {
      etl_log_id: etlLogId,
      status: "FAILED",
      version_id: versionId,
      hash,
      records_extracted: recordsExtracted,
      records_rejected: recordsRejected,
      execution_time_ms: executionTimeMs,
      created_version: createdVersion,
      error_message: errorMessage,
      validation_report: validationReport,
    };
  }
}
