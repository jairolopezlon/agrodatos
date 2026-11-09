import type {
  EtlLogRecord,
  PendingVersion,
  VersionHistoryItem,
} from "@agrodatos/shared-types";
import { useQuery } from "@tanstack/react-query";
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
import { ApiError, fetchActiveVersion } from "../api/client";
import { PendingChanges } from "./PendingChanges";

interface LogReport {
  decision?: string;
  coverage?: {
    warnings?: string[];
  };
}

const LOG_STATUS_LABELS: Record<string, string> = {
  RUNNING: "En proceso",
  SUCCESS: "Completado",
  FAILED: "Con error",
};

const DECISION_LABELS: Record<string, string> = {
  NO_CHANGES: "Sin cambios nuevos",
  PENDING_CREATED: "Cambios listos para revisar",
  DISCARDED_HASH_MATCH: "Cambios ya descartados",
  FAILED: "Búsqueda fallida",
};

const VERSION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "En uso",
  PENDING: "Pendiente",
  DISCARDED: "Descartada",
  SUPERSEDED: "Reemplazada",
};

const TRIGGER_SOURCE_LABELS: Record<string, string> = {
  CRON: "Automática",
  MANUAL: "Manual",
};

function translate(
  labels: Record<string, string>,
  value: string,
): string {
  return labels[value] ?? value;
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
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString("es-CO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(value: string | null): string {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("es-CO", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatNumber(value: number | null): string {
  return value === null
    ? "—"
    : new Intl.NumberFormat("es-CO").format(value);
}

function formatDuration(value: number | null): string {
  if (value === null) {
    return "—";
  }

  if (value < 1000) {
    return `${value} ms`;
  }

  return `${(value / 1000).toFixed(1)} s`;
}

function friendlyError(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    if (err.status === 401) {
      return "La clave no es correcta. Verifícala e intenta de nuevo.";
    }

    if (err.status === 403) {
      return "No tienes permisos para realizar esta acción.";
    }

    if (err.status >= 500) {
      return "El servicio no está disponible en este momento. Intenta más tarde.";
    }

    return err.message;
  }

  return fallback;
}

