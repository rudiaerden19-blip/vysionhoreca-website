-- Email Verification Tokens Table
-- Run this in Supabase SQL Editor

-- Add email_verified column to business_profiles if not exists
ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE;

ALTER TABLE business_profiles 
ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ;

-- Create verification tokens table
CREATE TABLE IF NOT EXISTS email_verification_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email ON email_verification_tokens(email);

-- RLS Policy
ALTER TABLE email_verification_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON email_verification_tokens
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Comment
COMMENT ON TABLE email_verification_tokens IS 'Stores temporary tokens for email verification. Tokens expire after 24 hours.';
COMMENT ON COLUMN business_profiles.email_verified IS 'Whether the user has verified their email address';
