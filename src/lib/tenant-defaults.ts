import type { SupabaseClient } from '@supabase/supabase-js'
import { KASSA_FLOOR_ZONES } from '@/lib/kassa-floor-plan-zone'

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

/** Zelfde defaults als `KASSA_DEFAULT_RESERVATION_SETTINGS` (DB-kolommen). */
export function buildDefaultReservationSettingsRow(tenantSlug: string) {
  return {
    tenant_slug: tenantSlug,
    is_enabled: true,
    accept_online: false,
    max_party_size: 12,
    default_duration_minutes: 90,
    buffer_minutes: 15,
    slot_duration_minutes: 30,
    max_reservations_per_slot: 0,
    max_covers_per_slot: 0,
    min_advance_hours: 2,
    max_advance_days: 60,
    kitchen_capacity_enabled: false,
    kitchen_max_covers_per_15min: 20,
    closed_days: [] as number[],
    shifts: [
      { id: '1', name: 'Lunch', startTime: '12:00', endTime: '15:00', isActive: false },
      { id: '2', name: 'Diner', startTime: '18:00', endTime: '23:00', isActive: false },
    ],
    cancellation_deadline_hours: 24,
    cancellation_message:
      'Annulering is niet meer mogelijk, het afgesproken tijdstip is verstreken.',
    review_link: '',
    auto_send_review: false,
    deposit_required: false,
    deposit_amount: 10,
    no_show_protection: false,
    no_show_fee: 25,
    booking_page_enabled: true,
    auto_confirm: false,
    floorplan_floor_only: false,
    floor_plan_tables_locked: true,
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

/**
 * Nieuwe tenant: expliciet lege plattegrond (binnen + terras).
 * Overschrijft nooit bestaande rijen — alleen insert als zone nog ontbreekt.
 */
export async function ensureEmptyFloorPlanTablesForTenant(
  client: SupabaseClient,
  tenantSlug: string
): Promise<void> {
  for (const plan_zone of KASSA_FLOOR_ZONES) {
    const { data: existing, error: readErr } = await client
      .from('floor_plan_tables')
      .select('tenant_slug')
      .eq('tenant_slug', tenantSlug)
      .eq('plan_zone', plan_zone)
      .maybeSingle()

    if (readErr) {
      console.warn('[ensureEmptyFloorPlanTablesForTenant] read', tenantSlug, plan_zone, readErr.message)
      continue
    }
    if (existing) continue

    const { error: insErr } = await client.from('floor_plan_tables').insert({
      tenant_slug: tenantSlug,
      plan_zone,
      data: [],
    })
    if (insErr) {
      console.warn('[ensureEmptyFloorPlanTablesForTenant] insert', tenantSlug, plan_zone, insErr.message)
    }
  }
}

/** Reservatie-instellingen rij — alleen als tenant nog geen rij heeft. */
export async function ensureReservationSettingsForTenant(
  client: SupabaseClient,
  tenantSlug: string
): Promise<void> {
  const { data: existing, error: readErr } = await client
    .from('reservation_settings')
    .select('tenant_slug')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  if (readErr) {
    console.warn('[ensureReservationSettingsForTenant] read', tenantSlug, readErr.message)
    return
  }
  if (existing) return

  const row = buildDefaultReservationSettingsRow(tenantSlug)
  const { error: insErr } = await client.from('reservation_settings').insert(row)
  if (insErr) {
    console.warn('[ensureReservationSettingsForTenant] insert', tenantSlug, insErr.message)
  }
}
