import {
  type KlantschermCustomPromo,
  isKlantschermCustomPromosColumnError,
  klantschermCustomPromosToLegacyUploads,
  klantschermCustomPromosToSlides,
  mergeKlantschermCustomPromoSources,
  mergeKlantschermCustomPromosForSave,
  shouldSkipEmptyKlantschermPromoOverwrite,
} from '@/lib/klantscherm-custom-promos'
import { klantschermPromoSlidesFromStorage } from '@/lib/klantscherm-slideshow-storage-fallback'
import type { KlantschermPromoSlide } from '@/lib/klantscherm-custom-promos'
import { mapKlantschermSlidesPlaybackUrls } from '@/lib/klantscherm-slideshow-playback-url'
import { getServerSupabaseClient } from '@/lib/supabase-server'

const PROMO_SETTINGS_SELECT =
  'tenant_slug,klantscherm_enabled,klantscherm_slideshow_enabled,klantscherm_custom_promos,klantscherm_slideshow_uploads,klantscherm_bank_iban,klantscherm_bank_account_name'

export type KlantschermPromoSettingsRecord = {
  tenant_slug?: string
  klantscherm_enabled?: boolean
  klantscherm_slideshow_enabled?: boolean
  klantscherm_custom_promos?: unknown
  klantscherm_slideshow_uploads?: unknown
  klantscherm_bank_iban?: string | null
  klantscherm_bank_account_name?: string | null
}

export type KlantschermPromoBundle = {
  settings: KlantschermPromoSettingsRecord | null
  promos: KlantschermCustomPromo[]
  /** True wanneer promos uit Storage zijn teruggezet en opnieuw in DB staan. */
  healedFromStorage?: boolean
}

function supabaseRestConfig(): { base: string; key: string } | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, '')
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!base || !key) return null
  return { base, key }
}

