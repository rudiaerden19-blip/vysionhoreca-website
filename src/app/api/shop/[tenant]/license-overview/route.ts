import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

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

  const [subRes, tenantRes, invRes] = await Promise.all([
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

  return NextResponse.json({
    subscription: subRes.data,
    tenant: tenantRes.data,
    invoices: invRes.data ?? [],
  })
}
