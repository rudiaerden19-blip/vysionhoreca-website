import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { enqueuePrintAgentJob, isCloudPrintEnabledForTenant } from '@/lib/print-agent-cloud/jobs'

const BodySchema = z.object({
  tenant: z.string().min(1),
  idempotencyKey: z.string().min(1).max(200),
  payload: z.record(z.unknown()),
  source: z.string().max(64).optional(),
})

export async function POST(request: NextRequest) {
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

  const { tenant, idempotencyKey, payload, source } = parsed.data
  const access = await verifyTenantOrSuperAdmin(request, tenant)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'Forbidden' }, { status: 403 })
  }

  const enabled = await isCloudPrintEnabledForTenant(tenant)
  if (!enabled && !access.isSuperAdmin) {
    return NextResponse.json({ ok: false, error: 'Cloud print niet actief voor deze tenant.' }, { status: 403 })
  }

  const result = await enqueuePrintAgentJob({
    tenantSlug: tenant,
    idempotencyKey,
    payload,
    source,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    created: result.created,
    job: {
      id: result.job.id,
      status: result.job.status,
      idempotency_key: result.job.idempotency_key,
    },
  })
}
