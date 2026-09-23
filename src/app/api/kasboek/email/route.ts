import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { renderBoekhoudingXlsx, renderCashbookPdf, type CashbookExportMeta } from '@/lib/cashbook-export'
import { loadCashbookRange, logCashbookEvent } from '@/lib/cashbook-store'
import { apiRateLimiter, checkRateLimit, getClientIP } from '@/lib/rate-limit'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { resolveZohoEmail } from '@/lib/vysion-contact'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { assertZohoSmtpConfigured, createZohoMailTransport } from '@/lib/zoho-smtp'

const DateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const BodySchema = z.object({
  tenantSlug: z.string().min(1),
  from: DateSchema,
  to: DateSchema,
  toEmail: z.string().email(),
})

export async function POST(request: NextRequest) {
  const rl = await checkRateLimit(apiRateLimiter, `kasboek-mail:${getClientIP(request)}`)
  if (!rl.success) return NextResponse.json({ error: 'Te veel verzoeken. Probeer later opnieuw.' }, { status: 429 })
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    return NextResponse.json({ error: 'Ongeldige JSON' }, { status: 400 })
  }
  const parsed = BodySchema.safeParse(raw)
  if (!parsed.success || parsed.data.from > parsed.data.to) {
    return NextResponse.json({ error: 'Ongeldige periode of e-mail.' }, { status: 400 })
  }
  const access = await verifyTenantOrSuperAdmin(request, parsed.data.tenantSlug)
  if (!access.authorized) return NextResponse.json({ error: access.error || 'Niet geautoriseerd' }, { status: 403 })
  const smtpError = assertZohoSmtpConfigured()
  if (smtpError) return NextResponse.json({ error: smtpError }, { status: 503 })
  const client = getServerSupabaseClient()
  if (!client) return NextResponse.json({ error: 'Database niet beschikbaar' }, { status: 503 })

  const to = parsed.data.toEmail.trim()
  const [rows, profile] = await Promise.all([
    loadCashbookRange(client, parsed.data.tenantSlug, parsed.data.from, parsed.data.to, { withVat: true }),
    client.from('tenant_settings').select('business_name, btw_number, address, postal_code, city').eq('tenant_slug', parsed.data.tenantSlug).maybeSingle(),
  ])
  const business = profile.data as { business_name?: string; btw_number?: string; address?: string; postal_code?: string; city?: string } | null
  const period = parsed.data.from === parsed.data.to ? parsed.data.from : `${parsed.data.from}-${parsed.data.to}`
  const meta: CashbookExportMeta = {
    businessName: business?.business_name || parsed.data.tenantSlug,
    btwNumber: business?.btw_number || '',
    address: [business?.address, business?.postal_code, business?.city].filter(Boolean).join(', '),
    periodLabel: period,
  }
  const pdf = await renderCashbookPdf(meta, rows)
  const book = renderBoekhoudingXlsx(meta, rows)
  const fromAddress = resolveZohoEmail()
  await createZohoMailTransport().sendMail({
    from: `"Vysion" <${fromAddress}>`,
    to,
    subject: `Vysion kasboek ${period}`,
    text: `Kasboek ${meta.businessName} voor ${period}. In de bijlage staan de PDF en het Excel-bestand. De totaalregel is de som van de dagen.`,
    attachments: [
      { filename: `Vysion-Kasboek-${period}.pdf`, content: pdf },
      { filename: `Vysion-Boekhouding-${period}.xlsx`, content: book },
    ],
  })
  const actor = access.businessId || request.headers.get('x-auth-email') || 'owner'
  await logCashbookEvent(client, parsed.data.tenantSlug, actor, parsed.data.from, 'report_emailed', { to, from: parsed.data.from, toDate: parsed.data.to })
  return NextResponse.json({ ok: true, to })
}
