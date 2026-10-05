import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { getShopCustomerByIdServer } from '@/lib/shop-customer-auth-server'
import { resolveShopCustomerIdFromRequest } from '@/lib/shop-customer-session'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

export async function POST(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ok: false, error: 'server_config' }, { status: 500 })
  }

  const customerId = await resolveShopCustomerIdFromRequest(request, tenantSlug)
  if (!customerId) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let body: { reward_id?: string; points_required?: number }
  try {
    body = (await request.json()) as typeof body
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const rewardId = body.reward_id?.trim()
  const pointsUsed = Number(body.points_required)
  if (!rewardId || !Number.isFinite(pointsUsed) || pointsUsed <= 0) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const customer = await getShopCustomerByIdServer(supabase, tenantSlug, customerId)
  if (!customer || (customer.loyalty_points ?? 0) < pointsUsed) {
    return NextResponse.json({ ok: false, error: 'insufficient_points' }, { status: 400 })
  }

  const { error: updateError } = await supabase
    .from('shop_customers')
    .update({ loyalty_points: customer.loyalty_points - pointsUsed })
    .eq('tenant_slug', tenantSlug)
    .eq('id', customerId)

  if (updateError) {
    return NextResponse.json({ ok: false, error: 'redeem_failed' }, { status: 500 })
  }

  const { error: redemptionError } = await supabase.from('loyalty_redemptions').insert({
    tenant_slug: tenantSlug,
    customer_id: customerId,
    reward_id: rewardId,
    points_used: pointsUsed,
  })

  if (redemptionError) {
    console.error('[shop-customer/redeem]', redemptionError)
    return NextResponse.json({ ok: false, error: 'redeem_failed' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    loyalty_points: customer.loyalty_points - pointsUsed,
  })
}
