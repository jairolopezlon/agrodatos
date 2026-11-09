import type {
  AgroDataNormalized,
  CoverageReport,
} from "@agrodatos/shared-types";

export interface ValidationThresholds {
  minYear: number;
  maxYear: number;
  maxRejectionRate: number;
  maxAreaSembrada: number;
}

export const DEFAULT_VALIDATION_THRESHOLDS: ValidationThresholds = {
  minYear: 2006,
  maxYear: 2025,
  maxRejectionRate: 0.05,
  maxAreaSembrada: 150_000,
};

export interface RejectedRecord {
  index: number;
  record: unknown;
  reasons: string[];
}

export interface ValidationReport {
  total: number;
  accepted: number;
  rejected: number;
  rejection_rate: number;
  thresholds: ValidationThresholds;
  reasons: Record<string, number>;
  fatal_errors: string[];
  coverage?: CoverageReport;
}

export interface ValidationResult {
  accepted: AgroDataNormalized[];
  rejected: RejectedRecord[];
  fatalErrors: string[];
  report: ValidationReport;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function isStructuralRecord(value: unknown): value is AgroDataNormalized {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    isFiniteNumber(record.municipioId) &&
    typeof record.municipioNombre === "string" &&
    typeof record.cultivo === "string" &&
    isFiniteNumber(record.anio) &&
    typeof record.periodo === "string" &&
    isFiniteNumber(record.areaSembrada) &&
    isFiniteNumber(record.areaCosechada) &&
    isFiniteNumber(record.produccion) &&
    isFiniteNumber(record.rendimiento)
  );
}

function rowReasons(
  row: AgroDataNormalized,
  thresholds: ValidationThresholds,
): string[] {
  const reasons: string[] = [];

  if (row.areaCosechada > row.areaSembrada) {
    reasons.push("area_cosechada_mayor_que_area_sembrada");
  }

  if (
    row.areaSembrada < 0 ||
    row.areaCosechada < 0 ||
    row.produccion < 0 ||
    row.rendimiento < 0
  ) {
    reasons.push("valores_negativos");
  }

  if (row.anio < thresholds.minYear || row.anio > thresholds.maxYear) {
    reasons.push("anio_fuera_de_rango");
  }

  const municipioId = String(row.municipioId);
  if (municipioId.length !== 5 || !municipioId.startsWith("76")) {
    reasons.push("municipio_id_invalido");
  }

  if (row.municipioNombre.trim() === "") {
    reasons.push("municipio_nombre_vacio");
  }

  if (row.cultivo.trim() === "") {
    reasons.push("cultivo_vacio");
  }

  if (row.areaSembrada > thresholds.maxAreaSembrada) {
    reasons.push("area_sembrada_atipica");
  }

  return reasons;
}

export function validateAgroData(
  rows: AgroDataNormalized[],
  thresholds: ValidationThresholds = DEFAULT_VALIDATION_THRESHOLDS,
): ValidationResult {
  const accepted: AgroDataNormalized[] = [];
  const rejected: RejectedRecord[] = [];
  const fatalErrors: string[] = [];
  const reasons: Record<string, number> = {};

  if (!Array.isArray(rows)) {
    fatalErrors.push("La entrada no es un arreglo de registros.");
  } else if (rows.length === 0) {
    fatalErrors.push("No se extrajeron registros.");
  }

  if (Array.isArray(rows)) {
    rows.forEach((row, index) => {
      if (!isStructuralRecord(row)) {
        const reason = "estructura_invalida";
        reasons[reason] = (reasons[reason] ?? 0) + 1;
        rejected.push({ index, record: row, reasons: [reason] });
        fatalErrors.push(
          `Estructura inválida en el registro ${index}: faltan campos o tipos inesperados.`,
        );
        return;
      }

      const rowRejectReasons = rowReasons(row, thresholds);

      if (rowRejectReasons.length > 0) {
        for (const reason of rowRejectReasons) {
          reasons[reason] = (reasons[reason] ?? 0) + 1;
        }
        rejected.push({ index, record: row, reasons: rowRejectReasons });
        return;
      }

      accepted.push(row);
    });
  }

  const total = Array.isArray(rows) ? rows.length : 0;
  const rejectionRate = total === 0 ? 0 : rejected.length / total;

  if (total > 0 && rejectionRate > thresholds.maxRejectionRate) {
    fatalErrors.push(
      `Tasa de rechazo ${(rejectionRate * 100).toFixed(2)}% supera el umbral ${(thresholds.maxRejectionRate * 100).toFixed(2)}%.`,
    );
  }

  const report: ValidationReport = {
    total,
    accepted: accepted.length,
    rejected: rejected.length,
    rejection_rate: rejectionRate,
    thresholds,
    reasons,
    fatal_errors: fatalErrors,
  };

  return { accepted, rejected, fatalErrors, report };
}
