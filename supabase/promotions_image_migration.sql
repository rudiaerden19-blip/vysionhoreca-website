-- Promotions Image & Description Migration
-- Voegt image_url, description en product_id toe aan promotions tabel
-- Maakt code kolom optioneel (nullable)

-- Voeg nieuwe kolommen toe
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE promotions ADD COLUMN IF NOT EXISTS product_id UUID REFERENCES menu_products(id) ON DELETE SET NULL;

-- Maak code kolom nullable (niet meer verplicht)
ALTER TABLE promotions ALTER COLUMN code DROP NOT NULL;

-- Comment voor documentatie
COMMENT ON COLUMN promotions.image_url IS 'URL van de promotie afbeelding';
COMMENT ON COLUMN promotions.description IS 'Beschrijving van de promotie/aanbieding';
COMMENT ON COLUMN promotions.product_id IS 'Gekoppeld product voor vaste prijs promoties';
