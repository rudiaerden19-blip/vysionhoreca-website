-- Migration: Create processed_webhook_events table for idempotency
-- Purpose: Prevent duplicate webhook event processing (Stripe webhooks can be delivered multiple times)
-- Date: 2026-01-30

-- Create the table
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id TEXT NOT NULL UNIQUE,  -- Stripe event ID (e.g., evt_xxx)
  event_type TEXT NOT NULL,       -- Event type (e.g., checkout.session.completed)
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_processed_webhook_events_event_id 
  ON processed_webhook_events(event_id);

-- Add comment
COMMENT ON TABLE processed_webhook_events IS 'Stores processed Stripe webhook event IDs for idempotency - prevents duplicate processing';

-- Auto-cleanup old events (older than 30 days) to prevent table bloat
-- This is optional - you can remove if you want to keep all history
CREATE OR REPLACE FUNCTION cleanup_old_webhook_events()
RETURNS void AS $$
BEGIN
  DELETE FROM processed_webhook_events 
  WHERE processed_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Grant access to service role
GRANT ALL ON processed_webhook_events TO service_role;
GRANT SELECT, INSERT ON processed_webhook_events TO authenticated;

-- RLS Policy - webhooks are server-side only
ALTER TABLE processed_webhook_events ENABLE ROW LEVEL SECURITY;

-- Only service role can access
CREATE POLICY "Service role full access on processed_webhook_events"
  ON processed_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
