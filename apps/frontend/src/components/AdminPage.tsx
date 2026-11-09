import type { EtlLogRecord } from "@agrodatos/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";
import { fetchEtlLog, fetchEtlLogs, triggerEtl } from "../api/admin";
import { ApiError } from "../api/client";

export function AdminPage() {
  const [apiKey, setApiKey] = useState("");
  const [logs, setLogs] = useState<EtlLogRecord[]>([]);
  const [activeLog, setActiveLog] = useState<EtlLogRecord | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);

  const stopPolling = useCallback(() => {
    if (pollTimer.current !== null) {
      window.clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  const loadLogs = useCallback(async () => {
    if (!apiKey) {
      return;
    }

    setIsLoadingLogs(true);
    setError(null);

    try {
      const result = await fetchEtlLogs(apiKey, 20);
      setLogs(result);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar los logs.",
      );
    } finally {
      setIsLoadingLogs(false);
    }
  }, [apiKey]);

  const startPolling = useCallback(
    (logId: number) => {
      stopPolling();
      pollTimer.current = window.setInterval(async () => {
        try {
          const log = await fetchEtlLog(apiKey, logId);
          setActiveLog(log);

          if (log.status !== "RUNNING") {
            stopPolling();
            await loadLogs();
          }
        } catch (err) {
          setError(
            err instanceof ApiError
              ? err.message
              : "No se pudo consultar el estado del ETL.",
          );
          stopPolling();
        }
      }, 2500);
    },
    [apiKey, loadLogs, stopPolling],
  );

  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    stopPolling();
    setActiveLog(null);
  }, [apiKey, stopPolling]);

  const handleTrigger = async () => {
    if (!apiKey) {
      return;
    }

    setIsTriggering(true);
    setError(null);

    try {
      const { etl_log_id } = await triggerEtl(apiKey);
      setActiveLog(null);
      startPolling(etl_log_id);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo disparar el ETL.",
      );
    } finally {
      setIsTriggering(false);
    }
  };

  return (
    <main>
      <header>
        <h1>Administración ETL</h1>
        <p>Dispara la actualización y consulta el estado de las ejecuciones.</p>
      </header>

      <section className="admin-form" aria-label="Control del ETL">
        <label>
          ADMIN_API_KEY
          <input
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            autoComplete="off"
            placeholder="Clave de administración"
          />
        </label>
        <button
          type="button"
          onClick={() => void handleTrigger()}
          disabled={!apiKey || isTriggering}
        >
          {isTriggering ? "Disparando..." : "Disparar ETL"}
        </button>
        <button
          type="button"
          onClick={() => void loadLogs()}
          disabled={!apiKey || isLoadingLogs}
        >
          {isLoadingLogs ? "Cargando..." : "Actualizar logs"}
        </button>
      </section>

      <p className="admin-note">
        La clave se mantiene solo en memoria. Para producción, protege{" "}
        <code>/admin</code> y <code>/api/admin/*</code> con Cloudflare Access.
      </p>

      {error && <p role="alert">{error}</p>}

      {activeLog && (
        <section className="admin-status" aria-label="Estado del ETL">
          <h2>Ejecución #{activeLog.id}</h2>
          <p>
            Estado: <strong>{activeLog.status}</strong>
          </p>
          <p>Extraídos: {activeLog.records_extracted}</p>
          <p>Rechazados: {activeLog.records_rejected}</p>
          <p>Duración: {activeLog.execution_time_ms ?? "—"} ms</p>
          {activeLog.error_message && (
            <p role="alert">Error: {activeLog.error_message}</p>
          )}
        </section>
      )}

      <section className="admin-logs" aria-label="Últimos logs del ETL">
        <h2>Últimos logs</h2>
        {logs.length === 0 ? (
          <p>No hay logs cargados.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Inicio</th>
                <th>Origen</th>
                <th>Estado</th>
                <th>Extraídos</th>
                <th>Rechazados</th>
                <th>Duración</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{new Date(log.started_at).toLocaleString("es-CO")}</td>
                  <td>{log.trigger_source}</td>
                  <td>{log.status}</td>
                  <td>{log.records_extracted}</td>
                  <td>{log.records_rejected}</td>
                  <td>{log.execution_time_ms ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
