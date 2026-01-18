-- SUBSCRIPTION STRIPE FIELDS
-- Voer dit uit in Supabase SQL Editor

-- Add stripe_subscription_id column if not exists
ALTER TABLE subscriptions 
ADD COLUMN IF NOT EXISTS stripe_subscription_id VARCHAR(255);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- Add payment_failed status support (already in status enum, just documenting)
-- status can be: trial, active, cancelled, expired, payment_failed
