import nodemailer from 'nodemailer'
import type { SupabaseClient } from '@supabase/supabase-js'
import { tenantSlugLookupVariants } from '@/lib/tenant-slug-resolve'

const REJECTION_LABELS: Record<string, string> = {
  too_busy: 'We zijn op dit moment te druk',
  busy: 'We zijn op dit moment te druk',
  closed: 'We zijn gesloten',
  sold_out: 'Product(en) uitverkocht',
  no_stock: 'Product(en) niet op voorraad',
  delivery_unavailable: 'Levering niet beschikbaar voor dit adres',
  technical: 'Technisch probleem',
  address: 'Adres niet bezorgbaar',
  other: 'Andere reden',
}

type OrderRow = {
  customer_email?: string | null
  customer_name?: string | null
  customer_phone?: string | null
  order_number?: number | null
  order_type?: string | null
  total?: number | null
  items?: unknown
  subtotal?: number | null
  delivery_fee?: number | null
  discount_amount?: number | null
}

type SettingsRow = {
  business_name?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  postal_code?: string | null
  city?: string | null
  btw_number?: string | null
  btw_percentage?: number | null
} | null

type TenantRow = {
  name?: string | null
  email?: string | null
  phone?: string | null
  slug?: string | null
} | null

async function loadSettingsForTenant(
  supabase: SupabaseClient,
  tenantSlug: string
): Promise<SettingsRow> {
  for (const v of tenantSlugLookupVariants(tenantSlug)) {
    const { data, error } = await supabase
      .from('tenant_settings')
      .select(
        'business_name, email, phone, address, postal_code, city, btw_number, btw_percentage'
      )
      .eq('tenant_slug', v)
      .maybeSingle()
    if (error) {
      console.warn('customer-rejection-email: tenant_settings query', v, error.message)
      continue
    }
    if (data) return data as SettingsRow
  }
  return null
}

async function loadTenantCore(
  supabase: SupabaseClient,
  tenantSlug: string
): Promise<TenantRow> {
  for (const v of tenantSlugLookupVariants(tenantSlug)) {
    const { data, error } = await supabase
      .from('tenants')
      .select('name, email, phone, slug')
      .eq('slug', v)
      .maybeSingle()
    if (error) {
      console.warn('customer-rejection-email: tenants query', v, error.message)
      continue
    }
    if (data) return data as TenantRow
  }
  return null
}

/**
 * Verstuurt weigeringsmail naar de klant (Zoho SMTP). Alleen aanroepen server-side.
 * Werkt ook voor nieuwe tenants: fallback van tenant_settings → tenants (name/email/phone).
 */
