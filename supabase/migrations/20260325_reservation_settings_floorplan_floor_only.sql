-- Kassa plattegrond: voorkeur “alleen vloer” per tenant (sync tussen apparaten)
ALTER TABLE reservation_settings
  ADD COLUMN IF NOT EXISTS floorplan_floor_only BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN reservation_settings.floorplan_floor_only IS
  'Kassa reservaties: plattegrond zonder header/toolbar/lijst (alleen vloer)';
