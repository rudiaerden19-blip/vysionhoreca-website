import { NextResponse } from 'next/server'
import {
  loadKlantschermSlideshowSlidesForTenant,
  readKlantschermPromoSettingsRow,
} from '@/lib/klantscherm-promo-settings-server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

type RouteContext = { params: { tenant: string } }

export async function GET(_request: Request, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const settings = await readKlantschermPromoSettingsRow(tenantSlug)
  const menuSlideshowEnabled = settings?.klantscherm_slideshow_enabled === true
  const klantschermEnabled = settings?.klantscherm_enabled === true
  const slides = klantschermEnabled
    ? await loadKlantschermSlideshowSlidesForTenant(tenantSlug)
    : []

  return NextResponse.json(
    {
      ok: true,
      slideshowEnabled: menuSlideshowEnabled,
      klantschermEnabled,
      slides,
      slideCount: slides.length,
    },
    {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        Pragma: 'no-cache',
      },
    },
  )
}