export function AdminPage() {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [force, setForce] = useState(false);
  const [logs, setLogs] = useState<EtlLogRecord[]>([]);
  const [pendingVersions, setPendingVersions] = useState<PendingVersion[]>([]);
  const [versionHistory, setVersionHistory] = useState<VersionHistoryItem[]>(
    [],
  );
  const [activeLog, setActiveLog] = useState<EtlLogRecord | null>(null);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [isLoadingPending, setIsLoadingPending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [decisionBusy, setDecisionBusy] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const pollTimer = useRef<number | null>(null);

  const activeVersionQuery = useQuery({
    queryKey: ["admin-active-version"],
    queryFn: fetchActiveVersion,
    staleTime: 5 * 60 * 1000,
  });

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
      setError(friendlyError(err, "No se pudo cargar la actividad reciente."));
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
        friendlyError(err, "No se pudieron cargar los cambios pendientes."),
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
        friendlyError(err, "No se pudo cargar el historial de actualizaciones."),
      );
    } finally {
      setIsLoadingHistory(false);
    }
  }, [apiKey]);

  const refreshAll = useCallback(async () => {
    await Promise.all([loadLogs(), loadPending(), loadHistory()]);
    setHasLoaded(true);
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
            setIsSearching(false);
            setMessage(null);
            await refreshAll();
          }
        } catch (err) {
          setError(
            friendlyError(
              err,
              "No se pudo consultar el estado de la búsqueda.",
            ),
          );
          setIsSearching(false);
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
    setHasLoaded(false);
    setIsSearching(false);
    setError(null);
    setMessage(null);
  }, [apiKey, stopPolling]);

  const handleTrigger = async () => {
    if (!apiKey) {
      return;
    }

    setIsTriggering(true);
    setError(null);
    setMessage("Buscando cambios en los datos...");

    try {
      const { etl_log_id } = await triggerEtl(apiKey, force);
      setActiveLog(null);
      setIsSearching(true);
      startPolling(etl_log_id);
    } catch (err) {
      setMessage(null);
      setError(
        friendlyError(err, "No se pudo iniciar la búsqueda de cambios."),
      );
    } finally {
      setIsTriggering(false);
    }
  };

  const handleDecision = async (
    versionId: string,
    action: "apply" | "omit",
  ) => {
    const question =
      action === "apply"
        ? "¿Publicar estos cambios? Los usuarios verán la nueva información."
        : "¿Descartar estos cambios? Los datos publicados no cambiarán.";

    if (!window.confirm(question)) {
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
          ? "Cambios publicados. Los usuarios ya pueden ver la nueva información."
          : "Cambios descartados. Los datos publicados no cambiaron.",
      );
      await refreshAll();
      await activeVersionQuery.refetch();
    } catch (err) {
      setError(
        friendlyError(err, "No se pudo procesar la propuesta de actualización."),
      );
    } finally {
      setDecisionBusy(null);
    }
  };

  const latestLog = activeLog ?? logs[0] ?? null;
  const report = latestLog ? parseLogReport(latestLog.validation_report) : null;
  const isRunning = activeLog?.status === "RUNNING";
  const isRefreshing = isLoadingLogs || isLoadingPending || isLoadingHistory;
  const activeVersion = activeVersionQuery.data ?? null;

  return (
    <main>
      <a className="back-link" href="/">
        ← Volver a la aplicación
      </a>

      <header>
        <h1>Panel de datos</h1>
        <p>Revisa y publica la información agrícola del Valle del Cauca.</p>
      </header>

      <section className="admin-card admin-published">
        <h2>Datos publicados</h2>
        {activeVersionQuery.isLoading ? (
          <p>Cargando...</p>
        ) : activeVersionQuery.isError ? (
          <p role="alert">
            No se pudo consultar el estado actual.{" "}
            <button
              type="button"
              className="text-button"
              onClick={() => void activeVersionQuery.refetch()}
            >
              Reintentar
            </button>
          </p>
        ) : activeVersion ? (
          <div className="published-summary">
            <strong>{formatNumber(activeVersion.total_records)} registros</strong>
            <span>Publicados el {formatDate(activeVersion.created_at)}</span>
            <details className="advanced-options">
              <summary>Información técnica</summary>
              <p className="muted-small">Código: {activeVersion.version_id}</p>
              <p className="muted-small">
                Versión de esquema: {activeVersion.schema_version}
              </p>
            </details>
          </div>
        ) : (
          <p>Todavía no hay datos publicados.</p>
        )}
      </section>

      <section className="admin-card admin-connect">
        <h2>Actualizar los datos</h2>
        <p className="admin-intro">
          Busca datos nuevos y prepara una propuesta. Los cambios no se publican
          hasta que los confirmes.
        </p>

        <div className="admin-form">
          <label className="admin-key-field">
            Clave de administración
            <div className="input-group">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                autoComplete="off"
                placeholder="Escribe la clave"
              />
              <button
                type="button"
                className="input-action"
                onClick={() => setShowKey((visible) => !visible)}
              >
                {showKey ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </label>

          <div className="admin-actions">
            <button
              type="button"
              className="button-primary"
              onClick={() => void handleTrigger()}
              disabled={!apiKey || isTriggering || isSearching || isRunning}
            >
              {isTriggering || isSearching || isRunning
                ? "Buscando..."
                : "Buscar cambios"}
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={() => void refreshAll()}
              disabled={!apiKey || isRefreshing}
            >
              {isRefreshing ? "Cargando..." : "Ver estado"}
            </button>
          </div>
        </div>

        {!apiKey && (
          <p className="field-help">
            Escribe la clave para continuar. Solicítala al responsable del
            sistema.
          </p>
        )}
        <p className="field-help">
          Por seguridad, la clave no se guarda en el navegador.
        </p>

        <details className="advanced-options">
          <summary>Opciones avanzadas</summary>
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={force}
              onChange={(event) => setForce(event.target.checked)}
            />
            Volver a proponer cambios descartados
          </label>
          <p className="field-help">
            Úsalo solo si necesitas revisar de nuevo una actualización que ya
            habías descartado.
          </p>
        </details>

        <details className="help-card">
          <summary>¿Cómo funciona?</summary>
          <ol>
            <li>
              Escribe la clave y pulsa <strong>Ver estado</strong>.
            </li>
            <li>
              Pulsa <strong>Buscar cambios</strong> para consultar datos nuevos.
            </li>
            <li>
              Revisa la propuesta y pulsa <strong>Publicar cambios</strong> o{" "}
              <strong>Descartar</strong>.
            </li>
          </ol>
        </details>
      </section>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="alert alert-success" role="status">
          {message}
        </p>
      )}

      {latestLog && (
        <section className="admin-card admin-last-run">
          <h2>Última búsqueda</h2>
          <p>
            Resultado:{" "}
            <span className="status-badge" data-status={latestLog.status}>
              {translate(LOG_STATUS_LABELS, latestLog.status)}
            </span>
          </p>
          <p>
            Leídos: {formatNumber(latestLog.records_extracted)} · Descartados:{" "}
            {formatNumber(latestLog.records_rejected)} · Duración:{" "}
            {formatDuration(latestLog.execution_time_ms)}
          </p>
          {report?.decision && (
            <p>{translate(DECISION_LABELS, report.decision)}</p>
          )}
          {report?.coverage?.warnings?.map((warning) => (
            <p key={warning} className="pending-warning">
              {warning}
            </p>
          ))}
          {latestLog.error_message && (
            <p className="alert alert-error" role="alert">
              Error: {latestLog.error_message}
            </p>
          )}
          <p className="field-help">
            {formatDateTime(latestLog.started_at)} ·{" "}
            {translate(TRIGGER_SOURCE_LABELS, latestLog.trigger_source)}
          </p>
        </section>
      )}

      <section className="admin-card admin-pending">
        <h2>Cambios pendientes de revisión</h2>
        {!apiKey ? (
          <p>Ingresa la clave para consultar cambios pendientes.</p>
        ) : !hasLoaded ? (
          <p>
            Pulsa <strong>Ver estado</strong> para consultar.
          </p>
        ) : pendingVersions.length === 0 ? (
          <p>No hay cambios pendientes. Los datos publicados están al día.</p>
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

      <section className="admin-card admin-history">
        <h2>Historial de actualizaciones</h2>
        {!hasLoaded ? (
          <p>
            Pulsa <strong>Ver estado</strong> para consultar el historial.
          </p>
        ) : versionHistory.length === 0 ? (
          <p>Todavía no hay actualizaciones registradas.</p>
        ) : (
          <details className="advanced-options">
            <summary>
              Ver últimas actualizaciones ({versionHistory.length})
            </summary>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Estado</th>
                    <th>Registros</th>
                    <th>Publicada</th>
                  </tr>
                </thead>
                <tbody>
                  {versionHistory.map((version) => (
                    <tr key={version.version_id}>
                      <td>
                        <div>{formatDate(version.created_at)}</div>
                        <div className="muted-small">
                          {version.version_id}
                        </div>
                      </td>
                      <td>
                        <span
                          className="status-badge"
                          data-status={version.status}
                        >
                          {translate(VERSION_STATUS_LABELS, version.status)}
                        </span>
                      </td>
                      <td>{formatNumber(version.total_records)}</td>
                      <td>{formatDate(version.applied_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}
      </section>

      <section className="admin-card admin-logs">
        <h2>Actividad reciente</h2>
        {!hasLoaded ? (
          <p>
            Pulsa <strong>Ver estado</strong> para consultar la actividad.
          </p>
        ) : logs.length === 0 ? (
          <p>Todavía no hay actividad registrada.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Resultado</th>
                  <th>Leídos</th>
                  <th>Descartados</th>
                  <th>Duración</th>
                  <th>Revisión</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const logReport = parseLogReport(log.validation_report);

                  return (
                    <tr key={log.id}>
                      <td>{formatDateTime(log.started_at)}</td>
                      <td>
                        {translate(
                          TRIGGER_SOURCE_LABELS,
                          log.trigger_source,
                        )}
                      </td>
                      <td>
                        <span
                          className="status-badge"
                          data-status={log.status}
                        >
                          {translate(LOG_STATUS_LABELS, log.status)}
                        </span>
                      </td>
                      <td>{formatNumber(log.records_extracted)}</td>
                      <td>{formatNumber(log.records_rejected)}</td>
                      <td>{formatDuration(log.execution_time_ms)}</td>
                      <td>
                        {logReport?.decision
                          ? translate(DECISION_LABELS, logReport.decision)
                          : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
