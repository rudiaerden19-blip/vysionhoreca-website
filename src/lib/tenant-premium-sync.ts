import type { SupabaseClient } from '@supabase/supabase-js'
import { MONTHLY_PRICE_WITH_HARDWARE } from '@/lib/pricing-hardware'

type Db = SupabaseClient

/**
 * Zet tenant + subscriptions op Premium (handmatige superadmin / betaalde licentiefactuur).
 */
export async function syncTenantPremiumSubscription(
  supabase: Db,
  tenantSlug: string,
): Promise<{ ok: boolean; error?: string }> {
  const slug = tenantSlug.trim().toLowerCase()
  if (!slug) return { ok: false, error: 'tenant_slug ontbreekt' }

  const now = new Date()
  const nextMonth = new Date(now)
  nextMonth.setMonth(nextMonth.getMonth() + 1)

  const { data: existing, error: readErr } = await supabase
    .from('subscriptions')
    .select('id, subscription_started_at')
    .eq('tenant_slug', slug)
    .maybeSingle()

  if (readErr) return { ok: false, error: readErr.message }

  const subRow = {
    plan: 'pro',
    status: 'active',
    price_monthly: MONTHLY_PRICE_WITH_HARDWARE,
    next_payment_at: nextMonth.toISOString(),
    ...(existing?.subscription_started_at
      ? {}
      : { subscription_started_at: now.toISOString() }),
  }

  if (existing?.id) {
    const { error } = await supabase
      .from('subscriptions')
      .update(subRow)
      .eq('id', existing.id)
      .eq('tenant_slug', slug)
    if (error) return { ok: false, error: error.message }
  } else {
    const { error } = await supabase.from('subscriptions').insert({
      tenant_slug: slug,
      ...subRow,
      payment_method: 'manual',
    })
    if (error) return { ok: false, error: error.message }
  }

  const { error: tenantErr } = await supabase
    .from('tenants')
    .update({ plan: 'pro', subscription_status: 'active' })
    .eq('slug', slug)

  if (tenantErr) return { ok: false, error: tenantErr.message }

  return { ok: true }
}
