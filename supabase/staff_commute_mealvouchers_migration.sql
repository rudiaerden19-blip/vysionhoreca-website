-- Staff Commute Distance & Meal Vouchers Migration
-- Voor woon-werk kilometers en maaltijdcheques

-- Kolom voor woon-werk afstand (enkele reis in km)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS commute_distance_km DECIMAL(6,2) DEFAULT 0;

-- Kolom voor maaltijdcheques (ja/nee)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS has_meal_vouchers BOOLEAN DEFAULT false;

-- Kolom voor km vergoeding per km (standaard €0.4297 - fiscaal maximum België 2024)
ALTER TABLE staff ADD COLUMN IF NOT EXISTS km_rate DECIMAL(6,4) DEFAULT 0.4297;

-- Comments
COMMENT ON COLUMN staff.commute_distance_km IS 'Woon-werk afstand enkele reis in km';
COMMENT ON COLUMN staff.has_meal_vouchers IS 'Heeft medewerker recht op maaltijdcheques';
COMMENT ON COLUMN staff.km_rate IS 'Vergoeding per km (standaard fiscaal maximum)';
