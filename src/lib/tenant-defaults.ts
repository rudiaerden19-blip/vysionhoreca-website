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
    .upsert(row, { onConflict: 'tenant_slug'})
  if (error) {
    console.warn('[ensureDeliverySettingsForTenant]', tenantSlug, error.message)
  }
}

const RESERVATION_FLOOR_PLAN_ZONES = ['inside', 'terrace'] as const

/**
 * TableVysion / restaurant_reservaties: lege plattegrond (geen demo-tafel).
 * Overschrijft ook orphaned `floor_plan_tables` bij hergebruikte tenant_slug.
 */
export async function ensureReservationsSoftwareBootstrapForTenant(
  client: SupabaseClient,
  tenantSlug: string,
): Promise<void> {
  for (const plan_zone of RESERVATION_FLOOR_PLAN_ZONES) {
    const { error } = await client.from('floor_plan_tables').upsert(
      { tenant_slug: tenantSlug, plan_zone, data: [] },
      { onConflict: 'tenant_slug,plan_zone' },
    )
    if (error) {
      console.warn('[ensureReservationsSoftwareBootstrapForTenant] floor', tenantSlug, plan_zone, error.message)
    }
  }

  const { error: rsErr } = await client.from('reservation_settings').upsert(
    {
      tenant_slug: tenantSlug,
      is_enabled: true,
      accept_online: true,
      booking_page_enabled: true,
      auto_confirm: false,
    },
    { onConflict: 'tenant_slug' },
  )
  if (rsErr) {
    console.warn('[ensureReservationsSoftwareBootstrapForTenant] settings', tenantSlug, rsErr.message)
  }
}
