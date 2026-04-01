import type { SupabaseClient } from '@supabase/supabase-js'
import { DEMO_TENANT_SLUG } from '@/lib/demo-links'
import { buildDefaultDeliverySettingsRow } from '@/lib/tenant-defaults'

/**
 * Vaste presentatie voor de publieke demo (frituurnolim).
 * Pas dit bestand aan als de “kanonieke” demo-inhoud wijzigt.
 */
const TENANT_SETTINGS_BRANDING = {
  business_name: 'Frituur Nolim',
  tagline: 'Verse friet, snacks en meer',
  description:
    'Welkom bij Frituur Nolim — het live demo-account van OrderVysion. Bestel online of reserveer een tafel.',
  logo_url: '',
  primary_color: '#FF6B35',
  secondary_color: '#1a1a2e',
  email: 'info@ordervysion.com',
  phone: '+32 11 22 33 44',
  address: 'Marktplein 1',
  postal_code: '3900',
  city: 'Pelt',
  country: 'BE',
  website: '',
  btw_number: '',
  kvk_number: '',
  btw_percentage: 21,
  facebook_url: '',
  instagram_url: '',
  tiktok_url: '',
  website_url: '',
  about_image: null as string | null,
  top_seller_1: null as string | null,
  top_seller_2: null as string | null,
  top_seller_3: null as string | null,
  cover_image_1: null as string | null,
  cover_image_2: null as string | null,
  cover_image_3: null as string | null,
  seo_title: 'Frituur Nolim | Bestel online (demo)',
  seo_description:
    'Publieke demo van het OrderVysion bestel- en reserveringsplatform — Frituur Nolim.',
  seo_keywords: 'frituur, demo, bestellen, reserveren, OrderVysion',
  seo_og_image: null as string | null,
  specialty_1_image: null as string | null,
  specialty_1_title: null as string | null,
  specialty_2_image: null as string | null,
  specialty_2_title: null as string | null,
  specialty_3_image: null as string | null,
  specialty_3_title: null as string | null,
  show_qr_codes: true,
  hiring_enabled: false,
  hiring_title: null as string | null,
  hiring_description: null as string | null,
  hiring_contact: null as string | null,
  gift_cards_enabled: false,
  promotions_enabled: true,
  reservations_enabled: true,
  image_display_mode: 'cover' as const,
  payment_methods: ['cash', 'bancontact'],
  is_blocked: false,
}

function buildNolimOpeningHours(tenantSlug: string) {
  const rowOpen = {
    tenant_slug: tenantSlug,
    is_open: true,
    open_time: '11:00',
    close_time: '22:00',
    last_order_time: null as string | null,
    has_shift2: false,
    open_time_2: null as string | null,
    close_time_2: null as string | null,
  }
  const rowClosed = {
    tenant_slug: tenantSlug,
    is_open: false,
    open_time: '11:00',
    close_time: '22:00',
    last_order_time: null as string | null,
    has_shift2: false,
    open_time_2: null as string | null,
    close_time_2: null as string | null,
  }
  return [0, 1, 2, 3, 4, 5].map((day) => ({ ...rowOpen, day_of_week: day })).concat([
    { ...rowClosed, day_of_week: 6 },
  ])
}

const TENANT_TEXTS_DEFAULTS = {
  hero_title: '',
  hero_subtitle: '',
  about_title: '',
  about_text: '',
  order_button_text: '',
  pickup_label: '',
  delivery_label: '',
  closed_message: '',
  min_order_message: '',
  cart_empty_message: '',
  checkout_button_text: '',
}

const RESERVATION_SETTINGS_DEFAULTS = {
  is_enabled: true,
  accept_online: true,
  max_party_size: 12,
  default_duration_minutes: 90,
  slot_duration_minutes: 30,
  min_advance_hours: 2,
  max_advance_days: 60,
  shifts: '[]',
  closed_days: '[]',
  cancellation_deadline_hours: 0,
  cancellation_message: '',
  auto_send_review: false,
  review_link: '',
  deposit_required: false,
  deposit_amount: 0,
  no_show_protection: false,
  no_show_fee: 0,
  booking_page_enabled: true,
  auto_confirm: false,
}

export type DemoBrandingResetStatus = {
  tenant_settings: 'ok' | 'error'
  tenants_name: 'ok' | 'error' | 'skipped'
  opening_hours: 'ok' | 'error'
  delivery_settings: 'ok' | 'error'
  tenant_texts: 'ok' | 'error'
  reservation_settings: 'ok' | 'error'
}

export async function applyFrituurNolimDemoBranding(
  supabase: SupabaseClient
): Promise<DemoBrandingResetStatus> {
  const slug = DEMO_TENANT_SLUG
  const status: DemoBrandingResetStatus = {
    tenant_settings: 'ok',
    tenants_name: 'skipped',
    opening_hours: 'ok',
    delivery_settings: 'ok',
    tenant_texts: 'ok',
    reservation_settings: 'ok',
  }

  {
    const { error } = await supabase.from('tenant_settings').update(TENANT_SETTINGS_BRANDING).eq('tenant_slug', slug)
    if (error) status.tenant_settings = 'error'
  }

  {
    const { error } = await supabase.from('tenants').update({ name: TENANT_SETTINGS_BRANDING.business_name }).eq('slug', slug)
    if (error) status.tenants_name = 'error'
    else status.tenants_name = 'ok'
  }

  {
    const { error: delErr } = await supabase.from('opening_hours').delete().eq('tenant_slug', slug)
    if (delErr) {
      status.opening_hours = 'error'
    } else {
      const { error: insErr } = await supabase.from('opening_hours').insert(buildNolimOpeningHours(slug))
      if (insErr) status.opening_hours = 'error'
    }
  }

  {
    const { error } = await supabase
      .from('delivery_settings')
      .upsert(buildDefaultDeliverySettingsRow(slug), { onConflict: 'tenant_slug' })
    if (error) status.delivery_settings = 'error'
  }

  {
    const { error } = await supabase
      .from('tenant_texts')
      .upsert({ tenant_slug: slug, ...TENANT_TEXTS_DEFAULTS }, { onConflict: 'tenant_slug' })
    if (error) status.tenant_texts = 'error'
  }

  {
    const { error } = await supabase
      .from('reservation_settings')
      .upsert({ tenant_slug: slug, ...RESERVATION_SETTINGS_DEFAULTS }, { onConflict: 'tenant_slug' })
    if (error) status.reservation_settings = 'error'
  }

  return status
}
