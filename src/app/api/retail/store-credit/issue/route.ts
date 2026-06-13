import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { issueRetailStoreCredit } from '@/lib/retail-store-credit/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { regenerateZReportForDate } from '@/lib/admin-api-order-operations'
import { getBelgiumDateString } from '@/lib/belgium-date-bounds'

const IssueSchema = z.object({
  tenantSlug: z.string().min(1),
  sourceOrderNumber: z.number().int().positive(),
  returnLines: z.array(
    z.object({
      lineKey: z.string().min(1),
      quantity: z.number().int().positive(),
    }),
  ),
  kassaStaffId: z.string().uuid().nullable().optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json'}, { status: 400 })
  }

  const parsed = IssueSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body'}, { status: 400 })
  }

  const { tenantSlug, sourceOrderNumber, returnLines, kassaStaffId } = parsed.data
  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden'}, { status: 403 })
  }

  const res = await issueRetailStoreCredit(tenantSlug, sourceOrderNumber, returnLines, {
    kassaStaffId: kassaStaffId ?? null,
  })

  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (supabase) {
    const date = getBelgiumDateString()
    await regenerateZReportForDate(supabase, tenantSlug, date).catch(() => undefined)
  }

  return NextResponse.json({
    ok: true,
    credit: res.credit,
    creditNoteOrderNumber: res.creditNoteOrderNumber,
  })
}
