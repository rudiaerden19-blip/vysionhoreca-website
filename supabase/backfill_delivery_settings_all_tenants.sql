-- Eenmalig in Supabase SQL Editor: ontbrekende delivery_settings voor alle bestaande tenants
-- (nieuwe tenants krijgen dit voortaan via registratie / superadmin bootstrap)
INSERT INTO delivery_settings (
  tenant_slug,
  pickup_enabled,
  pickup_time_minutes,
  delivery_enabled,
  delivery_fee,
  min_order_amount,
  delivery_radius_km,
  delivery_time_minutes,
  payment_cash,
  payment_card,
  payment_online
)
SELECT
  t.slug,
  true,
  15,
  true,
  2.50,
  15.00,
  5,
  30,
  true,
  true,
  false
FROM tenants t
WHERE NOT EXISTS (
  SELECT 1 FROM delivery_settings d WHERE d.tenant_slug = t.slug
)
ON CONFLICT (tenant_slug) DO NOTHING;
