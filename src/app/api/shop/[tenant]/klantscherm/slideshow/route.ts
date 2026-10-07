import { NextResponse } from 'next/server'
import { loadKlantschermSlideshowSlides } from '@/lib/klantscherm-slideshow-server'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

export async function GET(_request: Request, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 503 })
  }

  const { data: settings } = await supabase
    .from('tenant_settings')
    .select('klantscherm_enabled, klantscherm_slideshow_enabled')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  const menuSlideshowEnabled = settings?.klantscherm_slideshow_enabled === true
  const slides =
    settings?.klantscherm_enabled === true
      ? await loadKlantschermSlideshowSlides(tenantSlug)
      : []

  return NextResponse.json(
    {
      ok: true,
      slideshowEnabled: menuSlideshowEnabled,
      klantschermEnabled: settings?.klantscherm_enabled === true,
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
