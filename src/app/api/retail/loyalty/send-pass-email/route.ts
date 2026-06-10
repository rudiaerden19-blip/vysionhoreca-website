import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { sendRetailLoyaltyPassEmail } from '@/lib/retail-loyalty/send-pass-email'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

const BodySchema = z.object({
  tenantSlug: z.string().min(1),
  memberId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 })
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 })
  }

  const { tenantSlug, memberId } = parsed.data
  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden' }, { status: 403 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'db_unavailable' }, { status: 503 })
  }

  const { data: member, error } = await supabase
    .from('retail_loyalty_members')
    .select('id, card_code, display_name, email, shop_customer_id, is_active')
    .eq('tenant_slug', tenantSlug)
    .eq('id', memberId)
    .maybeSingle()

  if (error || !member || !member.is_active) {
    return NextResponse.json({ ok: false, error: 'member_not_found' }, { status: 404 })
  }

  let toEmail = member.email?.trim().toLowerCase() || ''
  if (!toEmail && member.shop_customer_id) {
    const { data: cust } = await supabase
      .from('shop_customers')
      .select('email')
      .eq('tenant_slug', tenantSlug)
      .eq('id', member.shop_customer_id)
      .maybeSingle()
    toEmail = cust?.email?.trim().toLowerCase() || ''
  }

  if (!toEmail || !toEmail.includes('@')) {
    return NextResponse.json({ ok: false, error: 'member_no_email' }, { status: 400 })
  }

  const mail = await sendRetailLoyaltyPassEmail({
    supabase,
    tenantSlug,
    toEmail,
    cardCode: member.card_code,
    displayName: member.display_name,
    origin: req.nextUrl.origin,
  })

  if (!mail.ok) {
    const status = mail.error === 'smtp_not_configured' ? 400 : 502
    return NextResponse.json({ ok: false, error: mail.error || 'send_failed' }, { status })
  }

  return NextResponse.json({ ok: true })
}
