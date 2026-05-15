-- Optioneel BTW-tarief per menucategorie voor kassa/orderregels.
-- NULL = gebruik tenant_settings.btw_percentage (bestaand gedrag voor alle tenants).

ALTER TABLE menu_categories
  ADD COLUMN IF NOT EXISTS default_btw_percentage INTEGER NULL;

COMMENT ON COLUMN menu_categories.default_btw_percentage IS
  'Toegestane waarden 6/9/12/21 of NULL (zaak-standaard uit tenant_settings).';
