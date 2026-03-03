import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Ensure the table exists
async function ensureTable() {
  await supabaseAdmin.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS shop_offline_status (
        tenant_slug TEXT PRIMARY KEY,
        is_offline BOOLEAN DEFAULT FALSE,
        offline_reason TEXT,
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );
    `
  }).catch(() => {
    // Table might already exist or exec_sql might not be available
    // Fall through silently
  })
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenant = searchParams.get('tenant')

  if (!tenant) {
    return NextResponse.json({ error: 'Missing tenant' }, { status: 400 })
  }

  const { data, error } = await supabaseAdmin
    .from('shop_offline_status')
    .select('*')
    .eq('tenant_slug', tenant)
    .maybeSingle()

  if (error) {
    // Table might not exist yet - return online by default
    return NextResponse.json({ is_offline: false, offline_reason: null })
  }

  return NextResponse.json(data ?? { is_offline: false, offline_reason: null })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { tenant, is_offline, offline_reason } = body

  if (!tenant) {
    return NextResponse.json({ error: 'Missing tenant' }, { status: 400 })
  }

  await ensureTable()

  const { error } = await supabaseAdmin
    .from('shop_offline_status')
    .upsert(
      {
        tenant_slug: tenant,
        is_offline: is_offline ?? false,
        offline_reason: is_offline ? (offline_reason ?? null) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_slug' }
    )

  if (error) {
    console.error('Error saving offline status:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
