import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { settleRetailLoyaltyForSale } from '@/lib/retail-loyalty/server'

const SettleSchema = z.object({
  tenantSlug: z.string().min(1),
  memberId: z.string().uuid(),
  orderTotal: z.number().min(0),
  orderNumber: z.number().int().positive().optional(),
  redeemPoints: z.number().int().min(0).optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json'}, { status: 400 })
  }

  const parsed = SettleSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body'}, { status: 400 })
  }

  const { tenantSlug, memberId, orderTotal, orderNumber, redeemPoints } = parsed.data
  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden'}, { status: 403 })
  }

  const res = await settleRetailLoyaltyForSale(tenantSlug, memberId, orderTotal, {
    orderNumber,
    redeemPoints,
  })
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    redeemed: res.redeemed ?? 0,
    earned: res.earned ?? 0,
    balance: res.balance,
  })
}
