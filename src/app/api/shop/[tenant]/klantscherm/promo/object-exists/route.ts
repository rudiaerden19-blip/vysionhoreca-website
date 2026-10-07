import { NextResponse } from 'next/server'
import { KLANTSCHERM_PROMO_VIDEO_BUCKET_ID } from '@/lib/klantscherm-media-bucket-server'
import { getServerSupabaseClient } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

/** Na grote upload: controleren of object in Storage staat (xhr kan lang op antwoord wachten). */
export async function GET(request: Request, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const path = new URL(request.url).searchParams.get('path')?.trim() ?? ''
  if (!path || !path.startsWith(`${tenantSlug}/klantscherm/`)) {
    return NextResponse.json({ ok: false, error: 'bad_path' }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 503 })
  }

  const folder = path.split('/').slice(0, -1).join('/')
  const name = path.split('/').pop() ?? ''
  const { data, error } = await supabase.storage.from(KLANTSCHERM_PROMO_VIDEO_BUCKET_ID).list(folder, {
    limit: 100,
    search: name,
  })

  if (error) {
    return NextResponse.json({ ok: true, exists: false })
  }

  const exists = (data ?? []).some((row) => row.name === name)
  return NextResponse.json({ ok: true, exists })
}
