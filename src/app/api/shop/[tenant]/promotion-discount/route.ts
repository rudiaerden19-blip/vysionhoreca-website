import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import {
  calculateAutomaticPromotionDiscount,
  type WebshopCartLineForPromo,
} from '@/lib/webshop-promotion-discount'
import { tenantSlugQueryVariants } from '@/lib/tenant-slug-variants'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

export async function POST(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ error: 'tenant required' }, { status: 400 })
  }

  let cart: WebshopCartLineForPromo[] = []
  try {
    const body = (await request.json()) as { cart?: WebshopCartLineForPromo[] }
    cart = Array.isArray(body.cart) ? body.cart : []
  } catch {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 })
  }

  const subtotal = cart.reduce((s, line) => s + line.totalPrice * line.quantity, 0)
  if (subtotal <= 0 || cart.length === 0) {
    return NextResponse.json({ discount: 0, promoCount: 0 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ discount: 0, promoCount: 0 })
  }

  const slugVariants = tenantSlugQueryVariants(tenantSlug)
  let promotionsEnabled = true
  for (const slug of slugVariants) {
    const { data: settings } = await supabase
      .from('tenant_settings')
      .select('promotions_enabled')
      .eq('tenant_slug', slug)
      .maybeSingle()
    if (settings) {
      promotionsEnabled = settings.promotions_enabled !== false
      break
    }
  }

  if (!promotionsEnabled) {
    return NextResponse.json({ discount: 0, promoCount: 0 })
  }

  const { data: promos, error } = await supabase
    .from('promotions')
    .select('*')
    .in('tenant_slug', slugVariants)
    .eq('is_active', true)

  if (error) {
    console.error('[promotion-discount]', tenantSlug, error.message)
    return NextResponse.json({ discount: 0, promoCount: 0 })
  }

  const discount = calculateAutomaticPromotionDiscount(
    cart,
    promos ?? [],
    subtotal,
    tenantSlug,
  )

  return NextResponse.json({
    discount,
    promoCount: promos?.length ?? 0,
  })
}
