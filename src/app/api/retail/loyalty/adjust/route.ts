import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { adjustRetailLoyaltyMemberPoints } from '@/lib/retail-loyalty/server'

const AdjustSchema = z.object({
  tenantSlug: z.string().min(1),
  memberId: z.string().uuid(),
  pointsDelta: z.number().int().refine((n) => n !== 0, { message: 'nonzero' }),
  note: z.string().max(240).optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const parsed = AdjustSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  const { tenantSlug, memberId, pointsDelta, note } = parsed.data
  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden' }, { status: 403 })
  }

  const res = await adjustRetailLoyaltyMemberPoints(tenantSlug, memberId, pointsDelta, note)
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true, balance: res.balance })
}
