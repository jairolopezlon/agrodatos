import type {
  AgroChangeSummary,
  CompressedAgroPayload,
  EtlTriggerSource,
} from "@agrodatos/shared-types";
import {
  createEtlLog,
  finishEtlLog,
  getActiveVersionMetadata,
  getLatestDiscardedVersion,
  getVersionPayload,
  stageDataVersion,
} from "../db/repositories";
import {
  DEFAULT_COVERAGE_THRESHOLDS,
  validateCoverage,
} from "./coverage";
import { computeChangeSummary } from "./diff";
import { extractValleDelVaucaData } from "./extract";
import { buildCompressedPayload } from "./transform";
import type { ValidationReport } from "./validate";
import {
  DEFAULT_VALIDATION_THRESHOLDS,
  validateAgroData,
} from "./validate";
import { buildVersion, gunzipJson } from "./version";

export interface RunEnv {
  DB: D1Database;
  SOCRATA_APP_TOKEN?: string;
}

export type RunDecision =
  | "NO_CHANGES"
  | "PENDING_CREATED"
  | "DISCARDED_HASH_MATCH";

export interface RunValidationReport extends ValidationReport {
  decision?: RunDecision | "FAILED";
}

export interface RunOptions {
  force?: boolean;
}

export interface RunSummary {
  etl_log_id: number;
  status: "SUCCESS" | "FAILED";
  version_id: string | null;
  pending_version_id: string | null;
  hash: string | null;
  records_extracted: number;
  records_rejected: number;
  execution_time_ms: number;
  created_version: boolean;
  applied: boolean;
  decision: RunDecision | "FAILED";
  error_message: string | null;
  validation_report: RunValidationReport | null;
  change_summary: AgroChangeSummary | null;
}

function withDecision(
  report: ValidationReport | null,
  decision: RunDecision | "FAILED",
): RunValidationReport | null {
  return report ? { ...report, decision } : null;
}

