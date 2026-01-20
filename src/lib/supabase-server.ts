import { createClient, SupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client for server-side operations.
 * Requires SUPABASE_SERVICE_ROLE_KEY for full database access.
 * 
 * @throws Error if required environment variables are missing
 */
export function createServerSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl) {
    console.error('CRITICAL: NEXT_PUBLIC_SUPABASE_URL is not configured')
    throw new Error('Database URL not configured')
  }

  if (!supabaseServiceKey) {
    console.error('CRITICAL: SUPABASE_SERVICE_ROLE_KEY is not configured')
    console.error('This key is required for server-side database operations.')
    console.error('Add it to your Vercel environment variables.')
    throw new Error('Database service key not configured')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

/**
 * Safely creates a Supabase client, returning null if not configured.
 * Use this when you want to handle the error yourself.
 */
export function getServerSupabaseClient(): SupabaseClient | null {
  try {
    return createServerSupabaseClient()
  } catch {
    return null
  }
}

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}
