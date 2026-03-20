import { NextResponse } from 'next/server'

// Ultrasnelle ping voor online-detectie in de kassa
// Geen database, geen externe calls – altijd 200 als de server bereikbaar is
export async function GET() {
  return NextResponse.json(
    { ok: true },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}

export async function HEAD() {
  return new NextResponse(null, {
    status: 200,
    headers: { 'Cache-Control': 'no-store' },
  })
}
