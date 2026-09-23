import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import {
  buildBoekhoudingCsv,
  buildCashbookCsv,
  renderCashbookPdf,
  renderCashbookXlsx,
  type CashbookExportMeta,
} from '@/lib/cashbook-export'
import { loadCashbookRange, logCashbookEvent } from '@/lib/cashbook-store'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

export async function GET(request: NextRequest) {
  const tenantSlug = request.nextUrl.searchParams.get('tenantSlug') || ''
  const from = request.nextUrl.searchParams.get('from') || ''
  const to = request.nextUrl.searchParams.get('to') || ''
  const format = request.nextUrl.searchParams.get('format') || 'csv'
  if (!tenantSlug || !DateSchema.safeParse(from).success || !DateSchema.safeParse(to).success || from > to) {
    return NextResponse.json({ error: 'Periode ontbreekt.' }, { status: 400 })
  }
  if (!['csv', 'pdf', 'xlsx', 'boekhouding'].includes(format)) {
    return NextResponse.json({ error: 'Onbekend exportformaat.' }, { status: 400 })
  }
  const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
  if (!access.authorized) return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
  const client = getServerSupabaseClient()
  if (!client) return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })

  const [rows, settingsRes] = await Promise.all([
    loadCashbookRange(client, tenantSlug, from, to, { withVat: true }),
    client.from('tenant_settings').select('business_name, btw_number, address, postal_code, city').eq('tenant_slug', tenantSlug).maybeSingle(),
  ])
  const settings = settingsRes.data as { business_name?: string; btw_number?: string; address?: string; postal_code?: string; city?: string } | null
  const meta: CashbookExportMeta = {
    businessName: settings?.business_name || tenantSlug,
    btwNumber: settings?.btw_number || '',
    address: [settings?.address, settings?.postal_code, settings?.city].filter(Boolean).join(', '),
    periodLabel: from === to ? from : `${from} – ${to}`,
  }
  const actor = access.businessId || request.headers.get('x-auth-email') || 'owner'
  await logCashbookEvent(client, tenantSlug, actor, from, 'report_exported', { format, from, to })

  const filename = `vysion-kasboek-${from}-${to}`
  if (format === 'pdf') {
    const pdf = await renderCashbookPdf(meta, rows)
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}.pdf"`,
      },
    })
  }
  if (format === 'xlsx') {
    const book = renderCashbookXlsx(meta, rows)
    return new NextResponse(new Uint8Array(book), {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
      },
    })
  }
  const csv = format === 'boekhouding' ? buildBoekhoudingCsv(meta, rows) : buildCashbookCsv(meta, rows)
  const name = format === 'boekhouding' ? `vysion-boekhouding-${from}-${to}.csv` : `${filename}.csv`
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${name}"`,
    },
  })
}