/** Eén betrouwbare read: PostgREST (volledige JSONB), geen afgekapte supabase-js rijen. */
export async function readKlantschermPromoSettingsRow(
  tenantSlug: string,
): Promise<KlantschermPromoSettingsRecord | null> {
  const slug = tenantSlug.trim()
  if (!slug) return null

  const cfg = supabaseRestConfig()
  if (cfg) {
    try {
      const select = encodeURIComponent(PROMO_SETTINGS_SELECT)
      const res = await fetch(
        `${cfg.base}/rest/v1/tenant_settings?tenant_slug=eq.${encodeURIComponent(slug)}&select=${select}`,
        {
          method: 'GET',
          headers: {
            apikey: cfg.key,
            Authorization: `Bearer ${cfg.key}`,
            Accept: 'application/json',
          },
          cache: 'no-store',
        },
      )
      if (res.ok) {
        const rows = (await res.json()) as KlantschermPromoSettingsRecord[]
        if (Array.isArray(rows) && rows.length > 0) return rows[0] ?? null
      }
    } catch {
      /* fallback supabase-js */
    }
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('tenant_settings')
    .select(PROMO_SETTINGS_SELECT)
    .eq('tenant_slug', slug)
    .maybeSingle()

  if (error && isKlantschermCustomPromosColumnError(error.message)) {
    const legacy = await supabase
      .from('tenant_settings')
      .select(
        'tenant_slug,klantscherm_enabled,klantscherm_slideshow_enabled,klantscherm_slideshow_uploads,klantscherm_bank_iban,klantscherm_bank_account_name',
      )
      .eq('tenant_slug', slug)
      .maybeSingle()
    return (legacy.data as KlantschermPromoSettingsRecord | null) ?? null
  }

  if (error || !data) return null
  return data as KlantschermPromoSettingsRecord
}

function promosFromStorageSlides(slides: KlantschermPromoSlide[]): KlantschermCustomPromo[] {
  return slides.map((s) => ({
    url: s.url,
    sort: s.sort,
    title: s.title,
    description: s.description,
    displayPrice: s.displayPrice,
    promoText: s.promoText,
  }))
}

/** DB + legacy merge; lege DB → foto's uit Storage + optioneel terugschrijven. */
export async function readKlantschermPromoBundle(tenantSlug: string): Promise<KlantschermPromoBundle> {
  const slug = tenantSlug.trim()
  let settings = await readKlantschermPromoSettingsRow(slug)
  let promos = mergeKlantschermCustomPromoSources(
    settings?.klantscherm_custom_promos,
    settings?.klantscherm_slideshow_uploads,
  )

  if (promos.length === 0 && slug) {
    const supabase = getServerSupabaseClient()
    if (supabase) {
      const fromStorage = await klantschermPromoSlidesFromStorage(supabase, slug)
      const recovered = promosFromStorageSlides(fromStorage)
      if (recovered.length > 0) {
        const saved = await writeKlantschermPromoList(slug, recovered, { allowClear: true })
        if (saved.ok) {
          settings = (await readKlantschermPromoSettingsRow(slug)) ?? settings
          promos = saved.promos
          return { settings, promos, healedFromStorage: true }
        }
        promos = recovered
      }
    }
  }

  return { settings, promos }
}

export async function loadKlantschermSlideshowSlidesForTenant(
  tenantSlug: string,
): Promise<KlantschermPromoSlide[]> {
  const slug = tenantSlug.trim()
  if (!slug) return []

  const { settings, promos } = await readKlantschermPromoBundle(slug)
  if (settings?.klantscherm_enabled !== true) return []

  const slides = klantschermCustomPromosToSlides(promos)
  return mapKlantschermSlidesPlaybackUrls(slug, slides) as KlantschermPromoSlide[]
}

export type WriteKlantschermPromoListResult =
  | { ok: true; promos: KlantschermCustomPromo[]; skippedEmptyOverwrite?: boolean }
  | { ok: false; error: string }

/** Schrijf promolijst — lege lijst wist nooit bestaande promos (tenzij allowClear). */
export async function writeKlantschermPromoList(
  tenantSlug: string,
  incoming: KlantschermCustomPromo[],
  opts?: { allowClear?: boolean },
): Promise<WriteKlantschermPromoListResult> {
  const slug = tenantSlug.trim()
  if (!slug) return { ok: false, error: 'bad_tenant' }

  const rows = mergeKlantschermCustomPromosForSave(incoming)
  const existing = await readKlantschermPromoSettingsRow(slug)
  const existingMerged = mergeKlantschermCustomPromoSources(
    existing?.klantscherm_custom_promos,
    existing?.klantscherm_slideshow_uploads,
  )

  if (!opts?.allowClear && shouldSkipEmptyKlantschermPromoOverwrite(rows, existingMerged)) {
    return { ok: true, promos: existingMerged, skippedEmptyOverwrite: true }
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'server_config' }

  const patch = {
    klantscherm_custom_promos: rows,
    klantscherm_slideshow_uploads: klantschermCustomPromosToLegacyUploads(rows),
  }

  let { error } = await supabase.from('tenant_settings').update(patch).eq('tenant_slug', slug)
  if (!error) return { ok: true, promos: rows }

  if (error && isKlantschermCustomPromosColumnError(error.message)) {
    const legacyOnly = {
      klantscherm_slideshow_uploads: klantschermCustomPromosToLegacyUploads(rows),
    }
    ;({ error } = await supabase.from('tenant_settings').update(legacyOnly).eq('tenant_slug', slug))
    if (!error) return { ok: true, promos: rows }
  }

  if (!error) {
    const upsert = await supabase
      .from('tenant_settings')
      .upsert({ tenant_slug: slug, ...patch }, { onConflict: 'tenant_slug' })
    error = upsert.error
    if (!error) return { ok: true, promos: rows }
  }

  return { ok: false, error: error?.message ?? 'tenant_settings_write_failed' }
}

export type SaveKlantschermAdminSettingsInput = {
  klantscherm_enabled?: boolean
  klantscherm_slideshow_enabled?: boolean
  klantscherm_custom_promos?: KlantschermCustomPromo[]
  klantscherm_bank_iban?: string | null
  klantscherm_bank_account_name?: string | null
}

export async function saveKlantschermAdminSettings(
  tenantSlug: string,
  body: SaveKlantschermAdminSettingsInput,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const slug = tenantSlug.trim()
  if (!slug) return { ok: false, error: 'bad_tenant' }

  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'server_config' }

  const patch: Record<string, unknown> = {}

  if (typeof body.klantscherm_enabled === 'boolean') {
    patch.klantscherm_enabled = body.klantscherm_enabled
  }
  if (typeof body.klantscherm_slideshow_enabled === 'boolean') {
    patch.klantscherm_slideshow_enabled = body.klantscherm_slideshow_enabled
  }
  if (body.klantscherm_bank_iban !== undefined) {
    patch.klantscherm_bank_iban =
      typeof body.klantscherm_bank_iban === 'string'
        ? body.klantscherm_bank_iban.replace(/\s/g, '').toUpperCase() || null
        : null
  }
  if (body.klantscherm_bank_account_name !== undefined) {
    patch.klantscherm_bank_account_name =
      typeof body.klantscherm_bank_account_name === 'string'
        ? body.klantscherm_bank_account_name.trim() || null
        : null
  }

  if (Array.isArray(body.klantscherm_custom_promos)) {
    const promoWrite = await writeKlantschermPromoList(slug, body.klantscherm_custom_promos)
    if (!promoWrite.ok) return { ok: false, error: promoWrite.error }
  }

  if (Object.keys(patch).length === 0) {
    return { ok: true }
  }

  let { error, data } = await supabase
    .from('tenant_settings')
    .update(patch)
    .eq('tenant_slug', slug)
    .select('tenant_slug')
    .maybeSingle()

  if (!error && !data) {
    const upsert = await supabase
      .from('tenant_settings')
      .upsert({ tenant_slug: slug, ...patch }, { onConflict: 'tenant_slug' })
      .select('tenant_slug')
      .maybeSingle()
    error = upsert.error
    data = upsert.data
  }

  if (error) return { ok: false, error: error.message }
  if (!data) return { ok: false, error: 'tenant_settings_not_updated' }
  return { ok: true }
}

/** @deprecated gebruik readKlantschermPromoSettingsRow */
export async function fetchKlantschermPromoSettingsRow(
  tenantSlug: string,
): Promise<KlantschermPromoSettingsRecord | null> {
  return readKlantschermPromoSettingsRow(tenantSlug)
}
