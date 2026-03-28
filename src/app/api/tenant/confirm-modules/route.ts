import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantAccess, verifySuperAdminAccess } from '@/lib/verify-tenant-access'
import { TENANT_MODULE_IDS, isTrialSubscriptionActive, parseEnabledModulesJson } from '@/lib/tenant-modules'
import {
  isMissingPostTrialModulesColumnError,
  withoutPostTrialModulesConfirmed,
} from '@/lib/supabase-post-trial-column'

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

    let { data: tenantRow, error: fetchErr } = await supabase
      .from('tenants')
      .select('subscription_status, trial_ends_at, post_trial_modules_confirmed')
      .eq('slug', tenantSlug)
      .maybeSingle()

    if (fetchErr && isMissingPostTrialModulesColumnError(fetchErr)) {
      const r2 = await supabase
        .from('tenants')
        .select('subscription_status, trial_ends_at')
        .eq('slug', tenantSlug)
        .maybeSingle()
      tenantRow = r2.data ? { ...r2.data, post_trial_modules_confirmed: true } : null
      fetchErr = r2.error
    }

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

    const { data: existingRow } = await supabase
      .from('tenants')
      .select('enabled_modules')
      .eq('slug', tenantSlug)
      .maybeSingle()
    const prev = parseEnabledModulesJson(existingRow?.enabled_modules) ?? {}

    const merged: Record<string, boolean> = { ...prev }
    for (const id of TENANT_MODULE_IDS) {
      const v = enabled_modules[id]
      if (superAccess.authorized) {
        merged[id] = !!v
      } else {
        merged[id] =
          id === 'kassa' || id === 'instellingen' || id === 'account' ? true : !!v
      }
    }

    const updPayload = {
      enabled_modules: merged,
      post_trial_modules_confirmed: true,
    }
    let { error: updErr } = await supabase.from('tenants').update(updPayload).eq('slug', tenantSlug)

    if (updErr && isMissingPostTrialModulesColumnError(updErr)) {
      ;({ error: updErr } = await supabase
        .from('tenants')
        .update(withoutPostTrialModulesConfirmed(updPayload as Record<string, unknown>))
        .eq('slug', tenantSlug))
    }

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
