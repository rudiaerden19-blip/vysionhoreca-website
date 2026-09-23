import { NextRequest, NextResponse } from 'next/server'
import { loadAccountingSettings } from '@/lib/cashbook-accounting'
import { buildBoekhoudingCsv, renderCashbookPdf, type CashbookExportMeta } from '@/lib/cashbook-export'
import { loadCashbookRange, logCashbookEvent } from '@/lib/cashbook-store'
import { requireCronSecret } from '@/lib/cron-auth'
import { getBelgiumDateString } from '@/lib/belgium-date-bounds'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { resolveZohoEmail } from '@/lib/vysion-contact'
import { assertZohoSmtpConfigured, createZohoMailTransport } from '@/lib/zoho-smtp'

function previousMonth(today: string): { from: string; to: string; key: string } {
  const [y, m] = today.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 2, 1))
  const last = new Date(Date.UTC(y, m - 1, 0))
  const from = first.toISOString().slice(0, 10)
  const to = last.toISOString().slice(0, 10)
  return { from, to, key: from.slice(0, 7) }
}

export async function GET(request: NextRequest) {
  const denied = requireCronSecret(request, { route: '/api/cron/cashbook-month-export' })
  if (denied) return denied
  const smtpError = assertZohoSmtpConfigured()
  if (smtpError) return NextResponse.json({ skipped: smtpError })
  const client = getServerSupabaseClient()
  if (!client) return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })

  const today = getBelgiumDateString()
  const dayOfMonth = Number(today.slice(8, 10))
  const { data, error } = await client.from('accounting_settings').select('tenant_slug, accountant_email, auto_export, auto_export_day').eq('auto_export', true)
  if (error) return NextResponse.json({ skipped: 'accounting_settings ontbreekt of is niet leesbaar.' })

  const period = previousMonth(today)
  let sent = 0
  for (const row of data || []) {
    const tenantSlug = String((row as { tenant_slug: string }).tenant_slug)
    const email = String((row as { accountant_email?: string }).accountant_email || '')
    const exportDay = Number((row as { auto_export_day?: number }).auto_export_day) || 1
    if (dayOfMonth !== exportDay || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue
    const claimed = await client.from('accounting_export_runs').insert({ tenant_slug: tenantSlug, period: period.key }).select('id').maybeSingle()
    if (claimed.error || !claimed.data) continue
    try {
      const settings = await loadAccountingSettings(client, tenantSlug)
      if (!settings.autoExport) continue
      const [rows, profile] = await Promise.all([
        loadCashbookRange(client, tenantSlug, period.from, period.to),
        client.from('tenant_settings').select('business_name, btw_number, address, postal_code, city').eq('tenant_slug', tenantSlug).maybeSingle(),
      ])
      const business = profile.data as { business_name?: string; btw_number?: string; address?: string; postal_code?: string; city?: string } | null
      const meta: CashbookExportMeta = {
        businessName: business?.business_name || tenantSlug,
        btwNumber: business?.btw_number || '',
        address: [business?.address, business?.postal_code, business?.city].filter(Boolean).join(', '),
        periodLabel: `${period.from} – ${period.to}`,
      }
      const pdf = await renderCashbookPdf(meta, rows)
      const csv = buildBoekhoudingCsv(meta, rows)
      await createZohoMailTransport().sendMail({
        from: `"Vysion" <${resolveZohoEmail()}>`,
        to: email,
        subject: `Vysion kasboek ${period.key}`,
        text: `Automatische maandexport ${meta.businessName} voor ${period.key}.`,
        attachments: [
          { filename: `Vysion-Kasboek-${period.key}.pdf`, content: pdf },
          { filename: `Vysion-Boekhouding-${period.key}.csv`, content: csv },
        ],
      })
      await logCashbookEvent(client, tenantSlug, 'cron', period.from, 'report_emailed', { to: email, period: period.key, automatic: true })
      sent += 1
    } catch {
      await client.from('accounting_export_runs').delete().eq('tenant_slug', tenantSlug).eq('period', period.key)
    }
  }
  return NextResponse.json({ ok: true, sent })
}
