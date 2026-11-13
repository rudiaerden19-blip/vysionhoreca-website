-- Eenmalig / onderhoud: The Lagoon zaak-BTW in DB op 21 (logic dwingt dit ook in app).
UPDATE tenant_settings
SET btw_percentage = 21
WHERE tenant_slug IN ('thelagoon', 'the-lagoon');
