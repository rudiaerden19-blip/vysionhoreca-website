import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { earnRetailLoyaltyPointsForSale } from '@/lib/retail-loyalty/server'

const EarnSchema = z.object({
  tenantSlug: z.string().min(1),
  memberId: z.string().uuid(),
  orderTotal: z.number().min(0),
  orderNumber: z.number().int().positive().optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json'}, { status: 400 })
  }

  const parsed = EarnSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body'}, { status: 400 })
  }

  const { tenantSlug, memberId, orderTotal, orderNumber } = parsed.data
  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden'}, { status: 403 })
  }

  const res = await earnRetailLoyaltyPointsForSale(tenantSlug, memberId, orderTotal, orderNumber)
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    points: res.points ?? 0,
    balance: res.balance,
  })
}
