import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifySuperAdminAccess } from '@/lib/verify-tenant-access'
import { TENANT_MODULE_IDS } from '@/lib/tenant-modules'
import { collectAllSubmenuIds } from '@/lib/admin-hamburger-modules'
import {
  isMissingPostTrialModulesColumnError,
  withoutPostTrialModulesConfirmed,
} from '@/lib/supabase-post-trial-column'

/** Superadmin mag `enabled_modules` (+ submenu-keys) opslaan; klantportaal niet. */
export async function POST(request: NextRequest) {
  try {
    const supabase = getServerSupabaseClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Server niet geconfigureerd'}, { status: 503 })
    }

    const body = await request.json()
    const tenantSlug = body?.tenantSlug as string | undefined
    const enabled_modules = body?.enabled_modules as Record<string, boolean> | undefined

    if (!tenantSlug || !enabled_modules || typeof enabled_modules !== 'object') {
      return NextResponse.json({ error: 'tenantSlug en enabled_modules verplicht'}, { status: 400 })
    }

    const superAccess = await verifySuperAdminAccess(request)
    if (!superAccess.authorized) {
      return NextResponse.json({ error: 'Geen toegang'}, { status: 403 })
    }

    const validSubs = new Set(collectAllSubmenuIds())
    const merged: Record<string, boolean> = {}

    for (const id of TENANT_MODULE_IDS) {
      merged[id] = id === 'account'? true : !!enabled_modules[id]
    }
    for (const subId of validSubs) {
      merged[subId] = !!enabled_modules[subId]
    }
    merged.account = true

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
      { error: e instanceof Error ? e.message : 'Onbekende fout'},
      { status: 500 }
    )
  }
}
