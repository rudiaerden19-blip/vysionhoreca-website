-- Retail winkelpas: punten inwisselen + rapportage op orders
BEGIN;

ALTER TABLE retail_loyalty_settings
  ADD COLUMN IF NOT EXISTS redeem_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS redeem_points_per_euro NUMERIC(10, 4) NOT NULL DEFAULT 100;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS retail_loyalty_points_redeemed INTEGER;

COMMIT;
