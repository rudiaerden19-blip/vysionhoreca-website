import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export function getApiRouteSupabase():
  | { ok: true; supabase: SupabaseClient }
  | { ok: false; response: NextResponse } {
  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'server_config' }, { status: 500 }),
    }
  }
  return { ok: true, supabase }
}
