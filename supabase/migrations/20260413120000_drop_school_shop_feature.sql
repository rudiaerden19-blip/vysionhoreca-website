-- Verwijder school-shop (feature teruggedraaid in app). Veilig als tabellen/kolom nog niet bestonden.

ALTER TABLE orders DROP COLUMN IF EXISTS school_shop_week_id;

DROP INDEX IF EXISTS idx_orders_school_shop_week;

DROP TABLE IF EXISTS school_shop_week_products CASCADE;
DROP TABLE IF EXISTS school_shop_weeks CASCADE;

DROP FUNCTION IF EXISTS school_shop_weeks_set_updated_at() CASCADE;
