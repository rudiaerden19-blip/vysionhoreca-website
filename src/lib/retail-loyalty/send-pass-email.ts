import type { SupabaseClient } from '@supabase/supabase-js'
import nlMessages from '../../../messages/nl.json'
import { buildEan13BarcodeEmailHtml } from '@/lib/retail-loyalty/ean13-barcode-svg'
import { buildRetailLoyaltyPassAbsoluteUrl } from '@/lib/retail-loyalty/pass-url'
import { createMailTransporter, resolveTenantSmtp } from '@/lib/retail-loyalty/tenant-smtp'
import { logger } from '@/lib/logger'

const passEmailCopy = nlMessages.retailLoyalty as {
  passEmailSavePhotosLink?: string
  passEmailSavePhotosHint?: string
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function loadShopDisplayName(
  supabase: SupabaseClient,
  tenantSlug: string,
  smtpFromName: string,
): Promise<string> {
  const { data } = await supabase
    .from('tenant_settings')
    .select('business_name, smtp_from_name')
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()
  return (
    data?.business_name?.trim() ||
    data?.smtp_from_name?.trim() ||
    smtpFromName.trim() ||
    tenantSlug
  )
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

  const shopName = await loadShopDisplayName(supabase, tenantSlug, smtpRes.smtp.fromName)
  const barcodeHtml = buildEan13BarcodeEmailHtml(cardCode, { barHeightPx: 88, moduleWidthPx: 3 })
  const passPageUrl = buildRetailLoyaltyPassAbsoluteUrl(opts.origin, tenantSlug, cardCode)
  const saveLinkLabel =
    passEmailCopy.passEmailSavePhotosLink?.trim() || 'Barcode opslaan in Foto\'s'
  const saveLinkHint =
    passEmailCopy.passEmailSavePhotosHint?.trim() ||
    'Open deze link op je telefoon en tik op «Barcode opslaan (foto)».'

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;text-align:center;">
      <p style="margin:0 0 24px;font-size:20px;font-weight:700;">${escapeHtml(shopName)}</p>
      ${barcodeHtml ?? ''}
      <p style="margin:28px 0 10px;font-size:16px;line-height:1.4;">
        <a href="${escapeHtml(passPageUrl)}" style="color:#1d4ed8;font-weight:700;text-decoration:underline;">${escapeHtml(saveLinkLabel)}</a>
      </p>
      <p style="margin:0;font-size:13px;line-height:1.45;color:#444;">${escapeHtml(saveLinkHint)}</p>
    </div>
  `.trim()

  const transporter = createMailTransporter(smtpRes.smtp)
  try {
    await transporter.sendMail({
      from: `"${smtpRes.smtp.fromName.replace(/"/g, '')}" <${smtpRes.smtp.user}>`,
      to: email,
      subject: shopName,
      html,
      text: `${shopName}\n\n${saveLinkLabel}\n${passPageUrl}\n\n${saveLinkHint}`,
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
