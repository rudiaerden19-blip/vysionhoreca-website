-- =====================================================
-- VYSION HORECA - Tenant Texts Tabel
-- Voer dit uit in je Supabase SQL Editor
-- =====================================================

-- TENANT TEXTS - Alle teksten per tenant
CREATE TABLE IF NOT EXISTS tenant_texts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_slug VARCHAR(255) UNIQUE NOT NULL,
  
  -- Hero sectie
  hero_title TEXT DEFAULT '',
  hero_subtitle TEXT DEFAULT '',
  
  -- Over ons
  about_title TEXT DEFAULT 'Ons verhaal',
  about_text TEXT DEFAULT '',
  
  -- Knoppen
  order_button_text TEXT DEFAULT 'Bestel Nu',
  pickup_label TEXT DEFAULT 'Afhalen',
  delivery_label TEXT DEFAULT 'Levering',
  checkout_button_text TEXT DEFAULT 'Afrekenen',
  
  -- Berichten
  closed_message TEXT DEFAULT 'Momenteel gesloten',
  min_order_message TEXT DEFAULT 'Minimum bestelbedrag: €{amount}',
  cart_empty_message TEXT DEFAULT 'Je winkelwagen is leeg',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index
CREATE INDEX IF NOT EXISTS idx_tenant_texts_tenant ON tenant_texts(tenant_slug);

-- Disable RLS for simplicity (of voeg policies toe indien nodig)
ALTER TABLE tenant_texts DISABLE ROW LEVEL SECURITY;
