import { NextRequest, NextResponse } from 'next/server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

/**
 * Harde servercheck: zelfde regels als andere admin-API’s (`verifyTenantOrSuperAdmin`).
 * Admin-layout wacht hierop voordat `vysion_tenant` als geldig wordt beschouwd — voorkomt
 * “UI ok maar POST 403” (verouderde business_id / e-mail in localStorage, o.a. iPad).
 */
export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }
  const tenant =
    typeof body === 'object' &&
    body !== null &&
    'tenant' in body &&
    typeof (body as { tenant: unknown }).tenant === 'string'
      ? (body as { tenant: string }).tenant.trim()
      : ''
  if (!tenant) {
    return NextResponse.json({ ok: false, error: 'Missing tenant' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(request, tenant)
  if (!access.authorized) {
    return NextResponse.json(
      { ok: false, error: access.error || 'Forbidden' },
      { status: 403 }
    )
  }

  return NextResponse.json({
    ok: true,
    isSuperAdmin: access.isSuperAdmin === true,
  })
}
