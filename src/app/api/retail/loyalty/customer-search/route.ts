import { NextRequest, NextResponse } from 'next/server'
import { searchRetailLoyaltyCustomers } from '@/lib/retail-loyalty/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

export async function GET(req: NextRequest) {
  const tenantSlug = req.nextUrl.searchParams.get('tenant')?.trim()
  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''

  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'missing_tenant'}, { status: 400 })
  }
  if (q.length < 2) {
    return NextResponse.json({ ok: true, results: [] })
  }

  const access = await verifyTenantOrSuperAdmin(req, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden'}, { status: 403 })
  }

  const res = await searchRetailLoyaltyCustomers(tenantSlug, q)
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error || 'search_failed'}, { status: 500 })
  }

  return NextResponse.json({ ok: true, results: res.results })
}
