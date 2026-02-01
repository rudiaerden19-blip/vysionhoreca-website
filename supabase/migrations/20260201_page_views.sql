-- Tabel voor page views
CREATE TABLE IF NOT EXISTS page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path TEXT NOT NULL,
  referrer TEXT,
  user_agent TEXT,
  country TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index voor snelle queries
CREATE INDEX idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX idx_page_views_page_path ON page_views(page_path);

-- View voor dagelijkse stats
CREATE OR REPLACE VIEW daily_page_views AS
SELECT 
  DATE(created_at) as date,
  page_path,
  COUNT(*) as views
FROM page_views
GROUP BY DATE(created_at), page_path
ORDER BY date DESC, views DESC;

-- View voor totalen
CREATE OR REPLACE VIEW page_view_totals AS
SELECT 
  COUNT(*) as total_views,
  COUNT(DISTINCT DATE(created_at)) as days_tracked,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as views_today,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as views_week,
  COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as views_month
FROM page_views;

-- RLS policies
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Iedereen kan een view toevoegen (anoniem)
CREATE POLICY "Anyone can insert page views" ON page_views
  FOR INSERT WITH CHECK (true);

-- Alleen authenticated users kunnen lezen (voor admin)
CREATE POLICY "Authenticated can read page views" ON page_views
  FOR SELECT USING (true);
