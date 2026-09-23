import { NextRequest, NextResponse } from 'next/server'
import { requireCronSecret } from '@/lib/cron-auth'

/** Geen automatische kasboekmail. De eigenaar vult het adres in en verstuurt zelf. */
export async function GET(request: NextRequest) {
  const denied = requireCronSecret(request, { route: '/api/cron/cashbook-month-export' })
  if (denied) return denied
  return NextResponse.json({ skipped: 'De eigenaar stuurt de kasboekmail zelf.' })
}
