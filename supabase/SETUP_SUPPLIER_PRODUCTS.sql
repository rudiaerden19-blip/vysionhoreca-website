-- Supplier Products Database for Vysion Horeca
-- Leveranciers producten met automatische kostprijsberekening
-- Created: January 2026

-- Drop existing table if exists
DROP TABLE IF EXISTS supplier_products CASCADE;

-- Main supplier products table
CREATE TABLE supplier_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Product identificatie
  article_number TEXT NOT NULL,                    -- Artikelnummer (bijv. "803")
  name TEXT NOT NULL,                              -- Productnaam (bijv. "HAMBURGER 30X100G VAN ZON")
  
  -- Prijzen & verpakking
  package_price DECIMAL(10,2) NOT NULL,            -- Prijs per doos/verpakking (bijv. €11.49)
  units_per_package INTEGER NOT NULL DEFAULT 1,    -- Aantal stuks per verpakking (bijv. 30)
  unit_price DECIMAL(10,4) GENERATED ALWAYS AS    -- Prijs per stuk (automatisch berekend)
    (CASE WHEN units_per_package > 0 
          THEN package_price / units_per_package 
          ELSE package_price END) STORED,
  
  -- Eenheid info
  unit TEXT DEFAULT 'stuk',                        -- Eenheid: stuk, kg, liter, etc.
  unit_weight TEXT,                                -- Gewicht per stuk (bijv. "100G", "85G")
  
  -- Voorraad & status
  stock_status TEXT DEFAULT 'Op voorraad',         -- Op voorraad, Beperkte voorraad, Niet op voorraad
  is_available BOOLEAN DEFAULT true,
  
  -- Categorisatie
  category TEXT,                                   -- VLEES, SAUZEN, BROOD, VERPAKKING, DRANKEN, etc.
  
  -- Per tenant (elke snackbar eigen data)
  tenant_slug TEXT,                                -- NULL = algemene database, anders tenant-specifiek
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: artikel + tenant
  UNIQUE(article_number, tenant_slug)
);

-- Indexes voor snelle zoekresultaten
CREATE INDEX idx_supplier_products_name ON supplier_products USING gin(to_tsvector('dutch', name));
CREATE INDEX idx_supplier_products_article ON supplier_products(article_number);
CREATE INDEX idx_supplier_products_category ON supplier_products(category);
CREATE INDEX idx_supplier_products_tenant ON supplier_products(tenant_slug);
CREATE INDEX idx_supplier_products_available ON supplier_products(is_available);

