-- =====================================================
-- RESERVATION SETTINGS TABEL — VOLLEDIG
-- Voer dit uit in Supabase SQL Editor
-- =====================================================

CREATE TABLE IF NOT EXISTS reservation_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug TEXT NOT NULL UNIQUE,

  -- Algemeen
  is_enabled BOOLEAN DEFAULT true,
  accept_online BOOLEAN DEFAULT true,
  max_party_size INTEGER DEFAULT 12,
  default_duration_minutes INTEGER DEFAULT 90,
  slot_duration_minutes INTEGER DEFAULT 30,
  min_advance_hours INTEGER DEFAULT 2,
  max_advance_days INTEGER DEFAULT 60,

  -- Tijden (JSON arrays)
  shifts TEXT DEFAULT '[]',
  closed_days TEXT DEFAULT '[]',

  -- Annulering
  cancellation_deadline_hours INTEGER DEFAULT 0,
  cancellation_message TEXT DEFAULT '',

  -- Reviews
  auto_send_review BOOLEAN DEFAULT false,
  review_link TEXT DEFAULT '',

  -- Voorschot / deposit
  deposit_required BOOLEAN DEFAULT false,
  deposit_amount NUMERIC DEFAULT 0,

  -- No-show bescherming
  no_show_protection BOOLEAN DEFAULT false,
  no_show_fee NUMERIC DEFAULT 0,

  -- Online booking widget
  booking_page_enabled BOOLEAN DEFAULT true,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Voeg ontbrekende kolommen toe als tabel al bestaat
ALTER TABLE reservation_settings
  ADD COLUMN IF NOT EXISTS is_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS accept_online BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS max_party_size INTEGER DEFAULT 12,
  ADD COLUMN IF NOT EXISTS default_duration_minutes INTEGER DEFAULT 90,
  ADD COLUMN IF NOT EXISTS slot_duration_minutes INTEGER DEFAULT 30,
  ADD COLUMN IF NOT EXISTS min_advance_hours INTEGER DEFAULT 2,
  ADD COLUMN IF NOT EXISTS max_advance_days INTEGER DEFAULT 60,
  ADD COLUMN IF NOT EXISTS shifts TEXT DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS closed_days TEXT DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS cancellation_deadline_hours INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cancellation_message TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS auto_send_review BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS review_link TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_amount NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS no_show_protection BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS no_show_fee NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS booking_page_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS floorplan_floor_only BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS buffer_minutes INTEGER NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS max_reservations_per_slot INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_covers_per_slot INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kitchen_capacity_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS kitchen_max_covers_per_15min INTEGER NOT NULL DEFAULT 20;

-- Index
CREATE INDEX IF NOT EXISTS idx_reservation_settings_tenant ON reservation_settings(tenant_slug);

-- RLS
ALTER TABLE reservation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read reservation_settings" ON reservation_settings;
DROP POLICY IF EXISTS "Auth full access reservation_settings" ON reservation_settings;
CREATE POLICY "Public read reservation_settings" ON reservation_settings FOR SELECT USING (true);
CREATE POLICY "Auth full access reservation_settings" ON reservation_settings FOR ALL USING (true);
