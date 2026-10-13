import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ackPrintAgentJob, resolvePrintAgentDeviceFromToken } from '@/lib/print-agent-cloud/jobs'
import { extractBearerToken } from '@/lib/print-agent-cloud/token'
import { checkRateLimit, printAgentWorkerRateLimiter } from '@/lib/rate-limit'

const BodySchema = z.object({
  jobId: z.string().uuid(),
  processingToken: z.string().uuid(),
  status: z.enum(['printed', 'failed']),
  errorMessage: z.string().max(2000).optional(),
})

export async function POST(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('authorization'))
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Authorization Bearer ontbreekt.' }, { status: 401 })
  }

  const device = await resolvePrintAgentDeviceFromToken(token)
  if (!device.ok) {
    return NextResponse.json({ ok: false, error: device.error }, { status: 401 })
  }

  const rl = await checkRateLimit(printAgentWorkerRateLimiter, `print-ack:${device.deviceId}`)
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: 'Te veel ack-verzoeken.' }, { status: 429 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid body' }, { status: 400 })
  }

  const result = await ackPrintAgentJob({
    tenantSlug: device.tenantSlug,
    jobId: parsed.data.jobId,
    processingToken: parsed.data.processingToken,
    status: parsed.data.status,
    errorMessage: parsed.data.errorMessage,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 409 })
  }

  return NextResponse.json({ ok: true })
}
