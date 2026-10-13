import { NextRequest, NextResponse } from 'next/server'
import {
  claimNextPrintAgentJob,
  isCloudPrintEnabledForTenant,
  resolvePrintAgentDeviceFromToken,
} from '@/lib/print-agent-cloud/jobs'
import { extractBearerToken } from '@/lib/print-agent-cloud/token'
import { checkRateLimit, printAgentWorkerRateLimiter } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  const token = extractBearerToken(request.headers.get('authorization'))
  if (!token) {
    return NextResponse.json({ ok: false, error: 'Authorization Bearer ontbreekt.' }, { status: 401 })
  }

  const device = await resolvePrintAgentDeviceFromToken(token)
  if (!device.ok) {
    return NextResponse.json({ ok: false, error: device.error }, { status: 401 })
  }

  const rl = await checkRateLimit(printAgentWorkerRateLimiter, `print-claim:${device.deviceId}`)
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: 'Te veel claim-verzoeken.' }, { status: 429 })
  }

  const enabled = await isCloudPrintEnabledForTenant(device.tenantSlug)
  if (!enabled) {
    return NextResponse.json({ ok: false, error: 'Cloud print uit voor deze tenant.' }, { status: 403 })
  }

  const claimed = await claimNextPrintAgentJob(device.tenantSlug)
  if (!claimed.ok) {
    return NextResponse.json({ ok: false, error: claimed.error }, { status: 500 })
  }

  if (!claimed.job) {
    return NextResponse.json({ ok: true, job: null })
  }

  if (claimed.job.tenant_slug !== device.tenantSlug) {
    return NextResponse.json({ ok: false, error: 'Tenant mismatch.' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    job: {
      id: claimed.job.id,
      tenant_slug: claimed.job.tenant_slug,
      payload: claimed.job.payload,
      processing_token: claimed.job.processing_token,
      idempotency_key: claimed.job.idempotency_key,
    },
  })
}
