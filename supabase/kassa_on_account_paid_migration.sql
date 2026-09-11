-- Deelbetaling op een openstaande rekening. Bestaande rijen: volledig betaald → amount_paid = amount.
ALTER TABLE kassa_on_account
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0;

UPDATE kassa_on_account
SET amount_paid = amount
WHERE is_paid = true AND (amount_paid IS NULL OR amount_paid = 0);
