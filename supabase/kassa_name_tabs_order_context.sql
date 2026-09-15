-- Na eerdere kassa_name_account_v2 migratie: BTW-context op tab (dine-in / takeaway).
-- Veilig opnieuw uitvoeren (IF NOT EXISTS).

ALTER TABLE kassa_name_tabs
  ADD COLUMN IF NOT EXISTS order_type TEXT NOT NULL DEFAULT 'DINE_IN',
  ADD COLUMN IF NOT EXISTS table_number TEXT,
  ADD COLUMN IF NOT EXISTS floor_plan_zone TEXT;
