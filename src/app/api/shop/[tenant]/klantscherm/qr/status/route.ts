import { NextResponse } from 'next/server'

/** IBAN-QR: geen online betaalstatus — bevestiging via bankapp op gsm van klant. */
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ ok: false, error: 'not_supported' }, { status: 410 })
}
