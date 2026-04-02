import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { apiRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'

/** Zelfde bucket als andere API’s (60/min per IP) wanneer Upstash geconfigureerd is. */
export async function gateVoiceOrderRateLimit(
  request: NextRequest
): Promise<NextResponse | null> {
  const ip = getClientIP(request)
  const result = await checkRateLimit(apiRateLimiter, `voice-order:${ip}`)
  if (!result.success) {
    return NextResponse.json(
      { success: false, error: 'Te veel verzoeken. Probeer het zo weer.' },
      { status: 429 }
    )
  }
  return null
}
