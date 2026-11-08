export type EtlLogStatus = "SUCCESS" | "FAILED" | "RUNNING";

export type EtlTriggerSource = "CRON" | "MANUAL";

export interface EtlLogRecord {
  id: number;
  started_at: string;
  completed_at: string | null;
  status: EtlLogStatus;
  trigger_source: EtlTriggerSource;
  records_extracted: number;
  records_rejected: number;
  validation_report: string | null;
  error_message: string | null;
  execution_time_ms: number | null;
}

export interface DataVersionRecord {
  version_id: string;
  created_at: string;
  hash: string;
  total_records: number;
  schema_version: number;
  payload_gzip: number[] | Uint8Array;
  is_active: 0 | 1;
  etl_log_id: number;
}

export interface VersionMetadata
  extends Pick<
    DataVersionRecord,
    "version_id" | "created_at" | "hash" | "total_records" | "schema_version"
  > {}

export interface RawSocrataHistorical {
  c_d_dep?: string | number;
  departamento?: string | number;
  c_d_mun?: string | number;
  municipio?: string | number;
  grupo_de_cultivo?: string | number;
  cultivo?: string | number;
  a_o?: string | number;
  periodo?: string | number;
  rea_sembrada_ha?: string | number;
  rea_cosechada_ha?: string | number;
  producci_n_t?: string | number;
  rendimiento_t_ha?: string | number;
}

export interface RawSocrataCurrent {
  c_digo_dane_departamento?: string | number;
  departamento?: string | number;
  c_digo_dane_municipio?: string | number;
  municipio?: string | number;
  cultivo?: string | number;
  a_o?: string | number;
  periodo?: string | number;
  rea_sembrada?: string | number;
  rea_cosechada?: string | number;
  producci_n?: string | number;
  rendimiento?: string | number;
}

export interface AgroDataNormalized {
  municipioId: number;
  municipioNombre: string;
  cultivo: string;
  anio: number;
  periodo: string;
  areaSembrada: number;
  areaCosechada: number;
  produccion: number;
  rendimiento: number;
}

export type AgroTuple = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export interface CompressedAgroPayload {
  metadata: {
    version: string;
    schema_version: number;
    updated_at: string;
    total_records: number;
  };
  dicts: {
    municipios: Record<number, string>;
    cultivos: Record<number, string>;
    periodos: Record<number, string>;
  };
  data: AgroTuple[];
}
