-- Retail klant: optioneel BTW-nummer (bon als factuur in kassa)
ALTER TABLE shop_customers
  ADD COLUMN IF NOT EXISTS btw_number VARCHAR(50);
