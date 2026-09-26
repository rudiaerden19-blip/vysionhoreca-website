-- Voornaam/achternaam en adres op de klantenkaart, ook zonder e-mail.
-- Promo: van/tot en een tweede artikel dat meetelt.

ALTER TABLE retail_loyalty_members
  ADD COLUMN IF NOT EXISTS first_name TEXT;

ALTER TABLE retail_loyalty_members
  ADD COLUMN IF NOT EXISTS last_name TEXT;

ALTER TABLE retail_loyalty_members
  ADD COLUMN IF NOT EXISTS address TEXT;

ALTER TABLE retail_loyalty_members
  ADD COLUMN IF NOT EXISTS postal_code TEXT;

ALTER TABLE retail_loyalty_members
  ADD COLUMN IF NOT EXISTS city TEXT;

ALTER TABLE retail_loyalty_members
  ADD COLUMN IF NOT EXISTS btw_number TEXT;

ALTER TABLE shop_customers
  ADD COLUMN IF NOT EXISTS first_name TEXT;

ALTER TABLE shop_customers
  ADD COLUMN IF NOT EXISTS last_name TEXT;

ALTER TABLE menu_products
  ADD COLUMN IF NOT EXISTS retail_promo_from DATE;

ALTER TABLE menu_products
  ADD COLUMN IF NOT EXISTS retail_promo_until DATE;

ALTER TABLE menu_products
  ADD COLUMN IF NOT EXISTS retail_promo_partner_id UUID;

UPDATE retail_loyalty_members
SET
  first_name = NULLIF(split_part(btrim(display_name), ' ', 1), ''),
  last_name = NULLIF(btrim(regexp_replace(btrim(display_name), '^\S+\s*', '')), '')
WHERE display_name IS NOT NULL
  AND btrim(display_name) <> ''
  AND first_name IS NULL
  AND last_name IS NULL;
