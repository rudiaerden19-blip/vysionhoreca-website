import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { lookupRetailOrderForReturn } from '@/lib/retail-store-credit/server'

export async function GET(req: NextRequest) {
  const tenant = req.nextUrl.searchParams.get('tenant')?.trim()
  const numRaw = req.nextUrl.searchParams.get('orderNumber')?.trim()
  const orderNumber = numRaw ? parseInt(numRaw, 10) : NaN

  if (!tenant) {
    return NextResponse.json({ ok: false, error: 'missing_tenant' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(req, tenant)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error || 'forbidden' }, { status: 403 })
  }

  const res = await lookupRetailOrderForReturn(tenant, orderNumber)
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: res.error }, { status: 404 })
  }

  return NextResponse.json({ ok: true, lines: res.lines })
}
