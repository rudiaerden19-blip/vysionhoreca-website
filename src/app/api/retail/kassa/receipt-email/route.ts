import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { sendRetailKassaReceiptEmail } from '@/lib/retail-kassa/send-receipt-email'

export const runtime = 'nodejs'
export const maxDuration = 60

const OrderSchema = z.object({
  orderNumber: z.number(),
  checkoutReference: z.string().optional(),
  items: z.array(z.any()),
  total: z.number(),
  vatSplit: z.array(z.any()).optional(),
  subtotalExclVat: z.number().optional(),
  totalTax: z.number().optional(),
  paymentMethod: z.enum(['CASH', 'CARD', 'IDEAL', 'BANCONTACT', 'SPLIT']),
  splitCash: z.number().optional(),
  splitCard: z.number().optional(),
  orderType: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']),
  tableNumber: z.string(),
  createdAt: z.union([z.string(), z.number(), z.date()]),
  helpedByStaffName: z.string().nullable().optional(),
  retailLoyalty: z
    .object({
      memberLabel: z.string().optional(),
      pointsEarned: z.number(),
      pointsRedeemed: z.number(),
      pointsBalance: z.number(),
    })
    .optional(),
  retailCustomerInvoice: z
    .object({
      name: z.string(),
      addressLine: z.string().optional(),
      postalCity: z.string().optional(),
      vatNumber: z.string(),
    })
    .optional(),
}).passthrough()

const BodySchema = z.object({
  tenantSlug: z.string().min(1),
  toEmail: z.string().email(),
  locale: z.string().min(2).max(5).optional(),
  order: OrderSchema,
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json'}, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body'}, { status: 400 })
  }

  const { tenantSlug, toEmail, locale, order: rawOrder } = parsed.data
  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden'}, { status: 403 })
  }

  const createdAt =
    rawOrder.createdAt instanceof Date
      ? rawOrder.createdAt
      : new Date(rawOrder.createdAt)

  const order = { ...rawOrder, createdAt }

  const res = await sendRetailKassaReceiptEmail({
    tenantSlug,
    toEmail,
    locale: locale || 'nl',
    order,
  })

  if (!res.ok) {
    const status = res.error === 'smtp_not_configured'? 400 : 502
    return NextResponse.json({ ok: false, error: res.error || 'send_failed'}, { status })
  }

  return NextResponse.json({ ok: true })
}
