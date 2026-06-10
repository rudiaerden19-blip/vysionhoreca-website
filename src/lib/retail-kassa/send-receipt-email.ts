import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantSettings } from '@/lib/admin-api'
import type { KassaLastOrderReceipt } from '@/lib/kassa-cart-types'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { buildRetailKassaReceiptHtmlDocument } from '@/lib/retail-kassa-receipt'
import { retailReceiptI18nForLocale } from '@/lib/retail-kassa/receipt-email-labels'
import { createMailTransporter, resolveTenantSmtp } from '@/lib/retail-loyalty/tenant-smtp'
import {
  formatFromAddress,
  loadTenantShopContact,
  transactionalMailHeaders,
} from '@/lib/retail-loyalty/transactional-email'
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

function buildReceiptPlainText(
  order: KassaLastOrderReceipt,
  labels: ReturnType<typeof retailReceiptI18nForLocale>,
  shopName: string,
  ref: string,
): string {
  const lines: string[] = [shopName, '']
  if (ref) lines.push(`${labels.receiptNo}${ref}`)
  lines.push('')
  for (const i of order.items) {
    const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
    const lineTotal = (i.product.price + choicesTotal) * i.quantity
    lines.push(`${i.quantity}x ${i.product.name}  €${lineTotal.toFixed(2)}`)
  }
  lines.push('', `${labels.total}  €${order.total.toFixed(2)}`, '')
  lines.push(labels.thanks)
  return lines.join('\n')
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
  const contact = await loadTenantShopContact(supabase, opts.tenantSlug)
  const labels = retailReceiptI18nForLocale(opts.locale)
  const html = buildRetailKassaReceiptHtmlDocument({
    tenantInfo,
    order: opts.order,
    labels,
    locale: opts.locale,
  })

  const shopName =
    tenantInfo?.business_name?.trim() || contact.businessName || smtpRes.smtp.fromName.trim()
  const ref =
    opts.order.checkoutReference ??
    (opts.order.orderNumber > 0 ? String(opts.order.orderNumber) : '')
  const subject = ref
    ? `${shopName} – ${labels.receiptNo.replace(/\s*$/, '')} ${ref}`.trim()
    : `${shopName} – ${labels.thanks}`

  const text = buildReceiptPlainText(opts.order, labels, shopName, ref)
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
    logger.warn('[retail-kassa] receipt email send failed', {
      tenantSlug: opts.tenantSlug,
      toEmail: email,
      error: err instanceof Error ? err.message : String(err),
    })
    return { ok: false, error: 'send_failed' }
  }
}
