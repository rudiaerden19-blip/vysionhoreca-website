-- Z-Rapport Dag Afsluiten Migration
-- KRITIEK voor fiscale compliance (Belgische GKS wetgeving)
-- Een afgesloten dag kan NOOIT meer gewijzigd worden

ALTER TABLE z_reports ADD COLUMN IF NOT EXISTS is_closed BOOLEAN DEFAULT false;
ALTER TABLE z_reports ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;

-- Index voor snelle opzoeking gesloten rapporten
CREATE INDEX IF NOT EXISTS idx_z_reports_closed ON z_reports(tenant_slug, is_closed);

-- Documentatie
COMMENT ON COLUMN z_reports.is_closed IS 'Dag definitief afgesloten door eigenaar - GKS immutabiliteit';
COMMENT ON COLUMN z_reports.closed_at IS 'Timestamp waarop eigenaar de dag heeft afgesloten';
