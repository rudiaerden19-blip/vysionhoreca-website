import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { lookupRetailLoyaltyMemberByScan } from '@/lib/retail-loyalty/server'

export async function GET(req: NextRequest) {
  const tenantSlug = req.nextUrl.searchParams.get('tenant')?.trim() || ''
  const code = req.nextUrl.searchParams.get('code')?.trim() || ''
  if (!tenantSlug || !code) {
    return NextResponse.json({ ok: false, error: 'missing_params' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden' }, { status: 403 })
  }

  const member = await lookupRetailLoyaltyMemberByScan(tenantSlug, code)
  if (!member) {
    return NextResponse.json({ ok: false, member: null })
  }
  return NextResponse.json({ ok: true, member })
}
