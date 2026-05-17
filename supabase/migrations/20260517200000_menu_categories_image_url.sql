-- Categorie-afbeelding (kassa/webshop); leeg = gedrag als voorheen (fallback op productfoto).
ALTER TABLE menu_categories
  ADD COLUMN IF NOT EXISTS image_url TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN menu_categories.image_url IS
  'Publiceerbare URL (tenant media of extern); leeg betekent: gebruik eerste productfoto in categorie waar van toepassing.';
