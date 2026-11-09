import type {
  CompressedAgroPayload,
  VersionMetadata,
} from "@agrodatos/shared-types";
import { API_BASE_URL } from "../constants";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function fetchActiveVersion(): Promise<VersionMetadata | null> {
  const response = await fetch(`${API_BASE_URL}/api/version`, {
    headers: { Accept: "application/json" },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new ApiError(
      `No se pudo obtener la versión activa (${response.status}).`,
      response.status,
    );
  }

  return (await response.json()) as VersionMetadata;
}

export async function fetchPayload(
  versionId: string,
): Promise<CompressedAgroPayload> {
  const response = await fetch(
    `${API_BASE_URL}/api/data/${encodeURIComponent(versionId)}`,
    { headers: { Accept: "application/json" } },
  );

  if (!response.ok) {
    throw new ApiError(
      `No se pudo descargar el payload ${versionId} (${response.status}).`,
      response.status,
    );
  }

  return (await response.json()) as CompressedAgroPayload;
}
