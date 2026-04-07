-- Sessies in/uitklokken (meerdere per dag) + koppeling kassa-omzet aan medewerker
-- Voer uit in Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS staff_clock_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_slug TEXT NOT NULL,
  staff_id UUID NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
  clock_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_clock_sessions_tenant_staff
  ON staff_clock_sessions (tenant_slug, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_clock_sessions_open
  ON staff_clock_sessions (tenant_slug, staff_id)
  WHERE clock_out_at IS NULL;

COMMENT ON TABLE staff_clock_sessions IS
  'Kassa-personeel: meerdere in/uitklok-sessies per dag; open sessie = clock_out_at IS NULL.';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS kassa_staff_id UUID REFERENCES staff(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_kassa_staff_day
  ON orders (tenant_slug, kassa_staff_id)
  WHERE kassa_staff_id IS NOT NULL;

COMMENT ON COLUMN orders.kassa_staff_id IS
  'Medewerker die via kassa Verkoop actief was bij deze betaling (PIN-klok).';

ALTER TABLE staff_clock_sessions ENABLE ROW LEVEL SECURITY;

-- Geen publieke policies: app gebruikt service role op /api/kassa/staff-clock
-- Optioneel strakker (service-only): geen policies = alleen service role