export async function runEtlWithLog(
  env: RunEnv,
  etlLogId: number,
  options: RunOptions = {},
  startedAt = Date.now(),
): Promise<RunSummary> {
  let recordsExtracted = 0;
  let recordsRejected = 0;
  let validationReport: ValidationReport | null = null;
  let versionId: string | null = null;
  let pendingVersionId: string | null = null;
  let hash: string | null = null;
  let createdVersion = false;
  let decision: RunDecision | "FAILED" = "NO_CHANGES";
  let changeSummary: AgroChangeSummary | null = null;

  try {
    const rows = await extractValleDelVaucaData(env);
    recordsExtracted = rows.length;

    const coverage = validateCoverage(rows, {
      ...DEFAULT_COVERAGE_THRESHOLDS,
      minYear: DEFAULT_VALIDATION_THRESHOLDS.minYear,
      maxYear: DEFAULT_VALIDATION_THRESHOLDS.maxYear,
    });
    const validation = validateAgroData(rows);
    validation.report.coverage = coverage;
    validationReport = validation.report;
    recordsRejected = validation.rejected.length;

    const fatalErrors = [
      ...coverage.fatal_errors,
      ...validation.fatalErrors,
    ];

    if (fatalErrors.length > 0) {
      throw new Error(`Validación fallida: ${fatalErrors.join(" | ")}`);
    }

    const payload = buildCompressedPayload(validation.accepted, {
      updatedAt: new Date().toISOString(),
    });
    const built = await buildVersion(payload);
    hash = built.hash;

    const active = await getActiveVersionMetadata(env);

    if (active && active.hash === built.hash) {
      decision = "NO_CHANGES";
      versionId = active.version_id;

      const executionTimeMs = Date.now() - startedAt;
      const report = withDecision(validationReport, decision);

      await finishEtlLog(env, etlLogId, {
        status: "SUCCESS",
        recordsExtracted,
        recordsRejected,
        executionTimeMs,
        validationReport: report,
      });

      return {
        etl_log_id: etlLogId,
        status: "SUCCESS",
        version_id: versionId,
        pending_version_id: null,
        hash,
        records_extracted: recordsExtracted,
        records_rejected: recordsRejected,
        execution_time_ms: executionTimeMs,
        created_version: false,
        applied: false,
        decision,
        error_message: null,
        validation_report: report,
        change_summary: null,
      };
    }

    if (!options.force) {
      const discarded = await getLatestDiscardedVersion(env);

      if (discarded && discarded.hash === built.hash) {
        decision = "DISCARDED_HASH_MATCH";
        versionId = null;

        const executionTimeMs = Date.now() - startedAt;
        const report = withDecision(validationReport, decision);

        await finishEtlLog(env, etlLogId, {
          status: "SUCCESS",
          recordsExtracted,
          recordsRejected,
          executionTimeMs,
          validationReport: report,
        });

        return {
          etl_log_id: etlLogId,
          status: "SUCCESS",
          version_id: versionId,
          pending_version_id: null,
          hash,
          records_extracted: recordsExtracted,
          records_rejected: recordsRejected,
          execution_time_ms: executionTimeMs,
          created_version: false,
          applied: false,
          decision,
          error_message: null,
          validation_report: report,
          change_summary: null,
        };
      }
    }

    let activePayload: CompressedAgroPayload | null = null;

    if (active) {
      const activeBytes = await getVersionPayload(env, active.version_id);

      if (!activeBytes) {
        throw new Error(
          `No se pudo leer el payload de la versión activa ${active.version_id}.`,
        );
      }

      activePayload = await gunzipJson<CompressedAgroPayload>(activeBytes);
    }

    changeSummary = computeChangeSummary(
      activePayload,
      payload,
      active?.version_id ?? null,
      built.version_id,
    );

    await stageDataVersion(env, {
      ...built,
      is_active: 0,
      status: "PENDING",
      change_summary: JSON.stringify(changeSummary),
      applied_at: null,
      discarded_at: null,
      etl_log_id: etlLogId,
    });

    decision = "PENDING_CREATED";
    versionId = built.version_id;
    pendingVersionId = built.version_id;
    createdVersion = true;

    const executionTimeMs = Date.now() - startedAt;
    const report = withDecision(validationReport, decision);

    await finishEtlLog(env, etlLogId, {
      status: "SUCCESS",
      recordsExtracted,
      recordsRejected,
      executionTimeMs,
      validationReport: report,
    });

    return {
      etl_log_id: etlLogId,
      status: "SUCCESS",
      version_id: versionId,
      pending_version_id: pendingVersionId,
      hash,
      records_extracted: recordsExtracted,
      records_rejected: recordsRejected,
      execution_time_ms: executionTimeMs,
      created_version: createdVersion,
      applied: false,
      decision,
      error_message: null,
      validation_report: report,
      change_summary: changeSummary,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startedAt;
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    const report = withDecision(validationReport, "FAILED");

    await finishEtlLog(env, etlLogId, {
      status: "FAILED",
      recordsExtracted,
      recordsRejected,
      executionTimeMs,
      errorMessage,
      validationReport: report,
    });

    return {
      etl_log_id: etlLogId,
      status: "FAILED",
      version_id: versionId,
      pending_version_id: pendingVersionId,
      hash,
      records_extracted: recordsExtracted,
      records_rejected: recordsRejected,
      execution_time_ms: executionTimeMs,
      created_version: createdVersion,
      applied: false,
      decision: "FAILED",
      error_message: errorMessage,
      validation_report: report,
      change_summary: changeSummary,
    };
  }
}

export async function runEtl(
  env: RunEnv,
  triggerSource: EtlTriggerSource,
  options: RunOptions = {},
): Promise<RunSummary> {
  const startedAt = Date.now();
  const etlLogId = await createEtlLog(env, triggerSource);

  return runEtlWithLog(env, etlLogId, options, startedAt);
}
