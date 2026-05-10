import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifySuperAdminAccess } from '@/lib/verify-tenant-access'
import { TENANT_MODULE_IDS, parseEnabledModulesJson } from '@/lib/tenant-modules'
import {
  isMissingPostTrialModulesColumnError,
  withoutPostTrialModulesConfirmed,
} from '@/lib/supabase-post-trial-column'

// Voor 50+ tenants: alleen superadmin mag modules per tenant aan/uit zetten.
// (De vroegere "post-trial modulekeuze" door de zaak zelf is verwijderd; betaling/blokkade
//  loopt nu via de superadmin-blokkeer-knop op `tenants.is_blocked`.)
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

    const superAccess = await verifySuperAdminAccess(request)
    if (!superAccess.authorized) {
      return NextResponse.json({ error: 'Alleen superadmin' }, { status: 403 })
    }

    const { data: existingRow } = await supabase
      .from('tenants')
      .select('enabled_modules')
      .eq('slug', tenantSlug)
      .maybeSingle()
    const prev = parseEnabledModulesJson(existingRow?.enabled_modules) ?? {}

    const merged: Record<string, boolean> = { ...prev }
    for (const id of TENANT_MODULE_IDS) {
      merged[id] = !!enabled_modules[id]
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
