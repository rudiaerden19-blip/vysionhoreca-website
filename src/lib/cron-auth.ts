import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'

/**
 * Production-only: require CRON_SECRET to be set and Authorization: Bearer <secret>.
 * Development/test: no check (local cron testing without secrets).
 */
export function requireCronSecret(
  request: NextRequest,
  context?: { requestId?: string; route?: string }
): NextResponse | null {
  if (process.env.NODE_ENV !== 'production') {
    return null
  }

  const cronSecret = process.env.CRON_SECRET?.trim()
  if (!cronSecret) {
    logger.error('Cron rejected: CRON_SECRET not configured in production', {
      requestId: context?.requestId,
      route: context?.route,
    })
    return NextResponse.json({ error: 'Cron misconfigured'}, { status: 503 })
  }

  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    logger.warn('Cron unauthorized: invalid or missing bearer token', {
      requestId: context?.requestId,
      route: context?.route,
    })
    return NextResponse.json({ error: 'Unauthorized'}, { status: 401 })
  }

  return null
}
