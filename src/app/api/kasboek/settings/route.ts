import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  ACCOUNTING_EXPORT_FORMATS,
  ACCOUNTING_PACKAGES,
  loadAccountingSettings,
  saveAccountingSettings,
} from '@/lib/cashbook-accounting'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

export async function GET(request: NextRequest) {
  const tenantSlug = request.nextUrl.searchParams.get('tenantSlug') || ''
  if (!tenantSlug) return NextResponse.json({ error: 'Zaak ontbreekt.' }, { status: 400 })
  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
  const client = getServerSupabaseClient()
  if (!client) return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
  return NextResponse.json(await loadAccountingSettings(client, tenantSlug))
}

const SaveSchema = z.object({
  tenantSlug: z.string().min(1),
  accountantName: z.string().max(160).optional().default(''),
  accountantEmail: z.string().max(160).optional().default(''),
  packageName: z.enum(ACCOUNTING_PACKAGES),
  clientReference: z.string().max(160).optional().default(''),
  exportFormat: z.enum(ACCOUNTING_EXPORT_FORMATS),
  autoExport: z.boolean(),
  autoExportDay: z.number().int().min(1).max(28),
})

export async function POST(request: NextRequest) {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }
  const parsed = SaveSchema.safeParse(raw)
  if (!parsed.success) return NextResponse.json({ error: 'Ongeldige aanvraag' }, { status: 400 })
  const access = await verifyTenantOrSuperAdmin(request, parsed.data.tenantSlug)
  if (!access.authorized) return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
  const client = getServerSupabaseClient()
  if (!client) return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
  const result = await saveAccountingSettings(client, parsed.data.tenantSlug, parsed.data)
  return NextResponse.json(result.ok ? { ok: true } : { error: result.error }, { status: result.ok ? 200 : result.status })
}
