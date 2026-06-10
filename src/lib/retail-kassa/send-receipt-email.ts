import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantSettings } from '@/lib/admin-api'
import type { KassaLastOrderReceipt } from '@/lib/kassa-cart-types'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { buildRetailKassaReceiptHtmlDocument } from '@/lib/retail-kassa-receipt'
import { retailReceiptI18nForLocale } from '@/lib/retail-kassa/receipt-email-labels'
import { createMailTransporter, resolveTenantSmtp } from '@/lib/retail-loyalty/tenant-smtp'
import { logger } from '@/lib/logger'

async function loadTenantSettingsForReceipt(
  supabase: SupabaseClient,
  tenantSlug: string,
): Promise<TenantSettings | null> {
  const { data } = await supabase
    .from('tenant_settings')
    .select(
      'tenant_slug, business_name, address, postal_code, city, phone, email, website, btw_number, btw_percentage',
    )
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()
  return (data as TenantSettings | null) ?? null
}

export async function sendRetailKassaReceiptEmail(opts: {
  tenantSlug: string
  toEmail: string
  locale: string
  order: KassaLastOrderReceipt
}): Promise<{ ok: boolean; error?: string }> {
  const email = opts.toEmail.trim().toLowerCase()
  if (!email.includes('@')) return { ok: false, error: 'invalid_email' }

  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable' }

  const smtpRes = await resolveTenantSmtp(supabase, opts.tenantSlug)
  if (!smtpRes.ok) return { ok: false, error: smtpRes.error }

  const tenantInfo = await loadTenantSettingsForReceipt(supabase, opts.tenantSlug)
  const labels = retailReceiptI18nForLocale(opts.locale)
  const receiptHtml = buildRetailKassaReceiptHtmlDocument({
    tenantInfo,
    order: opts.order,
    labels,
    locale: opts.locale,
  })

  const shopName =
    tenantInfo?.business_name?.trim() || smtpRes.smtp.fromName.trim() || opts.tenantSlug
  const ref =
    opts.order.checkoutReference ??
    (opts.order.orderNumber > 0 ? String(opts.order.orderNumber) : '')
  const subject = ref ? `${shopName} — ${labels.receiptNo}${ref}` : shopName

  const transporter = createMailTransporter(smtpRes.smtp)
  try {
    await transporter.sendMail({
      from: `"${smtpRes.smtp.fromName.replace(/"/g, '')}" <${smtpRes.smtp.user}>`,
      to: email,
      subject,
      html: `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:0 auto;">${receiptHtml}</div>`,
      text: subject,
    })
    return { ok: true }
  } catch (err) {
    logger.warn('[retail-kassa] receipt email send failed', {
      tenantSlug: opts.tenantSlug,
      toEmail: email,
      error: err instanceof Error ? err.message : String(err),
    })
    return { ok: false, error: 'send_failed' }
  }
}
