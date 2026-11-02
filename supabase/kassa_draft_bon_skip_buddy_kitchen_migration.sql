-- Voorlopige bon (gele bon): geen auto-keuken na kassaslip in Print Agent (companionKitchen).
-- Default uit — alle bestaande tenants ongewijzigd.
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_draft_bon_skip_buddy_kitchen BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenant_settings.kassa_draft_bon_skip_buddy_kitchen IS
  'Pilot (o.a. donerkebablaakdal): draft zonder buddy-keuken; betaalde bon zelfde prints, UI wacht niet op agent. Default false.';

-- Pilot: Dr. Ner Kebab Laakdal (mand ~4s door sync buddy-keuken).
UPDATE tenant_settings
SET kassa_draft_bon_skip_buddy_kitchen = true
WHERE tenant_slug = 'donerkebablaakdal';
