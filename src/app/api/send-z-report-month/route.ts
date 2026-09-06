import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { resolveZohoEmail } from '@/lib/vysion-contact'
import { assertZohoSmtpConfigured, createZohoMailTransport } from '@/lib/zoho-smtp'
import { trackError } from '@/lib/monitoring'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { apiRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { buildZReportMonthEmailHtml, type ZReportMonthEmailLabels } from '@/lib/z-report-month-email-html'
import {
  parseZReportMonthSentLog,
  type ZReportMonthDayRow,
  type ZReportMonthSentLog,
} from '@/lib/z-report-month'
import type { ZReportAmounts } from '@/lib/z-report-document'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { CATEGORY_VAT_PERCENT_OPTIONS, type CategoryVatPercent } from '@/lib/order-vat'
import { buildZReportMonthFromSupabase } from '@/lib/z-report-month-server'

function coerceMoney(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN
  return Number.isFinite(n) ? n : 0
}

function sanitizeDayRows(raw: unknown): ZReportMonthDayRow[] {
  if (!Array.isArray(raw)) return []
  const out: ZReportMonthDayRow[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const date = typeof o.date === 'string' ? o.date.slice(0, 10) : ''
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue
    const taxByRate = { 6: 0, 9: 0, 12: 0, 21: 0 } as Record<CategoryVatPercent, number>
    const baseByRate = { 6: 0, 9: 0, 12: 0, 21: 0 } as Record<CategoryVatPercent, number>
    const taxRaw = o.taxByRate
    const baseRaw = o.baseByRate
    if (taxRaw && typeof taxRaw === 'object') {
      for (const rate of CATEGORY_VAT_PERCENT_OPTIONS) {
        taxByRate[rate] = coerceMoney((taxRaw as Record<string, unknown>)[rate])
      }
    }
    if (baseRaw && typeof baseRaw === 'object') {
      for (const rate of CATEGORY_VAT_PERCENT_OPTIONS) {
        baseByRate[rate] = coerceMoney((baseRaw as Record<string, unknown>)[rate])
      }
    }
    out.push({
      date,
      orderCount: Math.max(0, Math.floor(coerceMoney(o.orderCount))),
      subtotalExcl: coerceMoney(o.subtotalExcl),
      totalIncl: coerceMoney(o.totalIncl),
      taxByRate,
      baseByRate,
      cashPayments: coerceMoney(o.cashPayments),
      cardPayments: coerceMoney(o.cardPayments),
      onlinePayments: coerceMoney(o.onlinePayments),
    })
    if (out.length >= 62) break
  }
  return out
}

function sanitizeAmounts(raw: unknown): ZReportAmounts | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const taxByRate = { 6: 0, 9: 0, 12: 0, 21: 0 } as Record<CategoryVatPercent, number>
  const baseByRate = { 6: 0, 9: 0, 12: 0, 21: 0 } as Record<CategoryVatPercent, number>
  const taxRaw = o.taxByRate
  const baseRaw = o.baseByRate
  if (taxRaw && typeof taxRaw === 'object') {
    for (const rate of CATEGORY_VAT_PERCENT_OPTIONS) {
      taxByRate[rate] = coerceMoney((taxRaw as Record<string, unknown>)[rate])
    }
  }
  if (baseRaw && typeof baseRaw === 'object') {
    for (const rate of CATEGORY_VAT_PERCENT_OPTIONS) {
      baseByRate[rate] = coerceMoney((baseRaw as Record<string, unknown>)[rate])
    }
  }
  return {
    orderCount: Math.max(0, Math.floor(coerceMoney(o.orderCount))),
    subtotalExcl: coerceMoney(o.subtotalExcl),
    totalIncl: coerceMoney(o.totalIncl),
    taxByRate,
    baseByRate,
    cashPayments: coerceMoney(o.cashPayments),
    cardPayments: coerceMoney(o.cardPayments),
    onlinePayments: coerceMoney(o.onlinePayments),
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const body = await request.json()
    const {
      to,
      subject,
      tenantSlug,
      yearMonth,
      businessName,
      businessAddress,
      btwNumber,
      monthLabel,
      days: rawDays,
      amounts: rawAmounts,
      labels: rawLabels,
      saveAccountantEmail,
    } = body

    const email = typeof to === 'string' ? to.trim() : ''
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Geldig e-mailadres is verplicht' }, { status: 400 })
    }
    if (!tenantSlug || typeof tenantSlug !== 'string') {
      return NextResponse.json({ error: 'tenantSlug is verplicht' }, { status: 400 })
    }
    const ym = typeof yearMonth === 'string' ? yearMonth.trim() : ''
    if (!/^\d{4}-\d{2}$/.test(ym)) {
      return NextResponse.json({ error: 'yearMonth moet YYYY-MM zijn' }, { status: 400 })
    }

    const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
    if (!access.authorized) {
      const st = access.error?.includes('ingelogd') ? 401 : 403
      return NextResponse.json({ error: access.error || 'Geen toegang' }, { status: st })
    }

    const ip = getClientIP(request)
    const rl = await checkRateLimit(apiRateLimiter, `z-report-month:${tenantSlug}:${ip}`)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Te veel verzoeken. Probeer over enkele seconden opnieuw.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      )
    }

    const days = sanitizeDayRows(rawDays)
    const amounts = sanitizeAmounts(rawAmounts)

    const supabase = getServerSupabaseClient()
    let serverDays = days
    let serverAmounts = amounts

    if (supabase) {
      try {
        const rebuilt = await buildZReportMonthFromSupabase(supabase, tenantSlug, ym)
        if (rebuilt.days.length > 0 && rebuilt.amounts) {
          serverDays = rebuilt.days
          serverAmounts = rebuilt.amounts
        }
      } catch (rebuildErr) {
        logger.warn('send-z-report-month: server rebuild failed, using client payload', {
          requestId,
          tenantSlug,
          error: rebuildErr instanceof Error ? rebuildErr.message : String(rebuildErr),
        })
      }
    }

    if (!serverAmounts || serverDays.length === 0) {
      return NextResponse.json({ error: 'Geen omzet in deze maand om te versturen' }, { status: 400 })
    }

    const smtpConfigError = assertZohoSmtpConfigured()
    if (smtpConfigError) {
      return NextResponse.json({ error: smtpConfigError }, { status: 503 })
    }
    const transporter = createZohoMailTransport()

    const labelsIn =
      rawLabels && typeof rawLabels === 'object' ? (rawLabels as Record<string, unknown>) : {}
    const label = (key: string, fallback: string) =>
      typeof labelsIn[key] === 'string' ? String(labelsIn[key]).trim().slice(0, 160) : fallback

    const labels: ZReportMonthEmailLabels = {
      monthTitle: label('monthTitle', 'Z-Rapport maand'),
      monthSummary: label('monthSummary', 'Maandtotaal'),
      dailyOverview: label('dailyOverview', 'Dagelijks overzicht'),
      dateCol: label('dateCol', 'Datum'),
      orderCount: label('orderCount', 'Bestellingen'),
      vatTableTitle: label('vatTableTitle', 'BTW-overzicht'),
      vatRateCol: label('vatRateCol', 'Tarief'),
      vatBaseCol: label('vatBaseCol', 'Excl. BTW'),
      vatTaxCol: label('vatTaxCol', 'BTW'),
      vatTotalRow: label('vatTotalRow', 'Totaal'),
      total: label('total', 'TOTAAL INCL. BTW'),
      payments: label('payments', 'Betaalmethodes'),
      cash: label('cash', 'Contant'),
      card: label('card', 'Kaart/PIN'),
      online: label('online', 'Online'),
      dayTotalCol: label('dayTotalCol', 'Totaal incl.'),
      fiscalNote: label('fiscalNote', 'Fiscale periode per dag: volgens openingsuren van de zaak'),
      footerAuto: label('footerAuto', 'Automatisch maandoverzicht Z-Rapport'),
      footerGenerated: label('footerGenerated', 'Gegenereerd op:'),
      footerPowered: label('footerPowered', "Vysion kassa's - ordervysion.com"),
    }

    const htmlContent = buildZReportMonthEmailHtml({
      businessName: businessName || tenantSlug,
      businessAddress: businessAddress || '',
      btwNumber: btwNumber || '',
      monthLabel: monthLabel || ym,
      amounts: serverAmounts,
      days: serverDays,
      labels,
      generatedAtNl: new Date().toLocaleString('nl-NL'),
    })

    await transporter.sendMail({
      from: `"${businessName || "Vysion kassa's"}" <${resolveZohoEmail()}>`,
      to: email,
      subject: subject || `Z-Rapport ${monthLabel || ym} - ${businessName || tenantSlug}`,
      html: htmlContent,
    })

    if (supabase) {
      const { data: settings } = await supabase
        .from('tenant_settings')
        .select('z_report_month_sent, accountant_email')
        .eq('tenant_slug', tenantSlug)
        .maybeSingle()

      const prevLog = parseZReportMonthSentLog(settings?.z_report_month_sent)
      const sentAt = new Date().toISOString()
      const nextLog: ZReportMonthSentLog = { ...prevLog, [ym]: { sentAt, to: email } }

      const updatePayload: Record<string, unknown> = { z_report_month_sent: nextLog }
      if (saveAccountantEmail && email) {
        updatePayload.accountant_email = email
      }

      await supabase.from('tenant_settings').update(updatePayload).eq('tenant_slug', tenantSlug)
    }

    return NextResponse.json({ success: true, sentAt: new Date().toISOString() })
  } catch (error) {
    logger.error('send-z-report-month error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    trackError(error, { requestId, route: '/api/send-z-report-month' })
    return NextResponse.json(
      {
        error: 'Fout bij versturen maandmail',
        message: error instanceof Error ? error.message : 'Onbekende fout',
      },
      { status: 500 },
    )
  }
}
