import type { SupabaseClient } from '@supabase/supabase-js'
import { buildEan13BarcodeEmailHtml } from '@/lib/retail-loyalty/ean13-barcode-svg'
import { buildRetailLoyaltyPassAbsoluteUrl } from '@/lib/retail-loyalty/pass-url'
import { createMailTransporter, resolveTenantSmtp } from '@/lib/retail-loyalty/tenant-smtp'
import {
  escapeHtml,
  formatFromAddress,
  loadTenantShopContact,
  transactionalMailHeaders,
  wrapRetailTransactionalEmailHtml,
} from '@/lib/retail-loyalty/transactional-email'
import { logger } from '@/lib/logger'

export async function sendRetailLoyaltyPassEmail(opts: {
  supabase: SupabaseClient
  tenantSlug: string
  toEmail: string
  cardCode: string
  displayName?: string | null
  origin: string
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, tenantSlug, toEmail, cardCode, origin } = opts
  const email = toEmail.trim().toLowerCase()
  if (!email || !email.includes('@')) return { ok: false, error: 'invalid_email' }

  const smtpRes = await resolveTenantSmtp(supabase, tenantSlug)
  if (!smtpRes.ok) return { ok: false, error: smtpRes.error }

  const contact = await loadTenantShopContact(supabase, tenantSlug)
  const shopName = contact.businessName || smtpRes.smtp.fromName.trim() || tenantSlug
  const barcodeHtml = buildEan13BarcodeEmailHtml(cardCode, { barHeightPx: 88, moduleWidthPx: 3 })
  const passPageUrl = buildRetailLoyaltyPassAbsoluteUrl(origin, tenantSlug, cardCode)
  const subject = shopName

  const bodyHtml = `
      <p style="margin:0 0 28px;font-size:22px;font-weight:700;text-align:center;color:#111;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(shopName)}</p>
      <div style="margin:0 auto;text-align:center;">${barcodeHtml ?? ''}</div>
  `.trim()

  const html = wrapRetailTransactionalEmailHtml({
    lang: 'nl',
    title: subject,
    bodyHtml,
  })

  const text = [shopName, '', passPageUrl].join('\n')
  const replyTo = contact.replyToEmail || smtpRes.smtp.user

  const transporter = createMailTransporter(smtpRes.smtp)
  try {
    await transporter.sendMail({
      from: formatFromAddress(shopName, smtpRes.smtp.user),
      to: email,
      replyTo,
      subject,
      html,
      text,
      headers: transactionalMailHeaders(),
    })
    return { ok: true }
  } catch (err) {
    logger.warn('[retail-loyalty] pass email send failed', {
      tenantSlug,
      toEmail: email,
      error: err instanceof Error ? err.message : String(err),
    })
    return { ok: false, error: 'send_failed' }
  }
}
