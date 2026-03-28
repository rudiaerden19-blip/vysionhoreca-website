import { NextResponse } from 'next/server'

// Ultrasnelle ping voor online-detectie in de kassa
// Geen database, geen externe calls – altijd 200 als de server bereikbaar is
// `commit` / `branch` = Vercel build-info (ter controle: live site = zelfde als GitHub main?)
export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || ''
  const ref = process.env.VERCEL_GIT_COMMIT_REF || ''
  return NextResponse.json(
    {
      ok: true,
      commit: sha ? sha.slice(0, 7) : null,
      commitFull: sha || null,
      branch: ref || null,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        ...(sha ? { 'X-Vysion-Commit': sha.slice(0, 7) } : {}),
      },
    }
  )
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
