import type {
  EtlLogRecord,
  PendingVersion,
  VersionHistoryItem,
} from "@agrodatos/shared-types";
import { API_BASE_URL } from "../constants";
import { ApiError } from "./client";

function authHeaders(apiKey: string): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${apiKey}`,
  };
}

async function throwApiError(
  response: Response,
  fallback: string,
): Promise<never> {
  let message = fallback;

  try {
    const body = (await response.json()) as { error?: string };
    if (body.error) {
      message = body.error;
    }
  } catch {
    // La respuesta no era JSON; se conserva el mensaje de respaldo.
  }

  throw new ApiError(message, response.status);
}

export async function triggerEtl(
  apiKey: string,
  force = false,
): Promise<{ etl_log_id: number; status: "RUNNING" }> {
  const suffix = force ? "?force=true" : "";
  const response = await fetch(`${API_BASE_URL}/api/admin/trigger${suffix}`, {
    method: "POST",
    headers: authHeaders(apiKey),
  });

  if (!response.ok) {
    await throwApiError(
      response,
      `No se pudo disparar el ETL (${response.status}).`,
    );
  }

  return (await response.json()) as {
    etl_log_id: number;
    status: "RUNNING";
  };
}

export async function fetchEtlLog(
  apiKey: string,
  id: number,
): Promise<EtlLogRecord> {
  const response = await fetch(`${API_BASE_URL}/api/admin/etl/${id}`, {
    headers: authHeaders(apiKey),
  });

  if (!response.ok) {
    await throwApiError(
      response,
      `No se pudo consultar el log ${id} (${response.status}).`,
    );
  }

  return (await response.json()) as EtlLogRecord;
}

export async function fetchEtlLogs(
  apiKey: string,
  limit = 20,
): Promise<EtlLogRecord[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/etl?limit=${limit}`,
    { headers: authHeaders(apiKey) },
  );

  if (!response.ok) {
    await throwApiError(
      response,
      `No se pudieron cargar los logs (${response.status}).`,
    );
  }

  return (await response.json()) as EtlLogRecord[];
}

export async function fetchPendingVersions(
  apiKey: string,
  limit = 20,
): Promise<PendingVersion[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/pending?limit=${limit}`,
    { headers: authHeaders(apiKey) },
  );

  if (!response.ok) {
    await throwApiError(
      response,
      `No se pudieron cargar las versiones pendientes (${response.status}).`,
    );
  }

  return (await response.json()) as PendingVersion[];
}

export async function applyPendingVersion(
  apiKey: string,
  versionId: string,
): Promise<{ applied: boolean; version_id: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/pending/${encodeURIComponent(versionId)}/apply`,
    { method: "POST", headers: authHeaders(apiKey) },
  );

  if (!response.ok) {
    await throwApiError(
      response,
      `No se pudo aplicar la versión ${versionId} (${response.status}).`,
    );
  }

  return (await response.json()) as {
    applied: boolean;
    version_id: string;
  };
}

export async function discardPendingVersion(
  apiKey: string,
  versionId: string,
): Promise<{ discarded: boolean; version_id: string }> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/pending/${encodeURIComponent(versionId)}/omit`,
    { method: "POST", headers: authHeaders(apiKey) },
  );

  if (!response.ok) {
    await throwApiError(
      response,
      `No se pudo omitir la versión ${versionId} (${response.status}).`,
    );
  }

  return (await response.json()) as {
    discarded: boolean;
    version_id: string;
  };
}

export async function fetchVersionHistory(
  apiKey: string,
  limit = 20,
): Promise<VersionHistoryItem[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/admin/versions?limit=${limit}`,
    { headers: authHeaders(apiKey) },
  );

  if (!response.ok) {
    await throwApiError(
      response,
      `No se pudo cargar el historial de versiones (${response.status}).`,
    );
  }

  return (await response.json()) as VersionHistoryItem[];
}
