import { NextResponse } from 'next/server'
import {
  klantschermSlidesFromSettingsRow,
} from '@/lib/klantscherm-slideshow-server'
import { mapKlantschermSlidesPlaybackUrls } from '@/lib/klantscherm-slideshow-playback-url'
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

  const { data: settings, error: settingsError } = await supabase
    .from('tenant_settings')
    .select(
      'klantscherm_enabled, klantscherm_slideshow_enabled, klantscherm_custom_promos, klantscherm_slideshow_uploads',
    )
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  if (settingsError) {
    return NextResponse.json({ ok: false, error: settingsError.message }, { status: 500 })
  }

  const menuSlideshowEnabled = settings?.klantscherm_slideshow_enabled === true
  const rawSlides =
    settings?.klantscherm_enabled === true ? klantschermSlidesFromSettingsRow(settings) : []
  const slides = mapKlantschermSlidesPlaybackUrls(tenantSlug, rawSlides)

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
