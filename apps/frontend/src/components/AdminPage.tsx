import type {
  EtlLogRecord,
  PendingVersion,
  VersionHistoryItem,
} from "@agrodatos/shared-types";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  applyPendingVersion,
  discardPendingVersion,
  fetchEtlLog,
  fetchEtlLogs,
  fetchPendingVersions,
  fetchVersionHistory,
  triggerEtl,
} from "../api/admin";
import { ApiError } from "../api/client";
import { PendingChanges } from "./PendingChanges";

interface LogReport {
  decision?: string;
  coverage?: {
    warnings?: string[];
  };
}

function parseLogReport(value: string | null): LogReport | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as LogReport;
  } catch {
    return null;
  }
}

function formatDate(value: string | null): string {
  return value ? new Date(value).toLocaleString("es-CO") : "—";
}

function formatNumber(value: number | null): string {
  return value === null
    ? "—"
    : new Intl.NumberFormat("es-CO").format(value);
}

export function AdminPage() {
  const [apiKey, setApiKey] = useState("");
  const [logs, setLogs] = useState<EtlLogRecord[]>([]);
  const [pendingVersions, setPendingVersions] = useState<PendingVersion[]>([]);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>(
    [],
  );
  const [activeLog, setActiveLog] = useState<EtlLogRecord | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [force, setForce] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
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
      setLogs(await fetchEtlLogs(apiKey, 20));
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

  const loadPending = useCallback(async () => {
    if (!apiKey) {
      return;
    }

    setIsLoadingPending(true);
    setError(null);

    try {
      setPendingVersions(await fetchPendingVersions(apiKey, 20));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudieron cargar las versiones pendientes.",
      );
    } finally {
      setIsLoadingPending(false);
    }
  }, [apiKey]);

  const loadHistory = useCallback(async () => {
    if (!apiKey) {
      return;
    }

    setIsLoadingHistory(true);
    setError(null);

    try {
      setVersionHistory(await fetchVersionHistory(apiKey, 20));
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo cargar el historial de versiones.",
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }, [apiKey]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadLogs(), loadPending(), loadHistory()]);
  }, [loadHistory, loadLogs, loadPending]);

  const startPolling = useCallback(
    (logId: number) => {
      stopPolling();
      pollTimer.current = window.setInterval(async () => {
        try {
          const log = await fetchEtlLog(apiKey, logId);
          setActiveLog(log);

          if (log.status !== "RUNNING") {
            stopPolling();
            await refreshAll();
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
    [apiKey, refreshAll, stopPolling],
  );

  useEffect(() => stopPolling, [stopPolling]);

  useEffect(() => {
    stopPolling();
    setActiveLog(null);
    setLogs([]);
    setPendingVersions([]);
    setVersionHistory([]);
    setError(null);
    setMessage(null);
  }, [apiKey, stopPolling]);

  const handleTrigger = async () => {
    if (!apiKey) {
      return;
    }

    setIsTriggering(true);
    setError(null);
    setMessage(null);

    try {
      const { etl_log_id } = await triggerEtl(apiKey, force);
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

  const handleDecision = async (
    versionId: string,
    action: "apply" | "omit",
  ) => {
    const verb = action === "apply" ? "aplicar" : "omitir";

    if (!window.confirm(`¿Seguro que quieres ${verb} la versión ${versionId}?`)) {
      return;
    }

    setDecisionBusy(versionId);
    setError(null);
    setMessage(null);

    try {
      if (action === "apply") {
        await applyPendingVersion(apiKey, versionId);
      } else {
        await discardPendingVersion(apiKey, versionId);
      }

      setMessage(
        action === "apply"
          ? `Versión ${versionId} aplicada.`
          : `Versión ${versionId} omitida.`,
      );
      await refreshAll();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo procesar la versión pendiente.",
      );
    } finally {
      setDecisionBusy(null);
    }
  };

  const report = activeLog ? parseLogReport(activeLog.validation_report) : null;
  const isRefreshing =
    isLoadingLogs || isLoadingPending || isLoadingHistory;

  return (
    <main>
      <header>
        <h1>Administración ETL</h1>
        <p>
          Dispara la actualización, revisa el diff y decide si aplicar u omitir.
        </p>
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
        <label className="admin-checkbox">
          <input
            type="checkbox"
            checked={force}
            onChange={(event) => setForce(event.target.checked)}
          />
          Forzar si fue omitido
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
          onClick={() => void refreshAll()}
          disabled={!apiKey || isRefreshing}
        >
          {isRefreshing ? "Cargando..." : "Actualizar"}
        </button>
      </section>

      <p className="admin-note">
        La clave se mantiene solo en memoria. Para producción, protege{" "}
        <code>/admin</code> y <code>/api/admin/*</code> con Cloudflare Access.
      </p>

      {error && <p role="alert">{error}</p>}
      {message && <p className="admin-success">{message}</p>}

      {activeLog && (
        <section className="admin-status" aria-label="Estado del ETL">
          <h2>Ejecución #{activeLog.id}</h2>
          <p>
            Estado: <strong>{activeLog.status}</strong>
          </p>
          <p>Extraídos: {formatNumber(activeLog.records_extracted)}</p>
          <p>Rechazados: {formatNumber(activeLog.records_rejected)}</p>
          <p>Duración: {formatNumber(activeLog.execution_time_ms)} ms</p>
          {report?.decision && <p>Decisión: {report.decision}</p>}
          {report?.coverage?.warnings?.map((warning) => (
            <p key={warning} className="pending-warning">
              {warning}
            </p>
          ))}
          {activeLog.error_message && (
            <p role="alert">Error: {activeLog.error_message}</p>
          )}
        </section>
      )}

      <section className="admin-pending" aria-label="Cambios pendientes">
        <h2>Cambios pendientes</h2>
        {pendingVersions.length === 0 ? (
          <p>No hay cambios pendientes.</p>
        ) : (
          pendingVersions.map((version) => (
            <PendingChanges
              key={version.version_id}
              version={version}
              isBusy={decisionBusy === version.version_id}
              onApply={() => void handleDecision(version.version_id, "apply")}
              onOmit={() => void handleDecision(version.version_id, "omit")}
            />
          ))
        )}
      </section>

      <section className="admin-history" aria-label="Historial de versiones">
        <details>
          <summary>Historial de versiones ({versionHistory.length})</summary>
          {versionHistory.length === 0 ? (
            <p>Sin historial cargado.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Versión</th>
                  <th>Estado</th>
                  <th>Registros</th>
                  <th>Creada</th>
                  <th>Aplicada</th>
                  <th>Omitida</th>
                </tr>
              </thead>
              <tbody>
                {versionHistory.map((version) => (
                  <tr key={version.version_id}>
                    <td>{version.version_id}</td>
                    <td>{version.status}</td>
                    <td>{formatNumber(version.total_records)}</td>
                    <td>{formatDate(version.created_at)}</td>
                    <td>{formatDate(version.applied_at)}</td>
                    <td>{formatDate(version.discarded_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </details>
      </section>

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
                <th>Decisión</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td>{formatDate(log.started_at)}</td>
                  <td>{log.trigger_source}</td>
                  <td>{log.status}</td>
                  <td>{formatNumber(log.records_extracted)}</td>
                  <td>{formatNumber(log.records_rejected)}</td>
                  <td>{formatNumber(log.execution_time_ms)}</td>
                  <td>
                    {parseLogReport(log.validation_report)?.decision ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
