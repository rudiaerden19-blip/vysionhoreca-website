import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { resolveZohoEmail } from '@/lib/vysion-contact'
import { assertZohoSmtpConfigured, createZohoMailTransport } from '@/lib/zoho-smtp'
import { trackError } from '@/lib/monitoring'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { apiRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { buildZReportEmailHtml, parseZReportEmailAmounts } from '@/lib/z-report-email-html'

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const body = await request.json()
    const {
      to,
      subject,
      tenantSlug,
      businessName,
      businessAddress,
      btwNumber,
      formattedDate,
      orderCount,
      articleLines: rawArticleLines,
      soldArticlesSectionTitle,
      soldArticlesPiecesShort,
      labels: rawLabels,
    } = body

    if (!to) {
      return NextResponse.json({ error: 'E-mailadres is verplicht' }, { status: 400 })
    }
    if (!tenantSlug || typeof tenantSlug !== 'string') {
      return NextResponse.json({ error: 'tenantSlug is verplicht' }, { status: 400 })
    }

    const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
    if (!access.authorized) {
      const st = access.error?.includes('ingelogd') ? 401 : 403
      logger.warn('send-z-report: unauthorized', { requestId, tenantSlug })
      return NextResponse.json({ error: access.error || 'Geen toegang' }, { status: st })
    }

    const ip = getClientIP(request)
    const rl = await checkRateLimit(apiRateLimiter, `z-report:${tenantSlug}:${ip}`)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Te veel verzoeken. Probeer over enkele seconden opnieuw.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      )
    }

    const smtpConfigError = assertZohoSmtpConfigured()
    if (smtpConfigError) {
      return NextResponse.json({ error: smtpConfigError }, { status: 503 })
    }
    const transporter = createZohoMailTransport()

    const amounts = parseZReportEmailAmounts(body as Record<string, unknown>)
    const labelsIn = rawLabels && typeof rawLabels === 'object' ? (rawLabels as Record<string, unknown>) : {}
    const label = (key: string, fallback: string) =>
      typeof labelsIn[key] === 'string' ? String(labelsIn[key]).trim().slice(0, 120) : fallback

    const htmlContent = buildZReportEmailHtml({
      businessName: businessName || tenantSlug,
      businessAddress: businessAddress || '',
      btwNumber: btwNumber || '',
      formattedDate: formattedDate || '',
      orderCount: typeof orderCount === 'number' ? orderCount : 0,
      subtotal: amounts.subtotal,
      taxLow: amounts.taxLow,
      taxMid: amounts.taxMid,
      taxHigh: amounts.taxHigh,
      total: amounts.total,
      cashPayments: amounts.cashPayments,
      cardPayments: amounts.cardPayments,
      onlinePayments: amounts.onlinePayments,
      articleLines: rawArticleLines,
      soldArticlesSectionTitle,
      soldArticlesPiecesShort,
      labels: {
        revenue: label('revenue', 'OMZET'),
        orderCount: label('orderCount', 'Aantal transacties'),
        subtotal: label('subtotal', 'Subtotaal (excl. BTW)'),
        vat: label('vat', 'BTW'),
        vatMidRates: label('vatMidRates', '9% / 12%'),
        total: label('total', 'TOTAAL'),
        payments: label('payments', 'BETALINGEN'),
        cash: label('cash', 'Contant'),
        card: label('card', 'PIN/Kaart'),
        online: label('online', 'Online'),
        footerAuto: label('footerAuto', 'Dit is een automatisch gegenereerd Z-Rapport'),
        footerGenerated: label('footerGenerated', 'Gegenereerd op:'),
        footerPowered: label('footerPowered', "Powered by Vysion kassa's"),
      },
      generatedAtNl: new Date().toLocaleString('nl-NL'),
    })

    await transporter.sendMail({
      from: `"${businessName || "Vysion kassa's"}" <${resolveZohoEmail()}>`,
      to: to,
      subject: subject || `Z-Rapport - ${businessName}`,
      html: htmlContent,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('send-z-report error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    trackError(error, { requestId, route: '/api/send-z-report' })
    return NextResponse.json(
      { error: 'Fout bij versturen e-mail', message: error instanceof Error ? error.message : 'Onbekende fout' },
      { status: 500 },
    )
  }
}
