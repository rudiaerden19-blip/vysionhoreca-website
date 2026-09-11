import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { isStripeOnlineCheckoutSecretConfigured } from '@/lib/webshop-online-payment'

/** Publiek: of deze tenant online webshop-betaling (Stripe) aankan. Geen keys in de response. */
export async function GET(request: NextRequest) {
  const tenant = (request.nextUrl.searchParams.get('tenant') || '').trim()
  if (!tenant) {
    return NextResponse.json({ ready: false }, { status: 400 })
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return NextResponse.json({ ready: false })
  }

  const { data } = await supabase
    .from('tenant_settings')
    .select('stripe_secret_key')
    .eq('tenant_slug', tenant)
    .maybeSingle()

  return NextResponse.json({
    ready: isStripeOnlineCheckoutSecretConfigured(
      (data as { stripe_secret_key?: string | null } | null)?.stripe_secret_key,
    ),
  })
}
