import { NextRequest, NextResponse } from 'next/server'
import {
  isSoundtrackApiBasicConfigured,
  pingSoundtrackPublicApi,
} from '@/lib/soundtrack/soundtrack-api-basic'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const tenantSlug = new URL(request.url).searchParams.get('tenant')?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenant vereist' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json(
      { error: access.error || 'Forbidden' },
      { status: access.error?.includes('ingelogd') ? 401 : 403 },
    )
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Server fout' }, { status: 500 })
  }

  const { data, error } = await supabase
    .from('tenant_settings')
    .select('soundtrack_player_email, soundtrack_player_password')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const email = (data?.soundtrack_player_email as string | null | undefined)?.trim() || ''
  const passwordSet = !!(data?.soundtrack_player_password as string | null | undefined)?.trim()
  const platformConfigured = isSoundtrackApiBasicConfigured()
  const platformPing = platformConfigured ? await pingSoundtrackPublicApi() : { ok: false as const }

  return NextResponse.json({
    email,
    password_set: passwordSet,
    linked: Boolean(email && passwordSet),
    platform_soundtrack_configured: platformConfigured && platformPing.ok,
    platform_soundtrack_error:
      platformConfigured && !platformPing.ok ? platformPing.error : null,
  })
}

export async function POST(request: NextRequest) {
  let body: {
    tenantSlug?: string
    email?: string
    password?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige body' }, { status: 400 })
  }

  const tenantSlug = body.tenantSlug?.trim()
  const email = body.email?.trim() || ''
  const password = body.password ?? ''

  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenant vereist' }, { status: 400 })
  }
  if (!email) {
    return NextResponse.json({ error: 'E-mail vereist' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json(
      { error: access.error || 'Forbidden' },
      { status: access.error?.includes('ingelogd') ? 401 : 403 },
    )
  }

  const platformPing = await pingSoundtrackPublicApi()
  if (!platformPing.ok) {
    return NextResponse.json(
      {
        error:
          platformPing.error ||
          'Soundtrack op de server is niet bereikbaar. Zet SOUNDTRACK_API_BASIC in Vercel → Production (zelfde key als voor de player).',
        code: 'soundtrack_config',
      },
      { status: 503 },
    )
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Server fout' }, { status: 500 })
  }

  const { data: existing } = await supabase
    .from('tenant_settings')
    .select('soundtrack_player_password')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  const storedPassword = (existing?.soundtrack_player_password as string | null | undefined)?.trim()
  const passwordToUse = password.trim() || storedPassword || ''
  if (!passwordToUse) {
    return NextResponse.json({ error: 'Wachtwoord vereist' }, { status: 400 })
  }

  const row: Record<string, unknown> = {
    tenant_slug: tenantSlug,
    soundtrack_player_email: email,
    soundtrack_player_password: password.trim() || storedPassword,
  }

  const { error, data } = await supabase
    .from('tenant_settings')
    .upsert(row, { onConflict: 'tenant_slug' })
    .select('tenant_slug')

  if (error) {
    const missingCol =
      error.message.includes('soundtrack_player') ||
      error.message.includes('schema cache') ||
      error.code === 'PGRST204'
    if (missingCol) {
      return NextResponse.json(
        {
          error:
            'Databasekolommen ontbreken. Voer migratie 20261006160000_tenant_soundtrack_player_credentials.sql uit in Supabase.',
          code: 'migration',
        },
        { status: 503 },
      )
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!data?.length) {
    return NextResponse.json({ error: 'Opslaan mislukt (geen rij terug)' }, { status: 500 })
  }

  return NextResponse.json({ success: true, linked: true })
}
