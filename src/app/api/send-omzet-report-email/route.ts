import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

import { logger } from '@/lib/logger'
import { trackError } from '@/lib/monitoring'
import { buildOmzetReportEmailHtml } from '@/lib/report-omzet-email-html'
import { apiRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'

type ExportPeriodJson = 'day' | 'week' | 'month' | 'year'

const EXPORT_PERIODS = new Set<string>(['day', 'week', 'month', 'year'])

function normalizeEmail(s: string) {
  return s.trim().toLowerCase()
}

function isFin(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n)
}

function cleanAddressLines(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const out: string[] = []
  for (const item of raw) {
    if (typeof item !== 'string') continue
    const t = item.trim().slice(0, 500)
    if (t) out.push(t)
    if (out.length >= 8) break
  }
  return out
}

/** Simpele RFC-achtige check (geen open relay). */
function looksLikeEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim())
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const body = (await request.json()) as Record<string, unknown>
    const tenantSlug = typeof body.tenantSlug === 'string' ? body.tenantSlug.trim() : ''
    const to = typeof body.to === 'string' ? body.to.trim() : ''
    const exportPeriod =
      typeof body.exportPeriod === 'string' ? (body.exportPeriod as ExportPeriodJson) : ''

    const businessName = typeof body.businessName === 'string' ? body.businessName.trim() : ''
    const btwNumber =
      typeof body.btwNumber === 'string' && body.btwNumber.trim() !== ''
        ? body.btwNumber.trim().slice(0, 120)
        : ''
    const periodLabel =
      typeof body.periodLabel === 'string' && body.periodLabel.trim() !== ''
        ? body.periodLabel.trim().slice(0, 80)
        : exportPeriod || 'Periode'

    const addressBlockLines = cleanAddressLines(body.addressBlockLines)

    if (!tenantSlug || !to || !looksLikeEmail(to)) {
      return NextResponse.json({ error: 'Geldig e-mailadres is verplicht' }, { status: 400 })
    }
    if (!EXPORT_PERIODS.has(exportPeriod)) {
      return NextResponse.json({ error: 'exportPeriod ongeldig' }, { status: 400 })
    }
    if (!businessName) {
      return NextResponse.json({ error: 'businessName ontbreekt' }, { status: 400 })
    }

    const totalRev = body.totalRev
    const orderCount = body.orderCount
    const cash = body.cash
    const card = body.card
    const subtotalExcl = body.subtotalExcl
    const taxLow = body.taxLow
    const taxMid = body.taxMid
    const taxHigh = body.taxHigh
    const totalTax = body.totalTax

    if (
      !isFin(totalRev) ||
      !isFin(orderCount) ||
      !isFin(cash) ||
      !isFin(card) ||
      !isFin(subtotalExcl) ||
      !isFin(taxLow) ||
      !isFin(taxMid) ||
      !isFin(taxHigh) ||
      !isFin(totalTax)
    ) {
      return NextResponse.json({ error: 'Ongeldige rapportcijfers' }, { status: 400 })
    }
    if (orderCount < 0 || orderCount > 1_000_000) {
      return NextResponse.json({ error: 'Ongeldig aantal bestellingen' }, { status: 400 })
    }

    const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
    if (!access.authorized) {
      const st = access.error?.includes('ingelogd') ? 401 : 403
      logger.warn('send-omzet-report-email: unauthorized', { requestId, tenantSlug })
      return NextResponse.json({ error: access.error || 'Geen toegang' }, { status: st })
    }

    if (!access.isSuperAdmin) {
      const supabase = getServerSupabaseClient()
      if (!supabase) {
        return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })
      }
      const bid = access.businessId
      if (!bid) {
        return NextResponse.json({ error: 'Geen toegang' }, { status: 403 })
      }
      const { data: profile } = await supabase
        .from('business_profiles')
        .select('email')
        .eq('id', bid)
        .maybeSingle()
      const ownerEmail = normalizeEmail((profile?.email as string | undefined) || '')
      if (!ownerEmail || ownerEmail !== normalizeEmail(to)) {
        return NextResponse.json(
          { error: 'Je kunt dit rapport alleen naar je eigen account-e-mailadres sturen.' },
          { status: 403 },
        )
      }
    }

    const ip = getClientIP(request)
    const rl = await checkRateLimit(apiRateLimiter, `omzet-report-email:${tenantSlug}:${ip}`)
    if (!rl.success) {
      return NextResponse.json(
        { error: 'Te veel verzoeken. Probeer over enkele seconden opnieuw.' },
        { status: 429, headers: { 'Retry-After': '60' } },
      )
    }

    if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_PASSWORD) {
      return NextResponse.json(
        { error: 'E-mail is niet geconfigureerd op de server.' },
        { status: 503 },
      )
    }

    const html = buildOmzetReportEmailHtml({
      businessName,
      addressBlockLines,
      btwNumber,
      periodLabel,
      totalRev,
      orderCount: Math.round(orderCount),
      cash,
      card,
      subtotalExcl,
      taxLow,
      taxMid,
      taxHigh,
      totalTax,
      generatedAtNl: new Date().toLocaleString('nl-NL'),
    })

    const transporter = nodemailer.createTransport({
      host: 'smtp.zoho.eu',
      port: 465,
      secure: true,
      auth: {
        user: process.env.ZOHO_EMAIL,
        pass: process.env.ZOHO_PASSWORD,
      },
    })

    const fromName = businessName.slice(0, 120)

    await transporter.sendMail({
      from: `"${fromName.replace(/[\r\n"]/g, '')}" <${process.env.ZOHO_EMAIL}>`,
      to,
      replyTo: process.env.ZOHO_EMAIL,
      subject: `Omzetrapport ${periodLabel} — ${fromName}`.slice(0, 250),
      html,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    logger.error('send-omzet-report-email error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    trackError(error, { requestId, route: '/api/send-omzet-report-email' })
    return NextResponse.json(
      {
        error: 'Fout bij versturen e-mail',
        message: error instanceof Error ? error.message : 'Onbekende fout',
      },
      { status: 500 },
    )
  }
}
