import { NextRequest, NextResponse } from 'next/server'
import { lookupRetailLoyaltyMemberByScan } from '@/lib/retail-loyalty/server'

/** Publieke winkelpas (telefoon): alleen naam + punten + code — geen auth (code is geheim genoeg als 899 + 9 cijfers). */
export async function GET(req: NextRequest) {
  const tenantSlug = req.nextUrl.searchParams.get('tenant')?.trim() || ''
  const code = req.nextUrl.searchParams.get('code')?.trim() || ''
  if (!tenantSlug || !code) {
    return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 })
  }

  const member = await lookupRetailLoyaltyMemberByScan(tenantSlug, code)
  if (!member) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json({
    ok: true,
    pass: {
      card_code: member.card_code,
      display_name: member.display_name,
      points_balance: member.points_balance,
    },
  })
}
