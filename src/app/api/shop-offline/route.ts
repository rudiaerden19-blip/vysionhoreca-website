import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SETUP_SQL = `
  CREATE TABLE IF NOT EXISTS shop_offline_status (
    tenant_slug TEXT PRIMARY KEY,
    is_offline BOOLEAN DEFAULT FALSE,
    offline_reason TEXT,
    offline_message TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );
  ALTER TABLE shop_offline_status ADD COLUMN IF NOT EXISTS offline_message TEXT;
`

let tableReady = false

async function ensureTable() {
  if (tableReady) return true

  // First check if table exists
  const { error: checkError } = await supabaseAdmin
    .from('shop_offline_status')
    .select('tenant_slug')
    .limit(1)

  if (!checkError) {
    tableReady = true
    return true
  }

  // Table doesn't exist — try exec_sql RPC
  try {
    const { error: rpcError } = await supabaseAdmin.rpc('exec_sql', { sql: SETUP_SQL })
    if (!rpcError) {
      tableReady = true
      return true
    }
    console.error('exec_sql error:', rpcError.message)
  } catch (e) {
    console.error('exec_sql threw:', e)
  }

  return false
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tenant = searchParams.get('tenant')

  if (!tenant) {
    return NextResponse.json({ error: 'Missing tenant' }, { status: 400 })
  }

  await ensureTable()

  const { data, error } = await supabaseAdmin
    .from('shop_offline_status')
    .select('is_offline, offline_reason, offline_message')
    .eq('tenant_slug', tenant)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ is_offline: false, offline_reason: null, offline_message: null })
  }

  return NextResponse.json(data ?? { is_offline: false, offline_reason: null, offline_message: null })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { tenant, is_offline, offline_reason, offline_message } = body

  if (!tenant) {
    return NextResponse.json({ error: 'Missing tenant' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(request, tenant)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
  }

  const ready = await ensureTable()
  if (!ready) {
    return NextResponse.json(
      { error: 'shop_offline_status table does not exist. Run supabase/shop_offline_status_migration.sql in the Supabase SQL editor.' },
      { status: 503 }
    )
  }

  const { error } = await supabaseAdmin
    .from('shop_offline_status')
    .upsert(
      {
        tenant_slug: tenant,
        is_offline: is_offline ?? false,
        offline_reason: is_offline ? (offline_reason ?? null) : null,
        offline_message: is_offline ? (offline_message ?? null) : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'tenant_slug' }
    )

  if (error) {
    console.error('shop-offline upsert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Reset cache so next GET hits the DB
  tableReady = true
  return NextResponse.json({ success: true })
}
