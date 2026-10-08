import { NextRequest, NextResponse } from 'next/server'
import {
  readKlantschermPromoBundle,
  saveKlantschermAdminSettings,
} from '@/lib/klantscherm-promo-settings-server'
import type { KlantschermCustomPromo } from '@/lib/klantscherm-custom-promos'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

export const dynamic = 'force-dynamic'

type RouteContext = { params: { tenant: string } }

export async function GET(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error ?? 'unauthorized' }, { status: 403 })
  }

  const { settings, promos } = await readKlantschermPromoBundle(tenantSlug)

  return NextResponse.json({
    ok: true,
    settings: settings ?? null,
    customPromos: promos,
  })
}

export async function POST(request: NextRequest, context: RouteContext) {
  const tenantSlug = context.params.tenant?.trim()
  if (!tenantSlug) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) {
    return NextResponse.json({ ok: false, error: access.error ?? 'unauthorized' }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const result = await saveKlantschermAdminSettings(tenantSlug, {
    klantscherm_enabled:
      typeof body.klantscherm_enabled === 'boolean' ? body.klantscherm_enabled : undefined,
    klantscherm_slideshow_enabled:
      typeof body.klantscherm_slideshow_enabled === 'boolean'
        ? body.klantscherm_slideshow_enabled
        : undefined,
    klantscherm_custom_promos: Array.isArray(body.klantscherm_custom_promos)
      ? (body.klantscherm_custom_promos as KlantschermCustomPromo[])
      : undefined,
    klantscherm_bank_iban:
      body.klantscherm_bank_iban !== undefined ? (body.klantscherm_bank_iban as string | null) : undefined,
    klantscherm_bank_account_name:
      body.klantscherm_bank_account_name !== undefined
        ? (body.klantscherm_bank_account_name as string | null)
        : undefined,
  })

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
