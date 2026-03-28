import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantAccess, verifySuperAdminAccess } from '@/lib/verify-tenant-access'
import { TENANT_MODULE_IDS, isTrialSubscriptionActive } from '@/lib/tenant-modules'

export async function POST(request: NextRequest) {
  try {
    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Server niet geconfigureerd' }, { status: 503 })
    }

    const body = await request.json()
    const tenantSlug = body?.tenantSlug as string | undefined
    const enabled_modules = body?.enabled_modules as Record<string, boolean> | undefined

    if (!tenantSlug || !enabled_modules || typeof enabled_modules !== 'object') {
      return NextResponse.json({ error: 'tenantSlug en enabled_modules verplicht' }, { status: 400 })
    }

    const tenantAccess = await verifyTenantAccess(request, tenantSlug)
    const superAccess = await verifySuperAdminAccess(request)
    if (!tenantAccess.authorized && !superAccess.authorized) {
      return NextResponse.json({ error: tenantAccess.error || 'Geen toegang' }, { status: 403 })
    }

    const { data: tenantRow, error: fetchErr } = await supabase
      .from('tenants')
      .select('subscription_status, trial_ends_at, post_trial_modules_confirmed')
      .eq('slug', tenantSlug)
      .maybeSingle()

    if (fetchErr || !tenantRow) {
      return NextResponse.json({ error: 'Tenant niet gevonden' }, { status: 404 })
    }

    if (!superAccess.authorized) {
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('status, trial_ends_at')
        .eq('tenant_slug', tenantSlug)
        .maybeSingle()

      if (isTrialSubscriptionActive(sub, tenantRow)) {
        return NextResponse.json({ error: 'Nog in proefperiode — kies modules na afloop' }, { status: 400 })
      }
      if (tenantRow.post_trial_modules_confirmed !== false) {
        return NextResponse.json({ error: 'Modules reeds bevestigd' }, { status: 400 })
      }
    }

    const payload: Record<string, boolean> = {}
    for (const id of TENANT_MODULE_IDS) {
      const v = enabled_modules[id]
      if (superAccess.authorized) {
        payload[id] = !!v
      } else {
        payload[id] =
          id === 'kassa' || id === 'instellingen' || id === 'account' ? true : !!v
      }
    }

    const { error: updErr } = await supabase
      .from('tenants')
      .update({
        enabled_modules: payload,
        post_trial_modules_confirmed: true,
      })
      .eq('slug', tenantSlug)

    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Onbekende fout' },
      { status: 500 }
    )
  }
}
