import type { SupabaseClient } from '@supabase/supabase-js'
import type { TenantSettings } from '@/lib/admin-api'
import type { KassaLastOrderReceipt } from '@/lib/kassa-cart-types'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { buildRetailKassaReceiptHtmlDocument } from '@/lib/retail-kassa-receipt'
import { retailReceiptEmailCopyForLocale, retailReceiptI18nForLocale } from '@/lib/retail-kassa/receipt-email-labels'
import {
  buildRetailKassaReceiptPdfBuffer,
  retailReceiptPdfFilename,
} from '@/lib/retail-kassa/receipt-pdf'
import { createMailTransporter, type TenantSmtpConfig } from '@/lib/retail-loyalty/tenant-smtp'
import { formatFromAddress, transactionalMailHeaders } from '@/lib/retail-loyalty/transactional-email'
import { logger } from '@/lib/logger'

async function loadTenantContextForReceiptEmail(
  supabase: SupabaseClient,
  tenantSlug: string,
): Promise<
  | {
      ok: true
      tenantInfo: TenantSettings | null
      contact: { businessName: string; replyToEmail: string | null; phone: string | null }
      smtp: TenantSmtpConfig
    }
  | { ok: false; error: 'smtp_not_configured'}
> {
  const { data } = await supabase
    .from('tenant_settings')
    .select(
      'tenant_slug, business_name, address, postal_code, city, phone, email, website, btw_number, btw_percentage, smtp_host, smtp_port, smtp_user, smtp_password, smtp_from_name',
    )
    .eq('tenant_slug', tenantSlug)
    .maybeSingle()

  if (!data) {
    const hasZoho = !!(process.env.ZOHO_EMAIL && process.env.ZOHO_PASSWORD)
    if (!hasZoho) return { ok: false, error: 'smtp_not_configured'}
    return {
      ok: true,
      tenantInfo: null,
      contact: { businessName: tenantSlug, replyToEmail: null, phone: null },
      smtp: {
        host: 'smtp.zoho.eu',
        port: 465,
        user: process.env.ZOHO_EMAIL!.trim(),
        pass: process.env.ZOHO_PASSWORD!.trim(),
        fromName: "Vysion kassa's",
      },
    }
  }

  const row = data as TenantSettings & {
    smtp_host?: string | null
    smtp_port?: number | null
    smtp_user?: string | null
    smtp_password?: string | null
    smtp_from_name?: string | null
  }

  let smtpHost = 'smtp.zoho.eu'
  let smtpPort = 465
  let smtpUser = process.env.ZOHO_EMAIL || ''
  let smtpPass = process.env.ZOHO_PASSWORD || ''
  let fromName = row.business_name?.trim() || "Vysion kassa's"

  if (row.smtp_host && row.smtp_user && row.smtp_password?.trim()) {
    smtpHost = row.smtp_host
    smtpPort = row.smtp_port || 465
    smtpUser = row.smtp_user
    smtpPass = row.smtp_password
    fromName = row.smtp_from_name || row.business_name || fromName
  } else if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_PASSWORD) {
    return { ok: false, error: 'smtp_not_configured'}
  }

  const contact = {
    businessName: row.business_name?.trim() || row.smtp_from_name?.trim() || tenantSlug,
    replyToEmail: row.email?.trim().toLowerCase() || null,
    phone: row.phone?.trim() || null,
  }

  return {
    ok: true,
    tenantInfo: row as TenantSettings,
    contact,
    smtp: {
      host: smtpHost,
      port: smtpPort,
      user: smtpUser.trim(),
      pass: smtpPass.trim(),
      fromName,
    },
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
  if (!email.includes('@')) return { ok: false, error: 'invalid_email'}

  const supabase = getServerSupabaseClient()
  if (!supabase) return { ok: false, error: 'db_unavailable'}

  const ctx = await loadTenantContextForReceiptEmail(supabase, opts.tenantSlug)
  if (!ctx.ok) return { ok: false, error: ctx.error }

  const { tenantInfo, contact, smtp } = ctx
  const labels = retailReceiptI18nForLocale(opts.locale)
  const emailCopy = retailReceiptEmailCopyForLocale(opts.locale)
  const html = buildRetailKassaReceiptHtmlDocument({
    tenantInfo,
    order: opts.order,
    labels,
    locale: opts.locale,
  })

  let pdfBuffer: Buffer | null = null
  try {
    pdfBuffer = await buildRetailKassaReceiptPdfBuffer({
      tenantInfo,
      order: opts.order,
      labels,
      locale: opts.locale,
    })
  } catch (err) {
    logger.warn('[retail-kassa] receipt PDF build failed; sending HTML-only email', {
      tenantSlug: opts.tenantSlug,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  const shopName = tenantInfo?.business_name?.trim() || contact.businessName || smtp.fromName.trim()
  const ref =
    opts.order.checkoutReference ??
    (opts.order.orderNumber > 0 ? String(opts.order.orderNumber) : '')
  const subject = ref
    ? `${shopName} – ${labels.receiptNo.replace(/\s*$/, '')} ${ref}`.trim()
    : `${shopName} – ${labels.thanks}`

  const plainBody = buildReceiptPlainText(opts.order, labels, shopName, ref)
  const text = pdfBuffer
    ? `${emailCopy.pdfAttachedIntro}\n\n${plainBody}`
    : plainBody
  const replyTo = contact.replyToEmail || smtp.user
  const pdfFilename = retailReceiptPdfFilename(ref, opts.order.orderNumber)

  const htmlWithIntro = pdfBuffer
    ? html.replace(
        /<body>/i,
        `<body><p style="font-family:Arial,sans-serif;font-size:14px;color:#333;margin:0 0 16px;">${escapeHtml(
          emailCopy.pdfAttachedIntro,
        )}</p>`,
      )
    : html

  const transporter = createMailTransporter(smtp)
  try {
    await transporter.sendMail({
      from: formatFromAddress(shopName, smtp.user),
      to: email,
      replyTo,
      subject,
      html: htmlWithIntro,
      text,
      headers: transactionalMailHeaders(),
      attachments: pdfBuffer
        ? [
            {
              filename: pdfFilename,
              content: pdfBuffer,
              contentType: 'application/pdf',
            },
          ]
        : undefined,
    })
    return { ok: true }
  } catch (err) {
    logger.warn('[retail-kassa] receipt email send failed', {
      tenantSlug: opts.tenantSlug,
      toEmail: email,
      error: err instanceof Error ? err.message : String(err),
    })
    return { ok: false, error: 'send_failed'}
  }
}