-- Full-text search function
CREATE OR REPLACE FUNCTION search_supplier_products(
  search_query TEXT,
  p_tenant_slug TEXT DEFAULT NULL,
  p_category TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  article_number TEXT,
  name TEXT,
  package_price DECIMAL(10,2),
  units_per_package INTEGER,
  unit_price DECIMAL(10,4),
  unit TEXT,
  stock_status TEXT,
  category TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sp.id,
    sp.article_number,
    sp.name,
    sp.package_price,
    sp.units_per_package,
    sp.unit_price,
    sp.unit,
    sp.stock_status,
    sp.category
  FROM supplier_products sp
  WHERE sp.is_available = true
    AND (p_tenant_slug IS NULL OR sp.tenant_slug IS NULL OR sp.tenant_slug = p_tenant_slug)
    AND (p_category IS NULL OR sp.category = p_category)
    AND (
      sp.name ILIKE '%' || search_query || '%'
      OR sp.article_number ILIKE '%' || search_query || '%'
      OR to_tsvector('dutch', sp.name) @@ plainto_tsquery('dutch', search_query)
    )
  ORDER BY 
    CASE WHEN sp.name ILIKE search_query || '%' THEN 0 ELSE 1 END,
    sp.name
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies
ALTER TABLE supplier_products ENABLE ROW LEVEL SECURITY;

-- Allow all operations (we handle tenant filtering in queries)
CREATE POLICY "Allow all for supplier_products" ON supplier_products 
  FOR ALL USING (true) WITH CHECK (true);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_supplier_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_supplier_products_updated_at
  BEFORE UPDATE ON supplier_products
  FOR EACH ROW EXECUTE FUNCTION update_supplier_products_updated_at();

-- Comment
COMMENT ON TABLE supplier_products IS 'Leveranciers producten database met automatische kostprijsberekening per stuk';
-- Supplier Products Seed Data
-- Meest gebruikte frituur/snackbar artikelen
-- Gegenereerd uit leverancierslijsten januari 2026

-- Clear existing data
TRUNCATE supplier_products CASCADE;

-- Insert all products
-- Format: (article_number, name, package_price, units_per_package, unit, unit_weight, stock_status, category)

INSERT INTO supplier_products (article_number, name, package_price, units_per_package, unit, unit_weight, stock_status, category) VALUES

-- =====================================================
-- VLEES & SNACKS - Hamburgers
-- =====================================================
('803', 'HAMBURGER 30X100G VAN ZON', 11.49, 30, 'stuk', '100G', 'Op voorraad', 'VLEES'),
('787', 'HAMBURGER BECKERS 25+5X100G', 19.35, 30, 'stuk', '100G', 'Op voorraad', 'VLEES'),
('75469', 'HAMBURGER XXL 24X200G VR', 29.90, 24, 'stuk', '200G', 'Beperkte voorraad', 'VLEES'),
('1483', 'HAMBURGER EXTRA (KIP) 30X100G VR', 18.37, 30, 'stuk', '100G', 'Beperkte voorraad', 'VLEES'),
('46548', 'HAMBURGER RUNDS GIANT 28X180G SALOMON', 79.78, 28, 'stuk', '180G', 'Beperkte voorraad', 'VLEES'),
('71071', 'CMS IERS ANGUS BURGER VOORGEGAARD 16X135G', 34.18, 16, 'stuk', '135G', 'Op voorraad', 'VLEES'),
('61780', 'CMS IERS ANGUS BURGER VOORGEGAARD 24X90G', 34.18, 24, 'stuk', '90G', 'Op voorraad', 'VLEES'),
('61782', 'CMS IERS PRIME BURGER SMOKED SEA SALT 40X150G', 85.88, 40, 'stuk', '150G', 'Op voorraad', 'VLEES'),
('66782', 'BICKY BURGER VEGA FLEX BASTARDS 16X100G', 26.70, 16, 'stuk', '100G', 'Beperkte voorraad', 'VLEES'),
('74065', 'CMS PLAENTY PLANT-BASED FLAT BURGER 10X110G', 15.29, 10, 'stuk', '110G', 'Op voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Frikandellen
-- =====================================================
('623', 'FRIKANDEL BECKERS ORIGINAL 36+4STX85G', 21.41, 40, 'stuk', '85G', 'Op voorraad', 'VLEES'),
('1327', 'FRIKANDEL BECKERS MAXI-FRIK 36+4STX100G', 16.05, 40, 'stuk', '100G', 'Op voorraad', 'VLEES'),
('629', 'FRIKANDEL MEGA-FRIK 40X100G VAN ZON', 11.39, 40, 'stuk', '100G', 'Op voorraad', 'VLEES'),
('25120', 'FRIKANDEL SUPER (BIK) 40X100G VAN ZON', 13.39, 40, 'stuk', '100G', 'Op voorraad', 'VLEES'),
('7046', 'FRIKANDEL BEST BITE 40X100G VR', 16.49, 40, 'stuk', '100G', 'Op voorraad', 'VLEES'),
('58276', 'FRIKANDEL KIP HALAL 40X85G BECKERS', 18.73, 40, 'stuk', '85G', 'Beperkte voorraad', 'VLEES'),
('50806', 'FRIKANDEL XXL 20X250G VR', 24.49, 20, 'stuk', '250G', 'Op voorraad', 'VLEES'),
('65591', 'FRIKANDEL VEGETARISCH 20X70G MORA', 14.84, 20, 'stuk', '70G', 'Op voorraad', 'VLEES'),
('49498', 'PROHALAL FRIKANDEL 40X85G VR', 15.10, 40, 'stuk', '85G', 'Op voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Kroketten
-- =====================================================
('677', 'VLEESKROKET 10% 28X100G AVG', 13.89, 28, 'stuk', '100G', 'Op voorraad', 'VLEES'),
('12703', 'VLEESKROKET 10% 24X100G PB', 11.30, 24, 'stuk', '100G', 'Beperkte voorraad', 'VLEES'),
('16310', 'VLEESKROKET 25% 24X100G PB', 14.82, 24, 'stuk', '100G', 'Beperkte voorraad', 'VLEES'),
('5565', 'VLEESKROKET BECKERS ORIGINAL 10% 28X100G', 20.07, 28, 'stuk', '100G', 'Beperkte voorraad', 'VLEES'),
('42876', 'VLEESKROKET BECKERS BRETI 20% 28X80G', 23.02, 28, 'stuk', '80G', 'Beperkte voorraad', 'VLEES'),
('1979', 'GOULASHKROKET 15% 24X100G PB', 14.81, 24, 'stuk', '100G', 'Beperkte voorraad', 'VLEES'),
('727', 'GOULASHKROKET 10% 28X100G AVG', 22.02, 28, 'stuk', '100G', 'Beperkte voorraad', 'VLEES'),
('13704', 'KAASKROKET 24X80G PB', 16.39, 24, 'stuk', '80G', 'Op voorraad', 'VLEES'),
('744', 'KAASKROKET BECKERS PARMESAN 27ST', 16.87, 27, 'stuk', NULL, 'Beperkte voorraad', 'VLEES'),
('14811', 'GARNAALKROKET 24X80G PB', 48.52, 24, 'stuk', '80G', 'Beperkte voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Boelets & Gehaktballen
-- =====================================================
('655', 'BOELET 24X140G VAN ZON', 13.89, 24, 'stuk', '140G', 'Op voorraad', 'VLEES'),
('7533', 'BOELET 24X140G VR', 20.76, 24, 'stuk', '140G', 'Op voorraad', 'VLEES'),
('25813', 'BOELET SUPER 21+3X140G BECKERS', 22.65, 24, 'stuk', '140G', 'Op voorraad', 'VLEES'),
('654', 'GACKIE GEHAKTBAL 20X125G MORA', 20.91, 20, 'stuk', '125G', 'Beperkte voorraad', 'VLEES'),
('49499', 'PROHALAL GEHAKTBAL 24X140G VR', 20.11, 24, 'stuk', '140G', 'Op voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Cervela & Braadworst
-- =====================================================
('915', 'CERVELA ROOD 5X6X140G VR', 27.99, 30, 'stuk', '140G', 'Op voorraad', 'VLEES'),
('27067', 'CERVELA HALAL 30X150G OVI', 39.10, 30, 'stuk', '150G', 'Beperkte voorraad', 'VLEES'),
('919', 'BRAADWORST WIT 24X150G VR', 29.29, 24, 'stuk', '150G', 'Op voorraad', 'VLEES'),
('1054', 'BOCKWORST ZONDER VEL 24X125G VR', 34.23, 24, 'stuk', '125G', 'Beperkte voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Krokidellen & Specials
-- =====================================================
('883', 'GIANTDELLEN (KROKIDEL) 20X100G VAN ZON', 13.39, 20, 'stuk', '100G', 'Op voorraad', 'VLEES'),
('48119', 'KROKIDEL XXL 14X160G VR', 19.90, 14, 'stuk', '160G', 'Beperkte voorraad', 'VLEES'),
('75749', 'PROHALAL KROKIDEL 20X100G VR', 18.26, 20, 'stuk', '100G', 'Beperkte voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Mexicano & Pikant
-- =====================================================
('31350', 'MEXICANO XL 15X135G DE VRIES', 17.49, 15, 'stuk', '135G', 'Op voorraad', 'VLEES'),
('73953', 'MINI MEXICANO 50X30G DE VRIES', 17.76, 50, 'stuk', '30G', 'Beperkte voorraad', 'VLEES'),
('66208', 'BICKY MEXICANO BURGER 24X135G', 29.32, 24, 'stuk', '135G', 'Beperkte voorraad', 'VLEES'),
('44202', 'LUCIFER 20X95G MORA', 26.19, 20, 'stuk', '95G', 'Op voorraad', 'VLEES'),
('660', 'GEHAKTSTAAF PIKANTO 30X120G MORA', 27.57, 30, 'stuk', '120G', 'Beperkte voorraad', 'VLEES'),
('77323', 'CRIZLY PIKANT 21X150G VR', 37.89, 21, 'stuk', '150G', 'Op voorraad', 'VLEES'),
('79437', 'PROHALAL CRIZLY 14X150G VR', 27.20, 14, 'stuk', '150G', 'Beperkte voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Sito & Kalkoenstick
-- =====================================================
('13836', 'SITO 21X135G (KALKOENSTICK) VAN ZON', 26.19, 21, 'stuk', '135G', 'Op voorraad', 'VLEES'),
('952', 'SITO GOLD 21X125G MORA', 32.39, 21, 'stuk', '125G', 'Op voorraad', 'VLEES'),
('6508', 'KALKOENSTICK 21X135G VR', 32.88, 21, 'stuk', '135G', 'Beperkte voorraad', 'VLEES'),
('79438', 'PROHALAL KALKOENSTICK 21X135G VR', 32.42, 21, 'stuk', '135G', 'Op voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Viandel & Ragoezi
-- =====================================================
('904', 'VIANDEL 27X100G MORA', 24.64, 27, 'stuk', '100G', 'Op voorraad', 'VLEES'),
('898', 'RAGOEZI 30X100G MORA', 28.22, 30, 'stuk', '100G', 'Beperkte voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Satés
-- =====================================================
('951', 'SATE GS ROSE 25X130G VR', 46.51, 25, 'stuk', '130G', 'Op voorraad', 'VLEES'),
('7209', 'SATE KIP 20X100G VAN ZON', 31.86, 20, 'stuk', '100G', 'Beperkte voorraad', 'VLEES'),
('937', 'ARDEENSE SATE 30X105G VR', 56.87, 30, 'stuk', '105G', 'Beperkte voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Kipproducten
-- =====================================================
('144', 'KIPKORN 36X80G MORA', 38.29, 36, 'stuk', '80G', 'Op voorraad', 'VLEES'),
('332', 'KIPFINGERS 20X6ST MORA', 34.65, 120, 'stuk', NULL, 'Op voorraad', 'VLEES'),
('6597', 'KIPNUGGETS 2KG 100ST VAN ZON', 18.39, 100, 'stuk', '20G', 'Op voorraad', 'VLEES'),
('52931', 'CHICKIES KIPSTAAFJES (FINGERS) + DOOSJE 120X19G VR', 27.99, 120, 'stuk', '19G', 'Op voorraad', 'VLEES'),
('75748', 'PROHALAL CHICKIES (FINGERS) 120X19G VR', 35.64, 120, 'stuk', '19G', 'Beperkte voorraad', 'VLEES'),
('31295', 'NUGGIZZ (NUGGETS) 90X22G VR', 25.09, 90, 'stuk', '22G', 'Beperkte voorraad', 'VLEES'),
('31427', 'KIPBURGER XL 15X110G MORA', 21.17, 15, 'stuk', '110G', 'Op voorraad', 'VLEES'),
('47308', 'KIPBURGER LUXE 100G 2,5KG TOP TABLE', 20.57, 25, 'stuk', '100G', 'Op voorraad', 'VLEES'),
('73284', 'BICKY CRUNCHY CHICKEN 20+4X80G', 19.70, 24, 'stuk', '80G', 'Beperkte voorraad', 'VLEES'),
('6362', 'BICKY CHICKEN BURGER 24X85G', 29.49, 24, 'stuk', '85G', 'Beperkte voorraad', 'VLEES'),
('73567', 'BICKY CHICKLESS BURGER 24X80G', 27.44, 24, 'stuk', '80G', 'Beperkte voorraad', 'VLEES'),
('68617', 'BICKY CRISPY BURGER (25+5)X110G', 20.49, 30, 'stuk', '110G', 'Op voorraad', 'VLEES'),
('47922', 'BICKY ROYAL BURGER 13+3X165G', 24.03, 16, 'stuk', '165G', 'Op voorraad', 'VLEES'),
('65861', 'BIG WING STICK 10X325G HENNY''S HOFKIP', 43.32, 10, 'stuk', '325G', 'Beperkte voorraad', 'VLEES'),
('22679', 'C.M HALVE KIP GEGAARD 450-500G PER STUK', 5.35, 1, 'stuk', '475G', 'Op voorraad', 'VLEES'),
('999', 'KIPWIT GEPLUISD GEKOOKT 2,5KG EUR.CUISSON', 25.59, 1, 'kg', '2500G', 'Beperkte voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Fishburger
-- =====================================================
('954', 'FISHBURGER 24X85G MORA', 32.30, 24, 'stuk', '85G', 'Beperkte voorraad', 'VLEES'),
('60241', 'BICKY FISHBURGER 24X85G DV', 22.63, 24, 'stuk', '85G', 'Beperkte voorraad', 'VLEES'),
('33044', 'FISHBURGER XL 15X120G MORA', 24.71, 15, 'stuk', '120G', 'Beperkte voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Loempias
-- =====================================================
('10505', 'LOEMPIA EXCELLENT 12X200G BECKERS', 22.95, 12, 'stuk', '200G', 'Beperkte voorraad', 'VLEES'),
('822', 'LOEMPIA BECKERS KIPFILET 12X200G', 28.78, 12, 'stuk', '200G', 'Beperkte voorraad', 'VLEES'),
('834', 'LOEMPIA VEGETARISCH 20X150G BECKERS', 31.03, 20, 'stuk', '150G', 'Beperkte voorraad', 'VLEES'),
('27349', 'MINI LOEMPIA 120X15G DE VRIES', 30.89, 120, 'stuk', '15G', 'Op voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Bitterballen & Specials
-- =====================================================
('15902', 'BITTERBALLEN 20% 96X20G PB', 12.86, 96, 'stuk', '20G', 'Beperkte voorraad', 'VLEES'),
('902', 'TACO BOCADO 12X125G MORA', 17.54, 12, 'stuk', '125G', 'Beperkte voorraad', 'VLEES'),
('955', 'PICKNICKER 24X110G MORA', 33.99, 24, 'stuk', '110G', 'Op voorraad', 'VLEES'),
('34048', 'BELCANTO MAXI 15X140G VR', 16.65, 15, 'stuk', '140G', 'Op voorraad', 'VLEES'),
('49500', 'PROHALAL BELCANTO 15X140G VR', 19.03, 15, 'stuk', '140G', 'Op voorraad', 'VLEES'),
('907', 'ZIGEUNERSTICK 25X100G MORA', 29.17, 25, 'stuk', '100G', 'Beperkte voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Vlammetjes
-- =====================================================
('856', 'MINI VLAMMETJES 72X18G TOPKING', 30.21, 72, 'stuk', '18G', 'Op voorraad', 'VLEES'),
('6001', 'VLAMPIJPEN 12X100G TOPKING', 19.20, 12, 'stuk', '100G', 'Beperkte voorraad', 'VLEES'),
('874', 'VLAM VRETERS 20X70G TOPKING', 25.00, 20, 'stuk', '70G', 'Beperkte voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Gyros & Pulled Pork
-- =====================================================
('62400', 'CMS M.YEEROS GYROS KIP 1KG', 17.10, 1, 'kg', '1000G', 'Op voorraad', 'VLEES'),
('62364', 'CMS M.YEEROS GYROS VARKENS 1KG', 16.36, 1, 'kg', '1000G', 'Op voorraad', 'VLEES'),
('52927', 'CMS PULLED PORK 2X1KG', 27.47, 2, 'kg', '1000G', 'Op voorraad', 'VLEES'),

-- =====================================================
-- VLEES & SNACKS - Stoofvlees & Goulash
-- =====================================================
('13701', 'STOOFVLEES VERS RUNDS 2,5KG NEVEN', 22.85, 1, 'kg', '2500G', 'Op voorraad', 'VLEES'),
('26198', 'GOULASH VERS RUNDS 2,5KG NEVEN', 22.04, 1, 'kg', '2500G', 'Op voorraad', 'VLEES'),
('62880', 'CMS BUTCHER LIMBURGS STOOFVLEES 1KG', 19.07, 1, 'kg', '1000G', 'Op voorraad', 'VLEES'),
('63263', 'CMS BUTCHER GOULASH 2.1KG', 28.11, 1, 'kg', '2100G', 'Op voorraad', 'VLEES'),
('9081', 'C.M STOOFVLEES SAUS 1,7KG', 12.49, 1, 'kg', '1700G', 'Op voorraad', 'VLEES'),
('19367', 'VIDE VULLING VERS 2,5KG NEVEN', 19.80, 1, 'kg', '2500G', 'Beperkte voorraad', 'VLEES'),

-- =====================================================
-- VLEES - Spek & Bacon
-- =====================================================
('73713', 'SPEK VGB CRISPY STREAKY BACON 500G', 14.39, 1, 'stuk', '500G', 'Op voorraad', 'VLEES'),
('56557', 'CRISPY BACON SPEKBLOKJES 500G', 11.18, 1, 'stuk', '500G', 'Op voorraad', 'VLEES'),
('62225', 'GEROOKT SPEK ONTBIJT VGS 2MM +-1,2KG PP/KG SELECTA', 14.33, 1, 'kg', NULL, 'Niet op voorraad', 'VLEES'),
('37666', 'CMS SPEK GEROOKT ONTBIJT GESNEDEN 6X10X1.5MM PPKG', 17.91, 1, 'kg', NULL, 'Op voorraad', 'VLEES'),

-- =====================================================
-- VLEES - Ham & Charcuterie
-- =====================================================
('35533', 'ONTVETTE HAM BAGUETTE GESN. 5X15CM PP/KG SELECTA', 12.99, 1, 'kg', NULL, 'Op voorraad', 'VLEES'),
('70163', 'CMS ONTVETTE HAM BAGUETTE GESNEDEN 500G', 5.99, 1, 'stuk', '500G', 'Op voorraad', 'VLEES'),
('19998', 'PIC-NIC SCHOUDERHAM GESNEDEN 500G SELECTA', 6.48, 1, 'stuk', '500G', 'Op voorraad', 'VLEES'),

-- =====================================================
-- VLEES - Preparé & Americain
-- =====================================================
('35193', 'CMS PREPARE DU CHEF 1KG', 9.56, 1, 'kg', '1000G', 'Op voorraad', 'VLEES'),
('82173', 'PREPARE DU CHEF 1,25KG TRAITEUR PIERROT', 13.70, 1, 'kg', '1250G', 'Op voorraad', 'VLEES'),
('1415', 'AMERICAIN 3L PET VANDEMOORTELE', 15.27, 1, 'stuk', '3000G', 'Op voorraad', 'VLEES'),

-- =====================================================
-- VLEES - Sjaslik & Saté
-- =====================================================
('62072', 'CMS SJASLIK SATE VARKENS 10X180G', 26.78, 10, 'stuk', '180G', 'Op voorraad', 'VLEES'),
('34804', 'CMS KALKOEN SOUVLAKI GEMARINEERD 20X +-80G PPKG', 22.05, 20, 'stuk', '80G', 'Op voorraad', 'VLEES'),
('39825', 'CMS SPARERIB GEKRUID/GEMARINEERD PSV DIEPVRIE PPKG', 9.10, 1, 'kg', NULL, 'Op voorraad', 'VLEES'),

-- =====================================================
-- BAMI & NASI
-- =====================================================
('762', 'BAMIBLOK (VEGGIE) 24X125G LAAN', 16.25, 24, 'stuk', '125G', 'Op voorraad', 'BAMI'),
('9520', 'BAMIBLOK 24X125G PB', 16.84, 24, 'stuk', '125G', 'Beperkte voorraad', 'BAMI'),
('760', 'BAMIBLOK EXTRA PITTIG 20X125G WELTEN', 16.34, 20, 'stuk', '125G', 'Beperkte voorraad', 'BAMI'),
('67289', 'BAMIBLOK SUPER 18X150G VAN ZON', 10.34, 18, 'stuk', '150G', 'Op voorraad', 'BAMI'),

-- =====================================================
-- SAUZEN - Bicky
-- =====================================================
('812', 'BICKY DRESSING TUBE 900ML', 7.39, 1, 'stuk', '900ML', 'Op voorraad', 'SAUZEN'),
('815', 'BICKY HOT SAUS TUBE 840ML', 5.79, 1, 'stuk', '840ML', 'Op voorraad', 'SAUZEN'),
('818', 'BICKY KETCHUP TUBE 900ML', 6.79, 1, 'stuk', '900ML', 'Op voorraad', 'SAUZEN'),
('49505', 'BICKY TOSCAANSE SAUS TUBE 840ML', 8.39, 1, 'stuk', '840ML', 'Op voorraad', 'SAUZEN'),

-- =====================================================
-- SAUZEN - Andalouse & Cocktail
-- =====================================================
('16612', 'ANDALOUSE 2L DL', 18.16, 1, 'stuk', '2000ML', 'Beperkte voorraad', 'SAUZEN'),
('56446', 'ANDALOUSESAUS 2,9KG PET ANDA', 18.11, 1, 'stuk', '2900G', 'Beperkte voorraad', 'SAUZEN'),
('10479', 'ANDALOUSESAUS 5L BOX ANDA', 29.27, 1, 'stuk', '5000ML', 'Beperkte voorraad', 'SAUZEN'),
('12434', 'COCKTAILSAUS 2L DL', 18.10, 1, 'stuk', '2000ML', 'Beperkte voorraad', 'SAUZEN'),
('56445', 'COCKTAILSAUS 2,9KG PET ANDA', 16.80, 1, 'stuk', '2900G', 'Beperkte voorraad', 'SAUZEN'),
('24744', 'COCKTAILSAUS 3L PET PAUWELS', 13.75, 1, 'stuk', '3000ML', 'Op voorraad', 'SAUZEN'),
('1390', 'COCKTAILSAUS 3L PET VANDEMOORTELE', 15.70, 1, 'stuk', '3000ML', 'Op voorraad', 'SAUZEN'),
('55484', 'COCKTAIL HALAL 1L TUBE ANDA', 6.56, 1, 'stuk', '1000ML', 'Op voorraad', 'SAUZEN'),

-- =====================================================
-- SAUZEN - Samurai & Pikant
-- =====================================================
('50554', 'SAMURAI 2L PET DL', 17.93, 1, 'stuk', '2000ML', 'Beperkte voorraad', 'SAUZEN'),
('56451', 'SAMURAI 2,9KG PET ANDA', 17.03, 1, 'stuk', '2900G', 'Beperkte voorraad', 'SAUZEN'),
('10480', 'SAMURAI 5L BOX ANDA', 27.19, 1, 'stuk', '5000ML', 'Beperkte voorraad', 'SAUZEN'),

-- =====================================================
-- SAUZEN - Curry & Ketchup
-- =====================================================
('1531', 'CURRYSAUS 3L PET VANDEMOORTELE', 15.94, 1, 'stuk', '3000ML', 'Op voorraad', 'SAUZEN'),
('5480', 'GARDE D''OR CURRYSAUS 1L KNORR PROF', 7.51, 1, 'stuk', '1000ML', 'Op voorraad', 'SAUZEN'),
('1662', 'CURRY KETCHUP TUBE 800ML HELA', 3.69, 1, 'stuk', '800ML', 'Op voorraad', 'SAUZEN'),
('1665', 'CURRY KETCHUP TUBE 800ML ZEISNER', 4.79, 1, 'stuk', '800ML', 'Op voorraad', 'SAUZEN'),
('15453', 'CURRY KETCHUP 2X5KG BIB ZEISNER', 37.89, 2, 'stuk', '5000G', 'Op voorraad', 'SAUZEN'),
('15452', 'TOMATENKETCHUP 2X5KG BIB ZEISNER', 37.88, 2, 'stuk', '5000G', 'Op voorraad', 'SAUZEN'),

-- =====================================================
-- SAUZEN - Frietsaus & Mayo
-- =====================================================
('1339', 'FRIETSAUS 10L PAUWELS', 19.03, 1, 'stuk', '10000ML', 'Beperkte voorraad', 'SAUZEN'),
('12352', 'FRIETSAUS 25% 10L OLIEHOORN', 21.37, 1, 'stuk', '10000ML', 'Beperkte voorraad', 'SAUZEN'),
('12353', 'FRIETSAUS 35% 10L OLIEHOORN', 25.21, 1, 'stuk', '10000ML', 'Op voorraad', 'SAUZEN'),
('1328', 'MAYO DRESSING 50% 10L VAN ZON', 21.86, 1, 'stuk', '10000ML', 'Op voorraad', 'SAUZEN'),
('33001', 'MAYONAISE PAUWELS 10L', 32.21, 1, 'stuk', '10000ML', 'Op voorraad', 'SAUZEN'),

-- =====================================================
-- SAUZEN - Look & Pitta
-- =====================================================
('24750', 'LOOKSAUS 3L PET PAUWELS', 14.79, 1, 'stuk', '3000ML', 'Beperkte voorraad', 'SAUZEN'),
('34404', 'LOOKSAUS PITTA 3L PET MANNA', 19.72, 1, 'stuk', '3000ML', 'Beperkte voorraad', 'SAUZEN'),

-- =====================================================
-- SAUZEN - Barbecue
-- =====================================================
('54888', 'BARBECUE SAUS 1L TUBE ANDA', 6.29, 1, 'stuk', '1000ML', 'Beperkte voorraad', 'SAUZEN'),
('35070', 'BARBECUE SAUS 3L PET MANNA', 18.60, 1, 'stuk', '3000ML', 'Beperkte voorraad', 'SAUZEN'),
('60362', 'SMOKEY BARBECUE SAUS 1L TUBE ANDA', 6.42, 1, 'stuk', '1000ML', 'Beperkte voorraad', 'SAUZEN'),

-- =====================================================
-- SAUZEN - Overige
-- =====================================================
('12431', 'MOSTERD 2L DL', 12.37, 1, 'stuk', '2000ML', 'Op voorraad', 'SAUZEN'),
('12430', 'PICKLES 2L DL', 11.57, 1, 'stuk', '2000ML', 'Op voorraad', 'SAUZEN'),
('21900', 'JOPPIESAUS 850ML TUBE', 5.25, 1, 'stuk', '850ML', 'Op voorraad', 'SAUZEN'),
('23350', 'MEZZO-MIX SAUS 1L TUBE', 8.79, 1, 'stuk', '1000ML', 'Op voorraad', 'SAUZEN'),
('15223', 'MARTINOSAUS 1L TUBE LA WILLIAM', 6.59, 1, 'stuk', '1000ML', 'Beperkte voorraad', 'SAUZEN'),
('65581', 'MARTINOSAUS 1L TUBE PAUWELS', 5.12, 1, 'stuk', '1000ML', 'Op voorraad', 'SAUZEN'),
('57060', 'MAMMOUTH 1L TUBE PAUWELS', 5.39, 1, 'stuk', '1000ML', 'Op voorraad', 'SAUZEN'),
('14205', 'PEPERSAUS 1L TUBE VANDEMOORTELE', 6.48, 1, 'stuk', '1000ML', 'Op voorraad', 'SAUZEN'),
('54890', 'BRAZILSAUS 1L TUBE ANDA', 7.74, 1, 'stuk', '1000ML', 'Op voorraad', 'SAUZEN'),
('6157', 'VLAMMETJES SAUS 1,25KG TOPKING', 6.08, 1, 'stuk', '1250G', 'Beperkte voorraad', 'SAUZEN'),
('56452', 'TARTAAR MAISON 2,9KG PET ANDA', 13.74, 1, 'stuk', '2900G', 'Beperkte voorraad', 'SAUZEN'),
('33114', 'AMERICAIN CHEF 1L TUBE LA WILLIAM', 7.77, 1, 'stuk', '1000ML', 'Op voorraad', 'SAUZEN'),
('39730', 'AMERICAIN CHEF 3L PET LA WILLIAM', 21.34, 1, 'stuk', '3000ML', 'Beperkte voorraad', 'SAUZEN'),
('43636', 'AMERICAIN MAISON (ROUGE) 1L TUBE LA WILLIAM', 6.22, 1, 'stuk', '1000ML', 'Beperkte voorraad', 'SAUZEN'),
('69025', 'EF HERO DRESSING HONING MOSTERD 1L', 10.40, 1, 'stuk', '1000ML', 'Op voorraad', 'SAUZEN'),
('1330', 'DRESSING ZUUR LOUISIANA BLAUW 10L VANDEMOORTELE', 32.77, 1, 'stuk', '10000ML', 'Op voorraad', 'SAUZEN'),
('70574', 'CHEDDAR CHEESE SAUCE 950G TUBE LA FOODS', 12.25, 1, 'stuk', '950G', 'Beperkte voorraad', 'SAUZEN'),
('71104', 'BALLYMALOE HAMBURGERSAUS 960ML TUBE LA FOODS', 10.22, 1, 'stuk', '960ML', 'Beperkte voorraad', 'SAUZEN'),
('68561', 'SMOKY MOUNTAINS AMERICAN MOSTERD 550G LA FOODS', 5.39, 1, 'stuk', '550G', 'Beperkte voorraad', 'SAUZEN'),
('68711', 'SMOKY MOUNTAINS HEMP SAUCE 775ML LA FOODS', 5.71, 1, 'stuk', '775ML', 'Op voorraad', 'SAUZEN'),

-- =====================================================
-- BROOD - Hamburgerbroodjes
-- =====================================================
('1231', 'BICKY HAMBURGERBROODJE SESAM 96ST', 42.80, 96, 'stuk', NULL, 'Beperkte voorraad', 'BROOD'),
('65308', 'BICKY HAMBURGERBROODJE BIG BUN SES. 3X15X74G MICRO', 18.99, 45, 'stuk', '74G', 'Op voorraad', 'BROOD'),
('62951', 'PAST. 227148 HAMBURGERBROODJE WHOPPER SESAM 24X82G', 11.49, 24, 'stuk', '82G', 'Beperkte voorraad', 'BROOD'),
('77925', 'PAST. 227154 HAMBURGERBROODJE BIG BUN SESAM 30X83G', 9.59, 30, 'stuk', '83G', 'Op voorraad', 'BROOD'),
('74584', 'PAST. 223360 HAMBURGERBROODJE BLACK PEPPER 24X90G', 24.04, 24, 'stuk', '90G', 'Beperkte voorraad', 'BROOD'),

-- =====================================================
-- BROOD - Stokbrood & Baguette
-- =====================================================
('73862', 'PAST. 223282 HALF STOKBROOD PLUS WIT 27CM 40X165G', 21.09, 40, 'stuk', '165G', 'Op voorraad', 'BROOD'),
('74887', 'PAST. 223283 HALF STOKBROOD PLUS BBL 27CM 40X165G', 22.08, 40, 'stuk', '165G', 'Op voorraad', 'BROOD'),
('76244', 'PAST. 223369 PLUS FITNESS BAGUETTE 26CM 45X160G', 27.42, 45, 'stuk', '160G', 'Beperkte voorraad', 'BROOD'),

-- =====================================================
-- BROOD - Bollen & Overige
-- =====================================================
('32396', 'PAST. 1265 MAXIBOL 4X11X100G', 27.45, 44, 'stuk', '100G', 'Op voorraad', 'BROOD'),
('1207', 'B137 ITALIAANSE BOL 36X150G 5,4KG B''DOR', 29.01, 36, 'stuk', '150G', 'Beperkte voorraad', 'BROOD'),
('71633', 'BIO TURKS BROOD PIDE 500G PUR PAIN', 3.93, 1, 'stuk', '500G', 'Beperkte voorraad', 'BROOD'),

-- =====================================================
-- BROOD - Pizza
-- =====================================================
('21946', 'PAST. 1690 PIZZABODEM TOMATENSAUS D26CM 16X245G', 29.17, 16, 'stuk', '245G', 'Beperkte voorraad', 'BROOD'),
('79333', 'PIZZASI PIZZABODEM ONGETOMATEERD 33CM 4X250G', 8.05, 4, 'stuk', '250G', 'Op voorraad', 'BROOD'),

-- =====================================================
-- KAAS
-- =====================================================
('52060', 'QALITA KAASSNEETJES GOUDA 10X10CM 50ST 1KG', 6.59, 50, 'stuk', '20G', 'Op voorraad', 'KAAS'),
('52062', 'QALITA KAASSNEETJES GOUDA 10X25CM 1KG', 6.68, 1, 'kg', NULL, 'Op voorraad', 'KAAS'),
('52061', 'QALITA KAASSNEETJES GOUDA 5X15CM 50ST 1KG', 6.79, 50, 'stuk', '20G', 'Op voorraad', 'KAAS'),
('76727', 'KAASSCHIJVEN CHEDDAR CHEESE 84ST 1,033KG', 12.84, 84, 'stuk', '12G', 'Op voorraad', 'KAAS'),
('49007', 'KAASSCHIJVEN CHEDDAR HAPPY SLICES 900G', 9.39, 1, 'stuk', '900G', 'Op voorraad', 'KAAS'),
('54384', 'PIZZAMIX KAAS JULIENNE 2KG', 10.92, 1, 'kg', '2000G', 'Op voorraad', 'KAAS'),
('54573', 'MOZZARELLA GERASPT PIZZAIOLO 1KG', 5.59, 1, 'kg', '1000G', 'Op voorraad', 'KAAS'),
('61333', 'MEXICAANSE KAASMIX 2KG LA FOODS', 18.37, 1, 'kg', '2000G', 'Beperkte voorraad', 'KAAS'),
('61335', 'REAL IRISH CHEDDAR 500G LA FOODS', 7.91, 1, 'stuk', '500G', 'Beperkte voorraad', 'KAAS'),
('67090', 'BRIE NEUTRE 60% 1KG', 11.58, 1, 'kg', '1000G', 'Beperkte voorraad', 'KAAS'),

-- =====================================================
-- GROENTEN & TOPPINGS
-- =====================================================
('51025', 'AJUIN GEROOSTERD 500G VAN ZON', 2.99, 1, 'stuk', '500G', 'Op voorraad', 'GROENTEN'),
('10504', 'BICKY AJUIN GEROOSTERD 500G BECKERS', 4.59, 1, 'stuk', '500G', 'Op voorraad', 'GROENTEN'),
('49015', 'AJUINBLOKJES 6X6MM VERS 1KG ROUSSEL', 2.53, 1, 'kg', '1000G', 'Beperkte voorraad', 'GROENTEN'),
('13977', 'AJUINSCHIJVEN VOORGEBAKKEN 2,5KG DV ARDO', 8.20, 1, 'kg', '2500G', 'Op voorraad', 'GROENTEN'),
('6658', 'AJUINRINGEN GEPANEERD 1KG BUITENHUIS', 8.43, 1, 'kg', '1000G', 'Op voorraad', 'GROENTEN'),
('53448', 'AJUINRINGEN BATTERED 1KG DV FARM', 7.78, 1, 'kg', '1000G', 'Op voorraad', 'GROENTEN'),
('1693', 'AJUINTJES ZOET-ZUUR 700G KROON', 2.61, 1, 'stuk', '700G', 'Op voorraad', 'GROENTEN'),
('47868', 'AGF AJUIN BONK 10KG', 12.23, 1, 'stuk', '10000G', 'Op voorraad', 'GROENTEN'),
('59403', 'BICKY AUGURK GESN. FIJN 2X2,3KG (KOMKOMMER)', 15.21, 2, 'stuk', '2300G', 'Op voorraad', 'GROENTEN'),
('27033', 'QALITA AUGURKEN DILL CHIPS 2,65L', 5.39, 1, 'stuk', '2650ML', 'Op voorraad', 'GROENTEN'),
('27046', 'QALITA AUGURKEN GESN. FIJN (KOMKOMMER) 2,65L', 6.29, 1, 'stuk', '2650ML', 'Op voorraad', 'GROENTEN'),
('60194', 'SMOKY MOUNTAINS SWEET PICKLE DELUX 2,1KG LA FOODS', 14.97, 1, 'stuk', '2100G', 'Beperkte voorraad', 'GROENTEN'),
('10821', 'BONDUELLE PAPRIKA GEMENGD 2,5KG', 8.31, 1, 'kg', '2500G', 'Op voorraad', 'GROENTEN'),
('75407', 'BONDUELLE SERV. PAPRIKA ROOD/GEEL GEGRILD 1KG', 6.86, 1, 'kg', '1000G', 'Beperkte voorraad', 'GROENTEN'),
('5201', 'PEPERS GROEN 1,5KG DE NOTEKRAKER', 13.99, 1, 'stuk', '1500G', 'Beperkte voorraad', 'GROENTEN'),
('29543', 'AGF IJSBERGSLA 500G', 1.99, 1, 'stuk', '500G', 'Op voorraad', 'GROENTEN'),
('29542', 'AGF HORECA SLAMIX ZAK ALLGRO 500G', 2.85, 1, 'stuk', '500G', 'Op voorraad', 'GROENTEN'),
('3988', 'AGF KROPSLA PP/ST', 1.88, 1, 'stuk', NULL, 'Op voorraad', 'GROENTEN'),
('3974', 'AGF KOMKOMMER PP/ST', 2.08, 1, 'stuk', NULL, 'Op voorraad', 'GROENTEN'),
('80372', 'AGF TOMATEN +60 SCHAAL 6ST', 4.77, 6, 'stuk', NULL, 'Op voorraad', 'GROENTEN'),
('29262', 'AGF WORTELEN GERASPT 1KG', 1.90, 1, 'kg', '1000G', 'Op voorraad', 'GROENTEN'),

-- =====================================================
-- FRIET & AARDAPPELEN
-- =====================================================
('81228', 'FRIET VERS 10MM 10KG', 10.50, 1, 'stuk', '10000G', 'Op voorraad', 'FRIET'),
('81229', 'FRIET VERS 11MM 5KG', 5.56, 1, 'stuk', '5000G', 'Op voorraad', 'FRIET'),
('14345', 'AARDAPPELKROKETTEN DV 2,5KG LUTOSA', 5.43, 1, 'kg', '2500G', 'Op voorraad', 'FRIET'),

-- =====================================================
-- VET & OLIE
-- =====================================================
('9', 'VET RISSO FRI ROOD 4X2,5KG', 26.99, 4, 'stuk', '2500G', 'Op voorraad', 'VET'),
('3', 'VET RISSO PALM 4X2,5KG', 28.16, 4, 'stuk', '2500G', 'Op voorraad', 'VET'),
('76216', 'QALITA FRITUUROLIE 10L', 19.59, 1, 'stuk', '10000ML', 'Op voorraad', 'VET'),

-- =====================================================
-- EIEREN
-- =====================================================
('9071', 'EIEREN VERS 30ST', 7.21, 30, 'stuk', NULL, 'Op voorraad', 'EIEREN'),
('9126', 'EIEREN GEKOOKT GEPELD EMMERTJE 75ST', 17.74, 75, 'stuk', NULL, 'Op voorraad', 'EIEREN'),
('67250', 'EIEREN GEKOOKT GEPELD EMMER 150ST', 35.20, 150, 'stuk', NULL, 'Niet op voorraad', 'EIEREN'),
('80147', 'EIEREN M GEKOOKT GEPELD EMMERTJE 73ST', 18.60, 73, 'stuk', NULL, 'Op voorraad', 'EIEREN'),

-- =====================================================
-- SALADES
-- =====================================================
('7381', 'HAMAL AARDAPPELSALADE 1KG', 5.29, 1, 'kg', '1000G', 'Op voorraad', 'SALADES'),
('1570', 'VAN ZON AARDAPPELSALADE 1KG', 5.90, 1, 'kg', '1000G', 'Op voorraad', 'SALADES'),
('7429', 'HAMAL KIP ANDALOUSE SALADE 1KG', 12.64, 1, 'kg', '1000G', 'Beperkte voorraad', 'SALADES'),
('7435', 'HAMAL KIP CURRY SALADE 1KG', 12.69, 1, 'kg', '1000G', 'Op voorraad', 'SALADES'),
('7863', 'VAN ZON KIP CURRY SALADE 1KG', 10.77, 1, 'kg', '1000G', 'Beperkte voorraad', 'SALADES'),
('9449', 'HAMAL TONIJN COCKTAILSALADE 1KG', 15.01, 1, 'kg', '1000G', 'Beperkte voorraad', 'SALADES'),
('73341', 'TONIJNSALADE 1KG MAURICE MATHIEU', 14.93, 1, 'kg', '1000G', 'Beperkte voorraad', 'SALADES'),
('7537', 'HAMAL ZALMSALADE 1KG', 15.49, 1, 'kg', '1000G', 'Beperkte voorraad', 'SALADES'),
('8436', 'VAN ZON ATLANTISCHE ZALMSALADE 1KG', 13.09, 1, 'kg', '1000G', 'Beperkte voorraad', 'SALADES'),
('11837', 'HAMAL SURIMI SALADE MET KRAB 1KG', 14.70, 1, 'kg', '1000G', 'Beperkte voorraad', 'SALADES'),
('59334', 'HAMAL EIERSALADE MET SPEK 1KG', 16.71, 1, 'kg', '1000G', 'Beperkte voorraad', 'SALADES'),
('12774', 'KAAS-HAMROLLETJES 4ST TRAITEUR', 10.27, 4, 'stuk', NULL, 'Beperkte voorraad', 'SALADES'),

-- =====================================================
-- VIS & SCAMPI
-- =====================================================
('57891', 'SCAMPI VANNAMEI GEPELD FC 26/30 FISKER OR 1KG DV', 11.39, 1, 'kg', '1000G', 'Op voorraad', 'VIS'),
('77487', 'SCAMPIBROCHETTE 10X75G DV', 10.73, 10, 'stuk', '75G', 'Op voorraad', 'VIS'),
('1798', 'GEROOKTE ZALM ZIJDE DV NOORSE P/KG PREMIUM QUALITY', 26.00, 1, 'kg', NULL, 'Beperkte voorraad', 'VIS'),
('35570', 'TONIJN NATUREL 400G IMPERIAL', 4.66, 1, 'stuk', '400G', 'Op voorraad', 'VIS'),
('45850', 'TONIJN NATUREL 6X185G IMPERIAL', 13.20, 6, 'stuk', '185G', 'Op voorraad', 'VIS'),
('66694', 'MOSSELEN IN AZIJN POTJES 6X110G 210ML GLAS', 16.31, 6, 'stuk', '110G', 'Op voorraad', 'VIS'),

-- =====================================================
-- DRANKEN - Frisdrank
-- =====================================================
('25848', 'COCA COLA 30X33CL SLEEK BLIK', 24.65, 30, 'stuk', '33CL', 'Op voorraad', 'DRANKEN'),
('20102', 'COCA COLA KLEIN 24X15CL BLIK', 17.39, 24, 'stuk', '15CL', 'Op voorraad', 'DRANKEN'),
('47224', 'COCA COLA ZERO 30X33CL SLEEK BLIK', 23.35, 30, 'stuk', '33CL', 'Op voorraad', 'DRANKEN'),
('2641', 'FANTA 24X33CL SLEEK BLIK', 19.99, 24, 'stuk', '33CL', 'Op voorraad', 'DRANKEN'),
('2678', 'SPRITE 24X33CL SLEEK BLIK', 19.95, 24, 'stuk', '33CL', 'Op voorraad', 'DRANKEN'),
('2648', 'ICE TEA LIPTON REGULAR 24X33CL BLIK', 14.49, 24, 'stuk', '33CL', 'Op voorraad', 'DRANKEN'),

-- =====================================================
-- DRANKEN - Water
-- =====================================================
('2669', 'SPA REINE 24X50CL PET', 15.01, 24, 'stuk', '50CL', 'Op voorraad', 'DRANKEN'),
('5675', 'SPA BRUIS 24X50CL PET', 16.59, 24, 'stuk', '50CL', 'Beperkte voorraad', 'DRANKEN'),
('16689', 'CHAUDFONTAINE 24X50CL PET', 15.99, 24, 'stuk', '50CL', 'Op voorraad', 'DRANKEN'),
('16697', 'CHAUDFONTAINE BRUIS 24X50CL PET', 17.92, 24, 'stuk', '50CL', 'Op voorraad', 'DRANKEN'),

-- =====================================================
-- DRANKEN - Energy & Bier
-- =====================================================
('1277', 'RED BULL 24X25CL BLIK', 30.69, 24, 'stuk', '25CL', 'Op voorraad', 'DRANKEN'),
('31985', 'MONSTER ENERGY 24X50CL BLIK', 37.92, 24, 'stuk', '50CL', 'Beperkte voorraad', 'DRANKEN'),
('3062', 'JUPILER COLD GRIP 24X33CL BLIK', 22.09, 24, 'stuk', '33CL', 'Op voorraad', 'DRANKEN'),

-- =====================================================
-- DRANKEN - Sapjes
-- =====================================================
('25718', 'CAPRI-SUN MULTIVITAMIN 10X20CL', 6.17, 10, 'stuk', '20CL', 'Op voorraad', 'DRANKEN'),
('23057', 'CAPRI-SUN SINAASAPPELSAP 10X20CL', 6.17, 10, 'stuk', '20CL', 'Op voorraad', 'DRANKEN'),

-- =====================================================
-- VERPAKKING - Bakjes
-- =====================================================
('3393', 'A2 PLASTIEK BAKJES 8,3X8,3X3,6CM 135CC 2X500ST', 27.94, 1000, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('3387', 'A16 PLASTIEK BAKJES BREED 21,5X6,8X3,5CM 1000ST', 39.96, 1000, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('3390', 'A16L PLASTIEK BAKJES LANG 6,5X24X2,8CM 1000ST', 50.82, 1000, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('3405', 'A8 WIT PLASTIEK BAKJES 8X28,5X3,7CM 1000ST', 68.77, 1000, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('17919', 'A8 ZWART PLASTIEK BAKJE 30X10CM 500ST DUPLAST', 68.33, 500, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('31219', 'DEPA A16S FRIK BAKJE WIT 190CC 208X55X32MM 250ST', 4.66, 250, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('31828', 'DEPA A5 BAKJE WIT 200CC 142X68X34MM 250ST', 3.98, 250, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('3363', 'DEPA A13 BAKJE WIT 430CC 162X110X35MM 250ST', 8.53, 250, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('3364', 'DEPA A14 BAKJE WIT 460CC 190X121X36MM 250ST', 10.23, 250, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('3374', 'DEPA A21 BAKJE WIT 750CC 205X120X36MM 250ST', 12.93, 250, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('32008', 'DEPA A9 BAKJE ZWART 325CC 145X95X36MM 250ST', 5.63, 250, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),

-- =====================================================
-- VERPAKKING - Aluminium
-- =====================================================
('66753', 'BAK MAALTIJD ALU RECHTH 450CC 100ST (R1-28L)', 9.17, 100, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('66754', 'DEKSEL KARTON/ALU VR BAK ALU 450CC 100ST (66753)', 3.81, 100, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('66819', 'BAK MAALTIJD ALU RECHTH 250CC 100ST (R0-15L)', 6.85, 100, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('76817', 'DEKSEL KARTON/ALU VR BAK ALU 250CC 100ST (66819)', 3.31, 100, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('66821', 'BAK MAALTIJD ALU RECHTH 1500CC 100ST (R1-16L)', 29.94, 100, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('66825', 'ALUMINIUM OVALE SCHOTEL 35CM 10ST (VS-3D)', 5.12, 10, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('66756', 'DEKSEL KARTON/ALU VR BAK ALU 850CC 100ST (66755)', 5.63, 100, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),

-- =====================================================
-- VERPAKKING - Hamburgerboxen
-- =====================================================
('26554', 'ISIMO HAMB.BOX 1453 MP10 WIT 135X125X74MM 100ST', 6.52, 100, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('3356', 'ISIMO HAMB.BOX 1659 HP6 CHAMP 145X135X80MM 125ST', 11.11, 125, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('3354', 'ISIMO HAMB.BOX R/H 1673 IP8 WIT 125X215X65 125ST', 12.93, 125, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),

-- =====================================================
-- VERPAKKING - Karton & Papier
-- =====================================================
('6729', 'OVAAL KARTON SCHAAL P16 10,5X17,5X3CM 250ST', 10.33, 250, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('35001', 'OVAAL TRIPLEX SCHAAL P18/5 14X22X3 250ST', 14.65, 250, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('34342', 'FRIET/STOKBROODBAK KARTON 29X10CM 50ST', 9.43, 50, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('62492', 'RAVIER 93 BAKJE KARTON BRUIN 15X9X5CM 250ST', 12.31, 250, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('7385', 'W4 VETVRIJ KART. BAKJES 100ST 16,5X10,5X6CM', 15.14, 100, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('5092', 'W5 VETVRIJ KART. BAKJES 100ST 19X12X6,5CM', 17.94, 100, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('81136', 'KIDSBOX MENUDOOSJES 204X110X120MM 48ST', 16.14, 48, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),

-- =====================================================
-- VERPAKKING - Cups & Potjes
-- =====================================================
('44041', 'CUPS ROND TRANSPARANT 80ML 50ST DUPLAST', 1.10, 50, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('44043', 'DEKSEL ROND POTJE TRANSPARANT 50ST (50,80,100CC)', 0.89, 50, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('72972', 'DEKSEL PET VR DRESSING CUP KRAFT 75/100ML 50ST', 2.70, 50, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('16778', 'MICROSCHAAL RH 1000CC 50ST', 5.09, 50, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('16782', 'DEKSEL MICROSCHAAL RH 50ST', 2.99, 50, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),

-- =====================================================
-- VERPAKKING - Zakken
-- =====================================================
('64245', 'PAPIEREN DRAAGZAK BRUIN 26X17X26CM 250ST', 20.90, 250, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('64246', 'PAPIEREN DRAAGZAK BRUIN 32X17X25CM 250ST', 23.77, 250, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('21149', '2P INPAKZAK WIT (1 POND) 13,5X27CM 10KG', 31.48, 1, 'stuk', '10000G', 'Beperkte voorraad', 'VERPAKKING'),
('3558', 'BEDRUKT SPECIALZAKJES VZ 10X34 2400ST', 31.75, 2400, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('6025', 'BEDRUKT SP47 GROTE STOKBROOD ZAK VZ 14X49CM 10KG', 32.00, 1, 'stuk', '10000G', 'Beperkte voorraad', 'VERPAKKING'),
('3559', 'SP44 1/2 STOKBROOD INPAKZAKKEN VZ 14X41 BEDR. 10KG', 31.75, 1, 'stuk', '10000G', 'Beperkte voorraad', 'VERPAKKING'),
('3560', 'STOKBROODZAK HALF VZ 40X12,5CM 1000ST', 31.75, 1000, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),

-- =====================================================
-- VERPAKKING - Inpakpapier
-- =====================================================
('52314', 'INPAKPAPIER FOODPACK 50/60 10KG', 16.36, 1, 'stuk', '10000G', 'Beperkte voorraad', 'VERPAKKING'),
('32404', 'INPAKPAPIER FOODPACK 20/20 10KG', 16.36, 1, 'stuk', '10000G', 'Beperkte voorraad', 'VERPAKKING'),
('32402', 'INPAKPAPIER FOODPACK 40/50 10KG', 16.36, 1, 'stuk', '10000G', 'Beperkte voorraad', 'VERPAKKING'),
('32403', 'INPAKPAPIER FOODPACK 60/80 10KG', 16.36, 1, 'stuk', '10000G', 'Beperkte voorraad', 'VERPAKKING'),
('2778', 'DUPLEX PAPIER 40X50CM 15KG ROOD/WIT', 41.88, 1, 'stuk', '15000G', 'Beperkte voorraad', 'VERPAKKING'),

-- =====================================================
-- VERPAKKING - Servetten & Onderleggers
-- =====================================================
('17564', 'SERV. 2 LAAGS 25X25CM WIT 200ST GAUTIER', 3.13, 200, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('12975', 'SERV. 2-LAAGS WIT 33X33CM 1/4 125ST DUNI', 2.55, 125, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('36846', 'SACCHETTO ZWART + SERV. 2-LAAGS WIT 100ST DUNI', 12.75, 100, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('25763', 'ONDERLEGGER 30X39CM FOND BRUIN 500ST GAUTIER', 25.63, 500, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('34384', 'ONDERLEGGER UNI ZWART 30X40CM 250ST DUNI', 13.40, 250, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),

-- =====================================================
-- VERPAKKING - Folie & Vacuum
-- =====================================================
('7804', 'VERSHOUDFOLIE 30CM 3X300M WRAPMASTER', 40.11, 3, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),
('60079', 'VACUUMZAKKEN RELIEF 200X300MM 100ST HENDI', 14.96, 100, 'stuk', NULL, 'Beperkte voorraad', 'VERPAKKING'),

-- =====================================================
-- VERPAKKING - Overige
-- =====================================================
('72687', 'FRIETVORKJES HOUT 8,5CM 1000ST', 6.68, 1000, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('21731', 'SATE STOKJES 30CM 100ST', 1.14, 100, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('30575', 'SATEPRIKKER BAMBOE SKEWER 15CM 250ST', 5.78, 250, 'stuk', NULL, 'Op voorraad', 'VERPAKKING'),
('5064', 'ELASTIEKJES 1KG NR.18', 10.16, 1, 'kg', '1000G', 'Op voorraad', 'VERPAKKING'),

-- =====================================================
-- KEUKENMATERIAAL
-- =====================================================
('30216', 'DIENBLAD ZWART R/H 31X43,5CM 1ST HENDI', 3.47, 1, 'stuk', NULL, 'Op voorraad', 'KEUKEN'),
('34665', 'BESTEKBAK GASTRO 1/1 4 VAK GRIJS', 7.70, 1, 'stuk', NULL, 'Op voorraad', 'KEUKEN'),
('20685', 'BESTEKBAK 6 VAKS GRIJS 51X29X13CM HENDI', 7.12, 1, 'stuk', NULL, 'Beperkte voorraad', 'KEUKEN'),
('35538', 'FRIETSCHEP ROND 26CM KUNSTSTOF GREEP HENDI', 25.60, 1, 'stuk', NULL, 'Beperkte voorraad', 'KEUKEN'),
('36349', 'FRIETSCHEP VIERKANT RVS 16X20CM HENDI', 22.32, 1, 'stuk', NULL, 'Beperkte voorraad', 'KEUKEN'),
('4962', 'FRIKANDELLENSNIJDER RVS 20CM HENDI', 8.50, 1, 'stuk', NULL, 'Beperkte voorraad', 'KEUKEN'),
('20684', 'FRITUURVERGIET (TRICHE) INOX 40CM HENDI', 37.00, 1, 'stuk', NULL, 'Beperkte voorraad', 'KEUKEN'),
('5154', 'BOLZEEF FIJN GAAS RVS 150MM HENDI', 7.55, 1, 'stuk', NULL, 'Op voorraad', 'KEUKEN'),
('43227', 'BAKSPAAN RVS 303MM', 11.35, 1, 'stuk', NULL, 'Beperkte voorraad', 'KEUKEN'),
('4870', 'EIERSNIJDER RECHTHOEKIG ALUMINIUM 130X85MM HENDI', 9.02, 1, 'stuk', NULL, 'Beperkte voorraad', 'KEUKEN'),
('71451', 'SCHILMES ROESTVRIJ', 8.57, 1, 'stuk', NULL, 'Op voorraad', 'KEUKEN'),
('14597', 'SNIJPLANK HACCP +GEUL GN 1/2 26,5X35,5CM ROOD HDPE', 9.26, 1, 'stuk', NULL, 'Op voorraad', 'KEUKEN'),
('14598', 'SNIJPLANK HACCP+GEUL GN 1/2 26,5X35,5CM BLAUW HDPE', 9.26, 1, 'stuk', NULL, 'Beperkte voorraad', 'KEUKEN'),
('14599', 'SNIJPLANK HACCP+GEUL GN 1/2 26,5X35,5CM GROEN HDPE', 9.26, 1, 'stuk', NULL, 'Op voorraad', 'KEUKEN'),
('23201', 'BONNENHOUDER ALUMINIUM 60CM HENDI', 13.06, 1, 'stuk', NULL, 'Op voorraad', 'KEUKEN'),
('24307', 'RECEPTIEBEL VERCHROOMD HENDI', 6.17, 1, 'stuk', NULL, 'Beperkte voorraad', 'KEUKEN'),
('31170', 'SERVETTENHOUDER DRAADIJZER 19X19X6,5CM HENDI', 7.55, 1, 'stuk', NULL, 'Beperkte voorraad', 'KEUKEN'),
('1689', 'ASBAK MET ONDERBAK RVS 140MM HENDI', 4.13, 1, 'stuk', NULL, 'Op voorraad', 'KEUKEN'),
('29056', 'THERMO-BOX 600X400XH285 1/1 GRIJS+ZW DEKSEL HENDI', 35.39, 1, 'stuk', NULL, 'Op voorraad', 'KEUKEN'),
('15805', 'VITRINESCHAAL WIT PLASTIEK 25X16CM VAN ZON', 3.26, 1, 'stuk', NULL, 'Op voorraad', 'KEUKEN'),
('24815', 'VITRINESCHAAL ZWART 24X18X1,7CM', 10.79, 1, 'stuk', NULL, 'Op voorraad', 'KEUKEN'),
('36453', 'ZOUTMOLEN ITALIA 17,5CM ACRYL', 16.77, 1, 'stuk', NULL, 'Beperkte voorraad', 'KEUKEN'),
('2521', 'ZOUTSTROOIER ALUMINIUM HENDI', 8.31, 1, 'stuk', NULL, 'Beperkte voorraad', 'KEUKEN'),
('13691', 'POMP VOOR JOPPIESAUS', 66.63, 1, 'stuk', NULL, 'Beperkte voorraad', 'KEUKEN'),
('9306', 'SAUZENREKJE BICKY VOOR 3X1L TUBES', 25.25, 1, 'stuk', NULL, 'Beperkte voorraad', 'KEUKEN'),

-- =====================================================
-- BESTEK
-- =====================================================
('50220', 'AUSTIN DESSERTVORKEN 12ST AMEFA', 15.38, 12, 'stuk', NULL, 'Beperkte voorraad', 'KEUKEN'),
('50224', 'AUSTIN TAFELMESSEN 12ST AMEFA', 29.28, 12, 'stuk', NULL, 'Op voorraad', 'KEUKEN'),

-- =====================================================
-- SCHOONMAAK
-- =====================================================
('46276', 'DREFT AFWAS 5L PROF.', 26.23, 1, 'stuk', '5000ML', 'Op voorraad', 'SCHOONMAAK'),
('82521', 'DREFT PROF. REGULAR HANDAFWAS 1,05L', 5.49, 1, 'stuk', '1050ML', 'Op voorraad', 'SCHOONMAAK'),
('31836', 'RIEM SUPERONTVETTER 400ML', 5.77, 1, 'stuk', '400ML', 'Op voorraad', 'SCHOONMAAK'),
('143', 'POETSROL MAXITORK 1L 6X350M (22CM) VAN ZON (66931)', 31.51, 6, 'stuk', NULL, 'Op voorraad', 'SCHOONMAAK'),
('146', 'POETSROL MINITORK 1L 12X125M (20,5CM) ECO VAN ZON', 27.68, 12, 'stuk', NULL, 'Beperkte voorraad', 'SCHOONMAAK'),
('46890', 'DWEIL WASSET ORANJE 60X70CM 200G 1ST', 1.28, 1, 'stuk', NULL, 'Op voorraad', 'SCHOONMAAK'),

-- =====================================================
-- VEILIGHEID & EHBO
-- =====================================================
('60656', 'BRANDDEKEN 100X100CM', 23.11, 1, 'stuk', NULL, 'Beperkte voorraad', 'VEILIGHEID'),
('55665', 'DETECTAPLAST MEDIC BOX FOOD BASIC', 25.39, 1, 'stuk', NULL, 'Beperkte voorraad', 'VEILIGHEID'),
('30514', 'DETECTAPLAST PLEISTER ELASTISCH 25X72MM 100ST', 10.26, 100, 'stuk', NULL, 'Op voorraad', 'VEILIGHEID'),
('60651', 'LABELFRESH STICKER PRO ''ZONDAG'' 500ST', 9.78, 500, 'stuk', NULL, 'Beperkte voorraad', 'VEILIGHEID'),

-- =====================================================
-- OVERIGE VOEDING
-- =====================================================
('15161', 'ANANAS 4 SCHIJVEN 1/4L DIADEM', 1.09, 1, 'stuk', NULL, 'Op voorraad', 'OVERIG'),
('1702', 'ZUURKOOL 1L KRAMER', 1.99, 1, 'stuk', '1000ML', 'Op voorraad', 'OVERIG'),
('67631', 'ZUURKOOL IN WITTE WIJN 810G SAVICO', 3.58, 1, 'stuk', '810G', 'Op voorraad', 'OVERIG'),
('20460', 'TZATZIKI GRIEKS (VERSE KAAS) 1KG OLYMPOS', 10.55, 1, 'kg', '1000G', 'Beperkte voorraad', 'OVERIG'),
('73168', 'SLAGROOM GESUIKERD SPUITBUS 700ML DEBIC', 6.78, 1, 'stuk', '700ML', 'Op voorraad', 'OVERIG'),
('9039', 'CHOCOPASTA ''T BOERINNEKE 1KG', 6.64, 1, 'kg', '1000G', 'Op voorraad', 'OVERIG'),
('20408', 'BLOEMSUIKER 250G TIENEN', 0.96, 1, 'stuk', '250G', 'Op voorraad', 'OVERIG'),
('66940', 'ZOUT PORTIES 750X1G VAN OORDT', 8.83, 750, 'stuk', '1G', 'Beperkte voorraad', 'OVERIG'),
('66637', 'QALITA WALNOTEN 1/4 1,15KG', 17.80, 1, 'stuk', '1150G', 'Beperkte voorraad', 'OVERIG'),
('2182', 'VIDEE KOEKJES PATISSIER 6,5CM 6ST', 2.49, 6, 'stuk', NULL, 'Op voorraad', 'OVERIG'),
('29371', 'ROMBOUTS KOFFIE BONEN ESPRESSO ROYAL 1KG', 38.99, 1, 'kg', '1000G', 'Op voorraad', 'OVERIG'),

-- =====================================================
-- KRUIDEN & SPECERIJEN
-- =====================================================
('5595', 'SATEKRUIDEN BELGISCHE MINI 70G VERSTEGEN', 1.78, 1, 'stuk', '70G', 'Op voorraad', 'KRUIDEN'),
('59375', 'SATEKRUIDEN PAPRIKA 500G VZ/CMS', 9.02, 1, 'stuk', '500G', 'Beperkte voorraad', 'KRUIDEN'),
('63663', 'GYROSKRUIDEN 300G PURE VERSTEGEN', 9.12, 1, 'stuk', '300G', 'Beperkte voorraad', 'KRUIDEN'),
('59367', 'HAMBURGER ALL-IN KRUIDEN 500G VZ/CMS', 8.03, 1, 'stuk', '500G', 'Beperkte voorraad', 'KRUIDEN'),
('73605', 'CMS EVLIER SATE KRUIDEN 90G', 3.79, 1, 'stuk', '90G', 'Op voorraad', 'KRUIDEN'),
('52738', 'KIPBOUILLON TABLETTEN 66ST KNORR PROF', 12.03, 66, 'stuk', NULL, 'Op voorraad', 'KRUIDEN'),

-- =====================================================
-- GEBAK & DESSERTS
-- =====================================================
('12726', 'APPELTAART VELUWSE WENER PRESTIGE 1,8KG', 9.65, 1, 'stuk', '1800G', 'Op voorraad', 'GEBAK'),
('51791', 'B826C12 WENER APPELTAART 1,8KG P. DU CHEF', 17.00, 1, 'stuk', '1800G', 'Beperkte voorraad', 'GEBAK'),
('52157', 'BRUSSELSE WAFELS 3X5VAK 24X80G DV', 20.12, 24, 'stuk', '80G', 'Beperkte voorraad', 'GEBAK'),
('79738', 'PANNENKOEKEN PETER ARTISANAAL 34ST 2,6KG DV', 20.08, 34, 'stuk', '76G', 'Beperkte voorraad', 'GEBAK'),
('55255', 'POPPIES MINI FRANGITARTE 120X15G', 16.17, 120, 'stuk', '15G', 'Op voorraad', 'GEBAK'),
('76776', 'AMANDELGEBAK VANILLE IJS 40ST', 30.24, 40, 'stuk', NULL, 'Beperkte voorraad', 'GEBAK'),
('67970', 'DIVERSI 2202 FLEUR DE CAMEMBERT 530G', 8.84, 1, 'stuk', '530G', 'Op voorraad', 'GEBAK'),
('12674', 'MEGA HITMIX 8X9X20G BUITENHUIS', 26.35, 72, 'stuk', '20G', 'Op voorraad', 'GEBAK'),

-- =====================================================
-- SPEELGOED (voor kindermenu)
-- =====================================================
('8002', 'SPEELGOED SUNNY BOX JONGENS 48ST', 32.03, 48, 'stuk', NULL, 'Beperkte voorraad', 'SPEELGOED'),
('43115', 'SPEELGOED SUNNY BOX MEISJES 48ST', 32.03, 48, 'stuk', NULL, 'Beperkte voorraad', 'SPEELGOED');

-- Verify count
-- SELECT COUNT(*) as total_products FROM supplier_products;
-- SELECT category, COUNT(*) as count FROM supplier_products GROUP BY category ORDER BY count DESC;
