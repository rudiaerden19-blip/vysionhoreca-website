import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { redeemRetailStoreCredit } from '@/lib/retail-store-credit/server'

const RedeemSchema = z.object({
  tenantSlug: z.string().min(1),
  creditId: z.string().uuid(),
  amount: z.number().positive(),
  orderId: z.string().uuid(),
  orderNumber: z.number().int().positive(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json'}, { status: 400 })
  }

  const parsed = RedeemSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body'}, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(req, parsed.data.tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden'}, { status: 403 })
  }

  const res = await redeemRetailStoreCredit(
    parsed.data.tenantSlug,
    parsed.data.creditId,
    parsed.data.amount,
    parsed.data.orderId,
    parsed.data.orderNumber,
  )

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 400 })
  }

  return NextResponse.json({ ok: true, remaining: res.remaining })
}
