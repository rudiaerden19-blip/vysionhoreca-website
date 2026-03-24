import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Zelfde defaults als admin Levering-pagina — elke tenant moet dezelfde basis krijgen
 * (niet alleen “hoofdtenant” / demo die handmatig in SQL staat).
 */
export function buildDefaultDeliverySettingsRow(tenantSlug: string) {
  return {
    tenant_slug: tenantSlug,
    pickup_enabled: true,
    pickup_time_minutes: 15,
    delivery_enabled: true,
    delivery_fee: 2.5,
    min_order_amount: 15,
    delivery_radius_km: 5,
    delivery_time_minutes: 30,
    payment_cash: true,
    payment_card: true,
    payment_online: false,
  }
}

/** Idempotent: veilig aanroepen bij registratie / superadmin nieuwe tenant. */
export async function ensureDeliverySettingsForTenant(
  client: SupabaseClient,
  tenantSlug: string
): Promise<void> {
  const row = buildDefaultDeliverySettingsRow(tenantSlug)
  const { error } = await client
    .from('delivery_settings')
    .upsert(row, { onConflict: 'tenant_slug' })
  if (error) {
    console.warn('[ensureDeliverySettingsForTenant]', tenantSlug, error.message)
  }
}
