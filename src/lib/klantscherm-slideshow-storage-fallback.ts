import type { SupabaseClient } from '@supabase/supabase-js'
import {
  KLANTSCHERM_CUSTOM_PROMO_MAX,
  type KlantschermPromoSlide,
} from '@/lib/klantscherm-custom-promos'
import { KLANTSCHERM_MEDIA_BUCKET_ID } from '@/lib/klantscherm-media-bucket-server'

const IMAGE_NAME = /\.(jpe?g|png|webp|gif)$/i

/** Geüploade bestanden in Storage als DB-lijst leeg is (upload zonder geslaagd Opslaan). */
export async function klantschermPromoSlidesFromStorage(
  supabase: SupabaseClient,
  tenantSlug: string,
): Promise<KlantschermPromoSlide[]> {
  const slug = tenantSlug.trim()
  if (!slug) return []

  const folder = `${slug}/klantscherm`
  const { data: items, error } = await supabase.storage
    .from(KLANTSCHERM_MEDIA_BUCKET_ID)
    .list(folder, {
      limit: KLANTSCHERM_CUSTOM_PROMO_MAX + 5,
      sortBy: { column: 'updated_at', order: 'desc' },
    })

  if (error || !items?.length) return []

  const slides: KlantschermPromoSlide[] = []
  for (const item of items) {
    const name = item.name?.trim() ?? ''
    if (!name || name.startsWith('.') || !IMAGE_NAME.test(name)) continue
    const path = `${folder}/${name}`
    const { data: pub } = supabase.storage.from(KLANTSCHERM_MEDIA_BUCKET_ID).getPublicUrl(path)
    const url = pub.publicUrl?.trim()
    if (!url) continue
    slides.push({
      url,
      sort: slides.length,
      title: '',
      description: '',
      displayPrice: '',
      promoText: '',
      type: 'image',
    })
    if (slides.length >= KLANTSCHERM_CUSTOM_PROMO_MAX) break
  }

  return slides
}
