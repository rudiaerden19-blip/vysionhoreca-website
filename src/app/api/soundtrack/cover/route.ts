import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const ALLOWED_HOSTS = new Set(['i.soundcdn.com'])

/** Publieke CDN-proxy voor albumcovers — `<img>` kan geen admin-auth headers meesturen. */
export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get('url')?.trim()
  if (!raw) {
    return NextResponse.json({ error: 'Missing url' }, { status: 400 })
  }

  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid url' }, { status: 400 })
  }

  if (parsed.protocol !== 'https:' || !ALLOWED_HOSTS.has(parsed.hostname)) {
    return NextResponse.json({ error: 'Url not allowed' }, { status: 400 })
  }

  const upstream = await fetch(parsed.toString(), {
    headers: { Accept: 'image/*' },
    cache: 'force-cache',
    next: { revalidate: 86400 },
  })

  if (!upstream.ok) {
    return new NextResponse(null, { status: upstream.status })
  }

  const contentType = upstream.headers.get('content-type') || 'image/jpeg'
  const body = await upstream.arrayBuffer()

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    },
  })
}
