import { NextResponse } from 'next/server'

/** Altijd live — om te controleren of je domein deze Vercel-deploy raakt (los van browser-/SW-cache). */
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const sha = process.env.VERCEL_GIT_COMMIT_SHA || ''
  const ref = process.env.VERCEL_GIT_COMMIT_REF || ''
  const res = NextResponse.json({
    commit: sha || null,
    branch: ref || null,
    deployedAt: new Date().toISOString(),
    hint:
      'Vergelijk commit met de laatste op GitHub main. Komt dit niet overeen → dit domein hangt aan een ander Vercel-project of er is geen succesvolle deploy.',
  })
  res.headers.set('Cache-Control', 'no-store, max-age=0')
  res.headers.set('X-Vysion-Commit', sha.slice(0, 7) || 'unknown')
  return res
}
