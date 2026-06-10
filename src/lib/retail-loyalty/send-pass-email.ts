import type { SupabaseClient } from '@supabase/supabase-js'
import { buildEan13BarcodeSvg } from '@/lib/retail-loyalty/ean13-barcode-svg'
import { createMailTransporter, resolveTenantSmtp } from '@/lib/retail-loyalty/tenant-smtp'

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
  const svg = buildEan13BarcodeSvg(cardCode, { barHeight: 80, moduleWidth: 2 })

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;color:#111;text-align:center;">
      <p style="margin:0 0 24px;font-size:20px;font-weight:700;">${escapeHtml(shopName)}</p>
      <div style="display:inline-block;padding:16px;background:#fff;">
        ${svg ?? ''}
      </div>
    </div>
  `.trim()

  const transporter = createMailTransporter(smtpRes.smtp)
  try {
    await transporter.sendMail({
      from: `"${smtpRes.smtp.fromName.replace(/"/g, '')}" <${smtpRes.smtp.user}>`,
      to: email,
      subject: shopName,
      html,
      text: shopName,
    })
    return { ok: true }
  } catch {
    return { ok: false, error: 'send_failed' }
  }
}
