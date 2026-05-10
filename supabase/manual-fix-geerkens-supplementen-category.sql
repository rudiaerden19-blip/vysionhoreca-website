-- Eénmalig in SQL Editor (productie): typo categorienaam „Suplementen” → „Supplementen”
-- Tenant-slug kan variëren; pas aan indien nodig na SELECT hieronder.

-- Controle:
-- SELECT id, tenant_slug, name FROM menu_categories
--   WHERE lower(trim(name)) = 'suplementen';

UPDATE menu_categories
SET name = 'Supplementen',
    updated_at = now()
WHERE lower(trim(name)) = 'suplementen'
  AND tenant_slug IN ('geerkensdrankenhandel', 'geerkens-drankenhandel');
