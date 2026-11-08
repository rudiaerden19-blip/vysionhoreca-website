import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import {
  resolveTenantCurrentPlan,
  subscriptionMonthlyEurosFromPlan,
} from '@/lib/tenant-subscription-display'

/**
 * Licentiepagina: subscriptions + tenants.plan + invoices (service role).
 * Browser/anon mag subscriptions/invoices niet lezen (RLS phase 1).
 */
export async function GET(
  request: NextRequest,
  context: { params: { tenant: string } },
) {
  const tenantSlug = (context.params.tenant || '').trim().toLowerCase()
  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenant vereist' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ error: access.error || 'Geen toegang' }, { status: 403 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
  }

  const [subRes, tenantRes, invRes, settingsRes] = await Promise.all([
    supabase.from('subscriptions').select('*').eq('tenant_slug', tenantSlug).maybeSingle(),
    supabase
      .from('tenants')
      .select('id, name, slug, plan, subscription_status, trial_ends_at')
      .eq('slug', tenantSlug)
      .maybeSingle(),
    supabase
      .from('invoices')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .order('created_at', { ascending: false }),
    supabase
      .from('tenant_settings')
      .select('license_page_premium')
      .eq('tenant_slug', tenantSlug)
      .maybeSingle(),
  ])

  if (subRes.error) {
    return NextResponse.json({ error: subRes.error.message }, { status: 500 })
  }
  if (tenantRes.error) {
    return NextResponse.json({ error: tenantRes.error.message }, { status: 500 })
  }
  if (invRes.error) {
    return NextResponse.json({ error: invRes.error.message }, { status: 500 })
  }

  const invoices = invRes.data ?? []
  const licensePagePremium = settingsRes.data?.license_page_premium === true
  let effectivePlan = resolveTenantCurrentPlan({
    tenantSlug,
    subscription: subRes.data,
    tenant: tenantRes.data,
    licenseInvoices: invoices,
  })
  if (licensePagePremium) effectivePlan = 'pro'

  const subscription = subRes.data
    ? {
        ...subRes.data,
        plan: effectivePlan,
        price_monthly: subscriptionMonthlyEurosFromPlan(
          effectivePlan,
          subRes.data.price_monthly,
        ),
      }
    : null

  const tenant = tenantRes.data
    ? {
        ...tenantRes.data,
        plan: effectivePlan,
        subscription_status:
          tenantRes.data.subscription_status ||
          subscription?.status ||
          'active',
      }
    : null

  return NextResponse.json({
    subscription,
    tenant,
    invoices,
    effectivePlan,
    licensePagePremium,
  })
}
