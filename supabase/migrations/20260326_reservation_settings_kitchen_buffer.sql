-- Volledige sync kassa/online: buffer, slot-limieten, keukencapaciteit (enterprise)
-- Idempotent: ADD COLUMN IF NOT EXISTS

ALTER TABLE reservation_settings
  ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS max_reservations_per_slot INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_covers_per_slot INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kitchen_capacity_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kitchen_max_covers_per_15min INTEGER NOT NULL DEFAULT 20;

COMMENT ON COLUMN reservation_settings.buffer_minutes IS 'Rust tussen reservaties (minuten)';
COMMENT ON COLUMN reservation_settings.max_reservations_per_slot IS '0 = onbeperkt';
COMMENT ON COLUMN reservation_settings.max_covers_per_slot IS '0 = onbeperkt';
COMMENT ON COLUMN reservation_settings.kitchen_capacity_enabled IS 'Keuken-capaciteit per 15 min actief';
COMMENT ON COLUMN reservation_settings.kitchen_max_covers_per_15min IS 'Max covers per 15 min wanneer keuken-cap actief';
