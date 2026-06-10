import type { SupabaseClient } from '@supabase/supabase-js'
import nlMessages from '../../../messages/nl.json'
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

const passEmailCopy = nlMessages.retailLoyalty as {
  passEmailSubject?: string
  passEmailIntro?: string
  passEmailFooter?: string
  passEmailSavePhotosLink?: string
  passEmailSavePhotosHint?: string
}

export async function sendRetailLoyaltyPassEmail(opts: {
  supabase: SupabaseClient
  tenantSlug: string
  toEmail: string
  cardCode: string
  displayName?: string | null
  origin: string
}): Promise<{ ok: boolean; error?: string }> {
  const { supabase, tenantSlug, toEmail, cardCode } = opts
  const email = toEmail.trim().toLowerCase()
  if (!email || !email.includes('@')) return { ok: false, error: 'invalid_email' }

  const smtpRes = await resolveTenantSmtp(supabase, tenantSlug)
  if (!smtpRes.ok) return { ok: false, error: smtpRes.error }

  const contact = await loadTenantShopContact(supabase, tenantSlug)
  const shopName = contact.businessName || smtpRes.smtp.fromName.trim() || tenantSlug
  const greeting = opts.displayName?.trim() ? ` ${opts.displayName.trim()}` : ''
  const barcodeHtml = buildEan13BarcodeEmailHtml(cardCode, { barHeightPx: 88, moduleWidthPx: 3 })
  const passPageUrl = buildRetailLoyaltyPassAbsoluteUrl(opts.origin, tenantSlug, cardCode)
  const saveLinkLabel =
    passEmailCopy.passEmailSavePhotosLink?.trim() || 'Barcode opslaan in Foto\'s'
  const saveLinkHint =
    passEmailCopy.passEmailSavePhotosHint?.trim() ||
    'Open deze link op je telefoon en tik op «Barcode opslaan (foto)».'
  const intro =
    (passEmailCopy.passEmailIntro || 'Beste{greeting}, hier is uw winkelpas van {shop}.')
      .replace('{greeting}', greeting)
      .replace('{shop}', shopName)
  const footer =
    passEmailCopy.passEmailFooter ||
    'Automatisch bericht over uw klantenkaart. Vragen? Antwoord op deze e-mail.'
  const subject = (passEmailCopy.passEmailSubject || '{shop} – uw winkelpas').replace(
    '{shop}',
    shopName,
  )

  const bodyHtml = `
      <p style="margin:0 0 8px;font-size:18px;font-weight:700;text-align:center;color:#111;">${escapeHtml(shopName)}</p>
      <p style="margin:0 0 24px;font-size:15px;text-align:center;color:#3f3f46;">${escapeHtml(intro)}</p>
      <div style="margin:0 auto 8px;text-align:center;">${barcodeHtml ?? ''}</div>
      <p style="margin:28px 0 10px;font-size:15px;line-height:1.45;text-align:center;">
        <a href="${escapeHtml(passPageUrl)}" style="color:#1d4ed8;font-weight:600;text-decoration:underline;">${escapeHtml(saveLinkLabel)}</a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.5;text-align:center;color:#52525b;">${escapeHtml(saveLinkHint)}</p>
  `.trim()

  const html = wrapRetailTransactionalEmailHtml({
    lang: 'nl',
    title: subject,
    bodyHtml,
    footerText: footer,
  })

  const text = [
    shopName,
    '',
    intro,
    '',
    `${saveLinkLabel}:`,
    passPageUrl,
    '',
    saveLinkHint,
    '',
    footer,
    contact.phone ? `Tel: ${contact.phone}` : '',
  ]
    .filter(Boolean)
    .join('\n')

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
