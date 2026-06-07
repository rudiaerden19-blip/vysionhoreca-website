-- Track B (optioneel): koppel oude fiscal_journal N-rijen aan gks_commercial_orders op ticketnummer.
-- Alleen pilot-tenant; draai handmatig in SQL Editor. Geen productie orders.
-- Tijd lezen: created_at AT TIME ZONE 'Europe/Brussels' AS tijd_belgie

-- Voorbeeld: gkstest
UPDATE fiscal_journal fj
SET commercial_order_id = g.id
FROM gks_commercial_orders g
WHERE fj.tenant_slug = 'gkstest'
  AND g.tenant_slug = 'gkstest'
  AND fj.event_label = 'N'
  AND fj.status = 'SUCCESS'
  AND fj.commercial_order_id IS NULL
  AND g.payment_status = 'paid'
  AND g.order_number = fj.pos_fiscal_ticket_no;

-- Controle
SELECT
  fj.pos_fiscal_ticket_no,
  fj.commercial_order_id,
  g.order_number,
  fj.created_at AT TIME ZONE 'Europe/Brussels' AS tijd_belgie
FROM fiscal_journal fj
LEFT JOIN gks_commercial_orders g
  ON g.tenant_slug = fj.tenant_slug AND g.id = fj.commercial_order_id
WHERE fj.tenant_slug = 'gkstest'
  AND fj.event_label = 'N'
ORDER BY fj.created_at DESC
LIMIT 10;
