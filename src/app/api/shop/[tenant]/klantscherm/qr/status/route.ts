import { NextResponse } from 'next/server'

/** Bank-QR (SEPA/EPC): geen online status — alleen nog voor oude clients. */
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ ok: false, error: 'not_supported' }, { status: 410 })
}
