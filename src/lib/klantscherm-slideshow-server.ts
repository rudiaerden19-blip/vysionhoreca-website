import { getServerSupabaseClient } from '@/lib/supabase-server'

export type KlantschermSlideshowUpload = { url: string; sort: number }

export function parseKlantschermSlideshowUploads(raw: unknown): KlantschermSlideshowUpload[] {
  if (!Array.isArray(raw)) return []
  const out: KlantschermSlideshowUpload[] = []
  for (const row of raw) {
    if (!row || typeof row !== 'object') continue
    const url = String((row as { url?: unknown }).url ?? '').trim()
    if (!url) continue
    const sort = Number((row as { sort?: unknown }).sort)
    out.push({ url, sort: Number.isFinite(sort) ? sort : 0 })
  }
  out.sort((a, b) => a.sort - b.sort || a.url.localeCompare(b.url))
  return out
}

/** Menu-foto''s + tenant-uploads; unieke URLs, uploads eerst. */
export async function loadKlantschermSlideshowImageUrls(tenantSlug: string): Promise<string[]> {
  const slug = tenantSlug.trim()
  if (!slug) return []

  const supabase = getServerSupabaseClient()
  if (!supabase) return []

  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('klantscherm_slideshow_enabled, klantscherm_slideshow_uploads')
    .eq('tenant_slug', slug)
    .maybeSingle()

  if (settings?.klantscherm_slideshow_enabled === false) return []

  const uploads = parseKlantschermSlideshowUploads(settings?.klantscherm_slideshow_uploads).map(
    (u) => u.url,
  )

  const { data: products } = await supabase
    .from('menu_products')
    .select('image_url')
    .eq('tenant_slug', slug)
    .eq('is_active', true)
    .limit(200)

  const menuUrls: string[] = []
  for (const p of products ?? []) {
    const url = String(p.image_url ?? '').trim()
    if (url) menuUrls.push(url)
  }

  const seen = new Set<string>()
  const merged: string[] = []
  for (const url of [...uploads, ...menuUrls]) {
    if (seen.has(url)) continue
    seen.add(url)
    merged.push(url)
  }
  return merged
}
