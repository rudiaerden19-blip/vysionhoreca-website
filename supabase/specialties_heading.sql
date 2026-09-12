-- Titel boven de specialiteiten op de website (per tenant, optioneel).
ALTER TABLE tenant_settings
  ADD COLUMN IF NOT EXISTS specialties_heading TEXT;
