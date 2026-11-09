CREATE TABLE IF NOT EXISTS etl_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    started_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    completed_at DATETIME,
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'FAILED', 'RUNNING')),
    trigger_source TEXT NOT NULL CHECK (trigger_source IN ('CRON', 'MANUAL')),
    records_extracted INTEGER DEFAULT 0,
    records_rejected INTEGER DEFAULT 0,
    error_message TEXT,
    validation_report TEXT,
    execution_time_ms INTEGER
);

CREATE TABLE IF NOT EXISTS data_versions (
    version_id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
    schema_version INTEGER NOT NULL,
    hash TEXT NOT NULL,
    total_records INTEGER NOT NULL,
    payload_gzip BLOB NOT NULL,
    is_active INTEGER DEFAULT 0 CHECK (is_active IN (0, 1)),
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'DISCARDED', 'SUPERSEDED')),
    change_summary TEXT,
    applied_at DATETIME,
    discarded_at DATETIME,
    etl_log_id INTEGER,
    FOREIGN KEY (etl_log_id) REFERENCES etl_logs(id)
);

CREATE INDEX IF NOT EXISTS idx_etl_logs_status ON etl_logs(status);
CREATE INDEX IF NOT EXISTS idx_data_versions_active ON data_versions(is_active);
CREATE INDEX IF NOT EXISTS idx_data_versions_status ON data_versions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_data_versions_one_active ON data_versions(is_active) WHERE is_active = 1;
