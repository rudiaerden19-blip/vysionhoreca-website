-- Z-Rapport Audit Trail Migration
-- KRITIEK voor fiscale compliance: 7 jaar bewaarplicht

-- Voeg audit kolommen toe aan z_reports
ALTER TABLE z_reports ADD COLUMN IF NOT EXISTS order_ids UUID[] DEFAULT '{}';
ALTER TABLE z_reports ADD COLUMN IF NOT EXISTS report_hash VARCHAR(64);
ALTER TABLE z_reports ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

-- Index op report_hash voor snelle verificatie
CREATE INDEX IF NOT EXISTS idx_z_reports_hash ON z_reports(report_hash);

-- Comment voor documentatie
COMMENT ON COLUMN z_reports.order_ids IS 'Array van order UUIDs die in dit rapport zijn opgenomen - audit trail';
COMMENT ON COLUMN z_reports.report_hash IS 'SHA-256 hash van rapport data voor integriteitsverificatie';
COMMENT ON COLUMN z_reports.verified_at IS 'Timestamp wanneer rapport laatst geverifieerd is';

-- Prevent DELETE on z_reports (fiscale bewaarplicht)
-- Z-Rapporten mogen NOOIT verwijderd worden door tenants
DROP POLICY IF EXISTS "Tenants cannot delete z_reports" ON z_reports;

-- Revoke DELETE permission
REVOKE DELETE ON z_reports FROM authenticated;
REVOKE DELETE ON z_reports FROM anon;

-- Only superadmin (service role) can delete if absolutely necessary
-- This is intentionally restrictive for compliance