export async function sendCustomerRejectionEmail(
  supabase: SupabaseClient,
  params: {
    order: OrderRow
    tenantSlug: string
    rejectionReason: string
    rejectionNotes: string | null | undefined
  }
): Promise<{ sent: boolean; error?: string }> {
  const { order, tenantSlug, rejectionReason, rejectionNotes } = params
  const customerEmail = (order.customer_email || '').trim()
  if (!customerEmail) {
    return { sent: false, error: 'Geen klant-e-mail op de bestelling' }
  }
  if (!process.env.ZOHO_EMAIL || !process.env.ZOHO_PASSWORD) {
    return { sent: false, error: 'ZOHO_EMAIL / ZOHO_PASSWORD niet geconfigureerd' }
  }

  const settings = await loadSettingsForTenant(supabase, tenantSlug)
  const tenantCore = await loadTenantCore(supabase, tenantSlug)

  if (!tenantCore?.slug) {
    return { sent: false, error: 'Onbekende tenant (geen rij in tenants)' }
  }

  const businessName =
    (settings?.business_name && String(settings.business_name).trim()) ||
    (tenantCore.name && String(tenantCore.name).trim()) ||
    'Restaurant'

  const contactEmail = (settings?.email && String(settings.email).trim()) || tenantCore.email || null
  const contactPhone = (settings?.phone && String(settings.phone).trim()) || tenantCore.phone || null
  const btwRate =
    typeof settings?.btw_percentage === 'number' && !Number.isNaN(settings.btw_percentage)
      ? settings.btw_percentage
      : 6

  const totalNum = Number(order.total) || 0
  const totalExclBtw = totalNum / (1 + btwRate / 100)
  const btwAmount = totalNum - totalExclBtw

  const reasonLabel = REJECTION_LABELS[rejectionReason] || rejectionReason
  let notesHtml = ''
  if (rejectionNotes) {
    notesHtml = `<p style="color: #666; font-style: italic;">${String(rejectionNotes).replace(/</g, '&lt;')}</p>`
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.zoho.eu',
    port: 465,
    secure: true,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
    auth: {
      user: process.env.ZOHO_EMAIL,
      pass: process.env.ZOHO_PASSWORD,
    },
  })

  const businessInfoHtml = `
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-top: 20px; border: 1px solid #e5e5e5;">
        <h3 style="margin: 0 0 10px; color: #333; font-size: 14px;">🏪 Bedrijfsgegevens</h3>
        <p style="margin: 5px 0; color: #333;"><strong>${businessName}</strong></p>
        ${settings?.address ? `<p style="margin: 5px 0; color: #666;">${settings.address}</p>` : ''}
        ${settings?.postal_code || settings?.city ? `<p style="margin: 5px 0; color: #666;">${settings.postal_code || ''} ${settings.city || ''}</p>` : ''}
        ${contactPhone ? `<p style="margin: 5px 0; color: #666;">📞 ${contactPhone}</p>` : ''}
        ${contactEmail ? `<p style="margin: 5px 0; color: #666;">✉️ ${contactEmail}</p>` : ''}
        ${settings?.btw_number ? `<p style="margin: 10px 0 0; color: #333; font-weight: bold;">BTW: ${settings.btw_number}</p>` : ''}
      </div>
    `

  await transporter.sendMail({
    from: `"${businessName}" <${process.env.ZOHO_EMAIL}>`,
    to: customerEmail,
    replyTo: contactEmail || process.env.ZOHO_EMAIL,
    subject: `❌ Bestelling #${order.order_number} geannuleerd - ${businessName}`,
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; padding: 30px; background: #ef4444; border-radius: 16px 16px 0 0;">
            <span style="font-size: 64px;">❌</span>
            <h1 style="color: white; margin: 20px 0 10px; font-size: 28px;">Bestelling #${order.order_number}</h1>
            <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin: 0;">Helaas kunnen we je bestelling niet verwerken.</p>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e5e5; border-top: none;">
            <p style="font-size: 16px; color: #333; margin-bottom: 20px;">Beste ${order.customer_name || 'klant'},</p>
            <p style="color: #666; margin-top: 15px;"><strong>Reden:</strong> ${reasonLabel}</p>
            ${notesHtml}
            <p style="color: #666; margin-top: 15px;">Je hebt niets betaald. Probeer het later opnieuw of neem contact op met de zaak.</p>
            <p style="color: #666; font-size: 14px; margin-top: 15px;">Order totaal (ter info): €${totalNum.toFixed(2)} incl. BTW (€${totalExclBtw.toFixed(2)} excl., BTW ${btwRate}%: €${btwAmount.toFixed(2)})</p>
            ${businessInfoHtml}
            <p style="color: #666; font-size: 14px; margin-top: 30px;">
              Vragen? Neem contact op met ${businessName}${contactPhone ? ` via ${contactPhone}` : ''}.
            </p>
          </div>
          <div style="background: #f9f9f9; padding: 20px; border-radius: 0 0 16px 16px; border: 1px solid #e5e5e5; border-top: none; text-align: center;">
            <p style="color: #999; font-size: 12px; margin: 0;">Dit is een automatische melding.<br /></p>
            <p style="color: #999; font-size: 11px; margin: 15px 0 0;">
              Powered by <a href="https://www.vysionhoreca.com" style="color: #f97316; text-decoration: none;">Vysion Horeca</a>
            </p>
          </div>
        </div>
      `,
  })

  return { sent: true }
}
