import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { lookupRetailLoyaltyMemberByScan } from '@/lib/retail-loyalty/server'

/** Publieke winkelpas (telefoon): winkelnaam + barcode — geen auth (code is geheim genoeg als 899 + 9 cijfers). */
export async function GET(req: NextRequest) {
  const tenantSlug = req.nextUrl.searchParams.get('tenant')?.trim() || ''
  const code = req.nextUrl.searchParams.get('code')?.trim() || ''
  if (!tenantSlug || !code) {
    return NextResponse.json({ ok: false, error: 'missing_params'}, { status: 400 })
  }

  const member = await lookupRetailLoyaltyMemberByScan(tenantSlug, code)
  if (!member) {
    return NextResponse.json({ ok: false, error: 'not_found'}, { status: 404 })
  }

  const supabase = getServerSupabaseClient()
  let shopName = tenantSlug
  if (supabase) {
    const { data } = await supabase
      .from('tenant_settings')
      .select('business_name')
      .eq('tenant_slug', tenantSlug)
      .maybeSingle()
    if (data?.business_name?.trim()) shopName = data.business_name.trim()
  }

  return NextResponse.json({
    ok: true,
    shopName,
    pass: {
      card_code: member.card_code,
    },
  })
}
