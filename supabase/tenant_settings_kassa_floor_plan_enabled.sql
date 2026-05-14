-- Plattegrond op de webkassa aan/uit per tenant (Admin › Kassa-terminal)
-- Voer uit in Supabase SQL Editor voor bestaande projecten.

ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_floor_plan_enabled BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN tenant_settings.kassa_floor_plan_enabled IS
  'false = geen plattegrond-UI op kassa en geen floor_plan_tables/floor_plan_decor sync & realtime op het verkoopscherm (minder netwerk).';
