import type { SupabaseClient } from '@supabase/supabase-js'
import { buildEan13BarcodeSvg } from '@/lib/retail-loyalty/ean13-barcode-svg'
import { buildRetailLoyaltyPassAbsoluteUrl } from '@/lib/retail-loyalty/pass-url'
import { createMailTransporter, resolveTenantSmtp } from '@/lib/retail-loyalty/tenant-smtp'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export async function sendRetailLoyaltyPassEmail(opts: {
  supabase: SupabaseClient
  tenantSlug: string
  toEmail: string
  cardCode: string
  displayName?: string | null
  origin: string
}): Promise<{ ok: boolean; error?: string }> {
  const email = opts.toEmail.trim().toLowerCase()
  if (!email || !email.includes('@')) return { ok: false, error: 'invalid_email' }

  const smtpRes = await resolveTenantSmtp(opts.supabase, opts.tenantSlug)
  if (!smtpRes.ok) return { ok: false, error: smtpRes.error }

  const passUrl = buildRetailLoyaltyPassAbsoluteUrl(opts.origin, opts.tenantSlug, opts.cardCode)
  const svg = buildEan13BarcodeSvg(opts.cardCode, { barHeight: 64, moduleWidth: 2 })
  const nameLine = opts.displayName?.trim()
    ? `<p style="margin:0 0 12px;font-size:16px;">Hallo ${escapeHtml(opts.displayName.trim())},</p>`
    : ''

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;">
      ${nameLine}
      <p style="margin:0 0 16px;line-height:1.5;">Hier is je digitale winkelpas. Toon de streepjescode aan de kassa of open de link op je telefoon.</p>
      <div style="text-align:center;margin:20px 0;padding:16px;background:#f8fafc;border-radius:12px;">
        ${svg ?? `<p style="font-family:monospace;font-size:18px;">${escapeHtml(opts.cardCode)}</p>`}
      </div>
      <p style="margin:0 0 8px;font-size:13px;color:#555;">Pascode: <strong>${escapeHtml(opts.cardCode)}</strong></p>
      <p style="margin:16px 0;">
        <a href="${escapeHtml(passUrl)}" style="display:inline-block;background:#059669;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600;">Open winkelpas</a>
      </p>
      <p style="margin:24px 0 0;font-size:12px;color:#888;">Je kunt de barcode ook opslaan als foto en die aan de kassa tonen.</p>
    </div>
  `

  const transporter = createMailTransporter(smtpRes.smtp)
  try {
    await transporter.sendMail({
      from: `"${smtpRes.smtp.fromName.replace(/"/g, '')}" <${smtpRes.smtp.user}>`,
      to: email,
      subject: 'Je digitale winkelpas',
      html,
      text: `Je winkelpas: ${opts.cardCode}\nOpen: ${passUrl}`,
    })
    return { ok: true }
  } catch {
    return { ok: false, error: 'send_failed' }
  }
}
