import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import {
  getRetailLoyaltySettings,
  upsertRetailLoyaltySettings,
} from '@/lib/retail-loyalty/server'

export async function GET(req: NextRequest) {
  const tenantSlug = req.nextUrl.searchParams.get('tenant')?.trim() || ''
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'missing_tenant' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden' }, { status: 403 })
  }

  const settings = await getRetailLoyaltySettings(tenantSlug)
  return NextResponse.json({ ok: true, settings })
}

const PatchSchema = z.object({
  tenantSlug: z.string().min(1),
  enabled: z.boolean().optional(),
  points_per_euro: z.number().min(0).max(1000).optional(),
  min_order_total_for_points: z.number().min(0).max(1_000_000).optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  const { tenantSlug, ...patch } = parsed.data
  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden' }, { status: 403 })
  }

  const res = await upsertRetailLoyaltySettings(tenantSlug, patch)
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 500 })
  }

  const settings = await getRetailLoyaltySettings(tenantSlug)
  return NextResponse.json({ ok: true, settings })
}
