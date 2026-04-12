-- Groepsbestellingen: standaard ingeschakeld voor alle tenants (menu-item onder Bestellingen blijft zichtbaar).
-- Nieuwe rijen krijgen feature_group_orders = true tenzij expliciet anders gezet.

ALTER TABLE tenants
  ALTER COLUMN feature_group_orders SET DEFAULT true;

UPDATE tenants
SET feature_group_orders = true
WHERE feature_group_orders IS DISTINCT FROM true;
