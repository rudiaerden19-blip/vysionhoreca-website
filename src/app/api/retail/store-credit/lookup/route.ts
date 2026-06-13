import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { lookupRetailStoreCreditByCode } from '@/lib/retail-store-credit/server'

export async function GET(req: NextRequest) {
  const tenant = req.nextUrl.searchParams.get('tenant')?.trim()
  const code = req.nextUrl.searchParams.get('code')?.trim()

  if (!tenant || !code) {
    return NextResponse.json({ ok: false, error: 'missing_params'}, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(req, tenant)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden'}, { status: 403 })
  }

  const res = await lookupRetailStoreCreditByCode(tenant, code)
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 404 })
  }

  return NextResponse.json({ ok: true, credit: res.credit })
}
