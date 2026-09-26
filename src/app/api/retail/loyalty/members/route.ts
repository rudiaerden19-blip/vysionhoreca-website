import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import {
  createRetailLoyaltyMember,
  deleteRetailLoyaltyMember,
  listRetailLoyaltyCardHolders,
  updateRetailLoyaltyMember,
} from '@/lib/retail-loyalty/server'

export async function GET(req: NextRequest) {
  const tenantSlug = req.nextUrl.searchParams.get('tenant')?.trim()
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'missing_tenant' }, { status: 400 })
  }
  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden' }, { status: 403 })
  }
  const includeInactive = req.nextUrl.searchParams.get('includeInactive') === '1'
  const res = await listRetailLoyaltyCardHolders(tenantSlug, q, { includeInactive })
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error || 'list_failed' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, members: res.members })
}

const CreateSchema = z.object({
  tenantSlug: z.string().min(1),
  display_name: z.string().max(120).optional(),
  first_name: z.string().max(80).optional(),
  last_name: z.string().max(80).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().max(200).optional(),
  address: z.string().max(500).optional(),
  postal_code: z.string().max(20).optional(),
  city: z.string().max(255).optional(),
  btw_number: z.string().max(50).optional(),
  shop_customer_id: z.string().uuid().optional(),
  sendPassEmail: z.boolean().optional(),
  resendExistingPass: z.boolean().optional(),
})

const PatchSchema = z.object({
  tenantSlug: z.string().min(1),
  memberId: z.string().uuid(),
  display_name: z.string().max(120).nullable().optional(),
  first_name: z.string().max(80).nullable().optional(),
  last_name: z.string().max(80).nullable().optional(),
  phone: z.string().max(40).nullable().optional(),
  email: z.string().max(200).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  postal_code: z.string().max(20).nullable().optional(),
  city: z.string().max(255).nullable().optional(),
  btw_number: z.string().max(50).nullable().optional(),
  is_active: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json'}, { status: 400 })
  }

  const parsed = CreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body'}, { status: 400 })
  }

  const { tenantSlug, display_name, first_name, last_name, phone, email, address, postal_code, city, btw_number, shop_customer_id, sendPassEmail, resendExistingPass } =
    parsed.data
  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden'}, { status: 403 })
  }

  const origin =
    req.headers.get('x-forwarded-proto') && req.headers.get('x-forwarded-host')
      ? `${req.headers.get('x-forwarded-proto')}://${req.headers.get('x-forwarded-host')}`
      : req.nextUrl.origin

  const res = await createRetailLoyaltyMember(tenantSlug, {
    display_name,
    first_name,
    last_name,
    phone,
    email,
    address,
    postal_code,
    city,
    btw_number,
    shop_customer_id,
    sendPassEmail: sendPassEmail === true,
    emailOrigin: origin,
    resendExistingPass: resendExistingPass === true,
  })
  if (!res.ok || !res.member) {
    const status = res.error === 'email_has_active_pass'? 409 : 500
    return NextResponse.json({ ok: false, error: res.error || 'create_failed'}, { status })
  }

  return NextResponse.json({
    ok: true,
    member: res.member,
    emailSent: res.emailSent === true,
    warning: res.error,
  })
}

export async function PATCH(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json'}, { status: 400 })
  }

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body'}, { status: 400 })
  }

  const {
    tenantSlug,
    memberId,
    display_name,
    first_name,
    last_name,
    phone,
    email,
    address,
    postal_code,
    city,
    btw_number,
    is_active,
  } = parsed.data
  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden'}, { status: 403 })
  }

  const res = await updateRetailLoyaltyMember(tenantSlug, memberId, {
    display_name,
    first_name,
    last_name,
    phone,
    email,
    address,
    postal_code,
    city,
    btw_number,
    is_active,
  })
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error || 'update_failed'}, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

const DeleteSchema = z.object({
  tenantSlug: z.string().min(1),
  memberId: z.string().uuid(),
})

export async function DELETE(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json'}, { status: 400 })
  }

  const parsed = DeleteSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body'}, { status: 400 })
  }

  const { tenantSlug, memberId } = parsed.data
  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden'}, { status: 403 })
  }

  const res = await deleteRetailLoyaltyMember(tenantSlug, memberId)
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error || 'delete_failed'}, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
