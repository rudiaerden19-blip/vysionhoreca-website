import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyTenantOrSuperAdmin } from '@/lib/verify-tenant-access'
import { sendCustomerRejectionEmail } from '@/lib/customer-rejection-email'
import { tenantSlugLookupVariants } from '@/lib/tenant-slug-resolve'
import { logger } from '@/lib/logger'
import { trackError } from '@/lib/monitoring'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHATSAPP_API_VERSION = 'v24.0'
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`

async function sendWhatsAppRejectionInBackground(params: {
  requestId?: string
  tenantSlug: string
  order: {
    customer_phone: string | null
    order_number: number | null
  }
  rejectionReason: string
}) {
  const { requestId, tenantSlug, order, rejectionReason } = params
  if (!order.customer_phone) {
    logger.info('Order reject: skip WhatsApp (no customer phone)', {
      requestId,
      tenantSlug,
      orderNumber: order.order_number,
    })
    return
  }

  logger.info('Order reject: sending WhatsApp rejection', {
    requestId,
    tenantSlug,
    orderNumber: order.order_number,
  })

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
    logger.warn('Order reject: no WhatsApp settings for tenant', { requestId, tenantSlug })
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

  const message = `*Bestelling Afgewezen*

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
    logger.info('Order reject: WhatsApp rejection sent', {
      requestId,
      tenantSlug,
      orderNumber: order.order_number,
    })
  } else {
    const errorBody = await waResponse.text()
    logger.warn('Order reject: WhatsApp API error', {
      requestId,
      tenantSlug,
      status: waResponse.status,
      bodyPreview: errorBody.slice(0, 500),
    })
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  let tenantSlugLog: string | undefined

  try {
    const body = await request.json()
    logger.info('Order reject API request', { requestId, orderId: body?.orderId, tenantSlug: body?.tenantSlug })

    const { orderId, tenantSlug, rejectionReason, rejectionNotes } = body
    tenantSlugLog = tenantSlug

    if (!orderId || !tenantSlug || !rejectionReason) {
      return NextResponse.json({ error: 'Missing required fields'}, { status: 400 })
    }

    const access = await verifyTenantOrSuperAdmin(request, tenantSlug)
    if (!access.authorized) {
      return NextResponse.json({ error: access.error || 'Forbidden'}, { status: 403 })
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      logger.warn('Order reject: order not found', { requestId, orderId, error: orderError?.message })
      return NextResponse.json({ error: 'Order not found'}, { status: 404 })
    }

    const norm = (s: string) => (s || '').replace(/-/g, '').toLowerCase()
    if (norm(order.tenant_slug) !== norm(tenantSlug)) {
      return NextResponse.json({ error: 'Forbidden'}, { status: 403 })
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
      .eq('tenant_slug', order.tenant_slug as string)

    if (updateError) {
      logger.error('Order reject: DB update failed', { requestId, orderId, error: updateError.message })
      trackError(new Error(updateError.message), {
        requestId,
        route: '/api/orders/reject',
        phase: 'update',
        orderId,
      })
      return NextResponse.json({ error: 'Failed to reject order'}, { status: 500 })
    }

    logger.info('Order rejected', { requestId, orderId })

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
      if (emailError) logger.warn('Order reject: email issue', { requestId, emailError })
    } catch (mailErr) {
      logger.error('Order reject: email exception', {
        requestId,
        error: mailErr instanceof Error ? mailErr.message : String(mailErr),
      })
      trackError(mailErr, { requestId, route: '/api/orders/reject', phase: 'rejection_email'})
      emailError = 'E-mail versturen mislukt'
    }

    /**
     * WhatsApp blokkeerde vroeger het HTTP-antwoord (langzame Meta-API) → spinner bleef draaien
     * en de browser werd nooit “ok”, dus ook geen tweede stap. Nu fire-and-forget.
     */
    void sendWhatsAppRejectionInBackground({
      requestId,
      tenantSlug,
      order: {
        customer_phone: order.customer_phone,
        order_number: order.order_number,
      },
      rejectionReason,
    }).catch((e) =>
      logger.warn('Order reject: WhatsApp background failed', {
        requestId,
        error: e instanceof Error ? e.message : String(e),
      })
    )

    return NextResponse.json({
      success: true,
      emailSent,
      ...(emailError ? { emailError } : {}),
    })
  } catch (error: unknown) {
    logger.error('Order reject error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
    })
    trackError(error, { requestId, route: '/api/orders/reject', tenantSlug: tenantSlugLog })
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
