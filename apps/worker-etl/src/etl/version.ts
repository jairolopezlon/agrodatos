import type { CompressedAgroPayload } from "@agrodatos/shared-types";

const MAX_GZIP_BYTES = Math.floor(1.8 * 1024 * 1024);

export interface BuiltVersion {
  version_id: string;
  created_at: string;
  schema_version: number;
  hash: string;
  total_records: number;
  payload_gzip: Uint8Array;
}

export interface BuildVersionOptions {
  now?: Date;
}

export function canonicalize(payload: CompressedAgroPayload): string {
  return JSON.stringify({
    schema_version: payload.metadata.schema_version,
    dicts: {
      municipios: payload.dicts.municipios,
      cultivos: payload.dicts.cultivos,
      periodos: payload.dicts.periodos,
    },
    data: payload.data,
  });
}

export async function sha256Hex(input: string | Uint8Array): Promise<string> {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function gzipJson(input: unknown): Promise<Uint8Array> {
  const json = typeof input === "string" ? input : JSON.stringify(input);
  const compressed = new Blob([json])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const buffer = await new Response(compressed).arrayBuffer();

  return new Uint8Array(buffer);
}

export function buildVersionId(date: Date, hash: string): string {
  const day = date.toISOString().slice(0, 10).replace(/-/g, ".");
  return `${day}-${hash.slice(0, 12)}`;
}

export async function buildVersion(
  payload: CompressedAgroPayload,
  options: BuildVersionOptions = {},
): Promise<BuiltVersion> {
  const canonical = canonicalize(payload);
  const hash = await sha256Hex(canonical);
  const now = options.now ?? new Date();
  const payloadGzip = await gzipJson(payload);

  if (payloadGzip.byteLength > MAX_GZIP_BYTES) {
    throw new Error(
      `El payload comprimido (${payloadGzip.byteLength} bytes) supera el límite de 1,8 MB.`,
    );
  }

  return {
    version_id: buildVersionId(now, hash),
    created_at: now.toISOString(),
    schema_version: payload.metadata.schema_version,
    hash,
    total_records: payload.metadata.total_records,
    payload_gzip: payloadGzip,
  };
}
