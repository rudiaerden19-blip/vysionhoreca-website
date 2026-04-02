import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { sendCustomerRejectionEmail } from '@/lib/customer-rejection-email'
import { tenantSlugLookupVariants } from '@/lib/tenant-slug-resolve'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHATSAPP_API_VERSION = 'v24.0'
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`

async function sendWhatsAppRejectionInBackground(params: {
  tenantSlug: string
  order: {
    customer_phone: string | null
    order_number: number | null
  }
  rejectionReason: string
}) {
  const { tenantSlug, order, rejectionReason } = params
  if (!order.customer_phone) {
    console.log('⚠️ No customer phone, skipping WhatsApp')
    return
  }

  console.log('📱 Sending WhatsApp rejection to:', order.customer_phone)

  let waSettings: { phone_number_id: string; access_token: string } | null = null
  for (const v of tenantSlugLookupVariants(tenantSlug)) {
    const { data } = await supabaseAdmin
      .from('whatsapp_settings')
      .select('phone_number_id, access_token')
      .eq('tenant_slug', v)
      .eq('is_active', true)
      .maybeSingle()
    if (data?.phone_number_id && data?.access_token) {
      waSettings = data as { phone_number_id: string; access_token: string }
      break
    }
  }

  if (!waSettings) {
    console.log('⚠️ No WhatsApp settings found for tenant')
    return
  }

  let businessName = tenantSlug
  for (const v of tenantSlugLookupVariants(tenantSlug)) {
    const { data: tenantData } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('slug', v)
      .maybeSingle()
    if (tenantData?.name) {
      businessName = tenantData.name
      break
    }
  }

  const formattedPhone = order.customer_phone
    .replace(/\s+/g, '')
    .replace(/^0/, '32')
    .replace(/^\+/, '')

  const message = `❌ *Bestelling Afgewezen*

Je bestelling #${order.order_number} is helaas afgewezen.

Reden: ${rejectionReason}

Neem contact op met ${businessName} voor meer informatie. Onze excuses voor het ongemak.`

  const waResponse = await fetch(`${WHATSAPP_API_URL}/${waSettings.phone_number_id}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${waSettings.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'text',
      text: { body: message },
    }),
  })

  if (waResponse.ok) {
    console.log('✅ WhatsApp rejection sent to:', formattedPhone)
  } else {
    const error = await waResponse.text()
    console.error('❌ WhatsApp API error:', error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📨 Order reject API called with:', JSON.stringify(body))

    const { orderId, tenantSlug, rejectionReason, rejectionNotes } = body

    if (!orderId || !tenantSlug || !rejectionReason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Forbidden' }, { status: 403 })
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('❌ Order not found:', orderError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    const norm = (s: string) => (s || '').replace(/-/g, '').toLowerCase()
    if (norm(order.tenant_slug) !== norm(tenantSlug)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({
        status: 'rejected',
        rejection_reason: rejectionReason,
        rejection_notes: rejectionNotes || null,
        rejected_at: new Date().toISOString(),
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('❌ Failed to update order:', updateError)
      return NextResponse.json({ error: 'Failed to reject order' }, { status: 500 })
    }

    console.log('✅ Order rejected:', orderId)

    /** Klantmail direct op de server — niet afhankelijk van een tweede browser-call. */
    let emailSent = false
    let emailError: string | undefined
    try {
      const mailRes = await sendCustomerRejectionEmail(supabaseAdmin, {
        order,
        tenantSlug: order.tenant_slug as string,
        rejectionReason,
        rejectionNotes,
      })
      emailSent = mailRes.sent
      if (!mailRes.sent) emailError = mailRes.error
      if (emailError) console.warn('⚠️ Rejection e-mail:', emailError)
    } catch (mailErr) {
      console.error('❌ Rejection e-mail exception:', mailErr)
      emailError = 'E-mail versturen mislukt'
    }

    /**
     * WhatsApp blokkeerde vroeger het HTTP-antwoord (langzame Meta-API) → spinner bleef draaien
     * en de browser werd nooit “ok”, dus ook geen tweede stap. Nu fire-and-forget.
     */
    void sendWhatsAppRejectionInBackground({
      tenantSlug,
      order: {
        customer_phone: order.customer_phone,
        order_number: order.order_number,
      },
      rejectionReason,
    }).catch((e) => console.error('WhatsApp rejection background:', e))

    return NextResponse.json({
      success: true,
      emailSent,
      ...(emailError ? { emailError } : {}),
    })
  } catch (error: unknown) {
    console.error('❌ Order reject error:', error)
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
