-- Voorlopige bon (gele bon): geen auto-keuken na kassaslip in Print Agent (companionKitchen).
-- Default uit — alle bestaande tenants ongewijzigd.
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS kassa_draft_bon_skip_buddy_kitchen BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN tenant_settings.kassa_draft_bon_skip_buddy_kitchen IS
  'true = kassaslip stuurt companionKitchen false (sneller, geen auto-keuken na bar/kassa). Keuken via receiptMode keuken blijft. Per tenant via SQL/superadmin.';

-- Pilot: Dr. Ner Kebab Laakdal (mand ~4s door sync buddy-keuken).
UPDATE tenant_settings
SET kassa_draft_bon_skip_buddy_kitchen = true
WHERE tenant_slug = 'drnerkebablaakdal';
