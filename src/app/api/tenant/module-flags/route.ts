import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { isMissingPostTrialModulesColumnError } from '@/lib/supabase-post-trial-column'

/**
 * Module-toggles voor menu en route-guards (service role).
 * Publiek leesbaar per tenant-slug — nodig voor admin, keuken en display zonder RLS-gaten op `subscriptions`.
 */
export async function GET(request: NextRequest) {
  const tenantSlug = new URL(request.url).searchParams.get('tenant')?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenant vereist' }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Server niet geconfigureerd' }, { status: 503 })
  }

  let { data: row, error: tErr } = await supabase
    .from('tenants')
    .select(
      'plan, enabled_modules, subscription_status, trial_ends_at, feature_group_orders, feature_label_printing, post_trial_modules_confirmed'
    )
    .eq('slug', tenantSlug)
    .maybeSingle()

  if (tErr && isMissingPostTrialModulesColumnError(tErr)) {
    const r2 = await supabase
      .from('tenants')
      .select(
        'plan, enabled_modules, subscription_status, trial_ends_at, feature_group_orders, feature_label_printing'
      )
      .eq('slug', tenantSlug)
      .maybeSingle()
    row = r2.data ? { ...r2.data, post_trial_modules_confirmed: true } : null
    tErr = r2.error
  }

  if (tErr) {
    return NextResponse.json({ error: tErr.message }, { status: 500 })
  }

  const { data: sub, error: sErr } = await supabase
    .from('subscriptions')
    .select('status, trial_ends_at, plan')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  if (sErr) {
    return NextResponse.json({ error: sErr.message }, { status: 500 })
  }

  return NextResponse.json({
    tenant: row,
    subscription: sub,
  })
}
