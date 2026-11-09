ALTER TABLE data_versions ADD COLUMN status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACTIVE', 'DISCARDED', 'SUPERSEDED'));
ALTER TABLE data_versions ADD COLUMN change_summary TEXT;
ALTER TABLE data_versions ADD COLUMN applied_at DATETIME;
ALTER TABLE data_versions ADD COLUMN discarded_at DATETIME;

UPDATE data_versions SET status = 'ACTIVE', applied_at = created_at WHERE is_active = 1;
UPDATE data_versions SET status = 'SUPERSEDED' WHERE is_active = 0;

CREATE INDEX IF NOT EXISTS idx_data_versions_status ON data_versions(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_data_versions_one_active ON data_versions(is_active) WHERE is_active = 1;
