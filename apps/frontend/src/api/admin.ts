import type { EtlLogRecord } from "@agrodatos/shared-types";
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
): Promise<{ etl_log_id: number; status: "RUNNING" }> {
  const response = await fetch(`${API_BASE_URL}/api/admin/trigger`, {
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
