import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { createRetailLoyaltyMember, updateRetailLoyaltyMember } from '@/lib/retail-loyalty/server'

const CreateSchema = z.object({
  tenantSlug: z.string().min(1),
  display_name: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
})

const PatchSchema = z.object({
  tenantSlug: z.string().min(1),
  memberId: z.string().uuid(),
  display_name: z.string().max(120).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  is_active: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  const { tenantSlug, display_name, phone } = parsed.data
  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden' }, { status: 403 })
  }

  const res = await createRetailLoyaltyMember(tenantSlug, { display_name, phone })
  if (!res.ok || !res.member) {
    return NextResponse.json({ ok: false, error: res.error || 'create_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, member: res.member })
}

export async function PATCH(req: NextRequest) {
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

  const { tenantSlug, memberId, display_name, phone, is_active } = parsed.data
  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden' }, { status: 403 })
  }

  const res = await updateRetailLoyaltyMember(tenantSlug, memberId, {
    display_name,
    phone,
    is_active,
  })
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error || 'update_failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
