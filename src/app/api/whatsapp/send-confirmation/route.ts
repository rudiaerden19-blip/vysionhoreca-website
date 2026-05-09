import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { apiRateLimiter, checkRateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHATSAPP_API_VERSION = 'v24.0'
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`

const CONFIRMATION_MAX_AGE_MS = 15 * 60 * 1000 // 15 min — orders ouder dan dit kunnen geen confirmatie meer triggeren.

/** Vergelijk twee telefoonnummers verdragelijk (spaties, +, leidende 0). */
function phonesMatch(a: string | null | undefined, b: string | null | undefined): boolean {
  const norm = (s: string | null | undefined) =>
    String(s || '')
      .replace(/\s+/g, '')
      .replace(/^\+/, '')
      .replace(/^0+/, '')
      .toLowerCase()
  const na = norm(a)
  const nb = norm(b)
  if (!na || !nb) return false
  // Tolereer landcode-verschil (32 vs niets) door eind-suffix te vergelijken.
  if (na === nb) return true
  if (na.endsWith(nb) || nb.endsWith(na)) return true
  return false
}

function getClientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID()
  try {
    const body = await request.json()
    const {
      orderId,
      tenantSlug,
      customerPhone,
      orderNumber,
      orderType,
      total,
      items,
      scheduledDate,
      scheduledTime,
    } = body

    if (!tenantSlug || !customerPhone || !orderNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── Rate-limit per IP+phone (defense-in-depth) ──────────────────────────
    const ip = getClientIp(request)
    const rl = await checkRateLimit(apiRateLimiter, `wa-conf:${ip}:${customerPhone}`)
    if (!rl.success) {
      logger.warn('whatsapp/send-confirmation: rate-limited', { requestId, ip, tenantSlug })
      return NextResponse.json(
        { error: 'Te veel verzoeken. Probeer over 1 minuut opnieuw.' },
        { status: 429, headers: { 'Retry-After': '60' } }
      )
    }

    // ── Order-ownership + recentheid ────────────────────────────────────────
    // Alleen orders die ECHT bestaan in DB voor deze tenant met dit telefoon-
    // nummer en die jong zijn (< 15 min) krijgen confirmatie. Voorkomt dat
    // iemand zonder login willekeurige WhatsApps via tenant-token stuurt.
    if (!orderId || typeof orderId !== 'string') {
      logger.warn('whatsapp/send-confirmation: orderId ontbreekt', { requestId, tenantSlug })
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 })
    }

    const normalizedSlug = String(tenantSlug).replace(/-/g, '').toLowerCase()
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id, tenant_slug, customer_phone, created_at')
      .eq('id', orderId)
      .maybeSingle()

    if (orderError || !order) {
      logger.warn('whatsapp/send-confirmation: order not found', { requestId, orderId, tenantSlug })
      return NextResponse.json({ error: 'Order niet gevonden' }, { status: 403 })
    }

    const orderSlugNorm = String(order.tenant_slug || '').replace(/-/g, '').toLowerCase()
    if (orderSlugNorm !== normalizedSlug) {
      logger.warn('whatsapp/send-confirmation: tenant mismatch', { requestId, orderId, tenantSlug, orderSlug: order.tenant_slug })
      return NextResponse.json({ error: 'Order tenant mismatch' }, { status: 403 })
    }

    if (!phonesMatch(order.customer_phone, customerPhone)) {
      logger.warn('whatsapp/send-confirmation: phone mismatch', { requestId, orderId })
      return NextResponse.json({ error: 'Phone mismatch' }, { status: 403 })
    }

    const createdMs = order.created_at ? new Date(order.created_at).getTime() : 0
    if (!createdMs || Date.now() - createdMs > CONFIRMATION_MAX_AGE_MS) {
      logger.warn('whatsapp/send-confirmation: order too old', { requestId, orderId, createdMs })
      return NextResponse.json({ error: 'Order is te oud voor confirmatie' }, { status: 403 })
    }

    // Get tenant WhatsApp settings
    const { data: tenant } = await supabaseAdmin
      .from('whatsapp_settings')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .eq('is_active', true)
      .single()

    if (!tenant) {
      console.log('❌ No WhatsApp settings found for tenant:', tenantSlug)
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 404 })
    }

    // Get tenant name
    const { data: tenantData } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('slug', tenantSlug)
      .single()

    const businessName = tenantData?.name || tenantSlug

    // Format phone number (remove spaces, ensure starts with country code)
    let formattedPhone = customerPhone.replace(/\s+/g, '').replace(/^0/, '32').replace(/^\+/, '')
    
    // Format order items
    const itemsList = items
      .map((item: any) => `• ${item.quantity}x ${item.name} - €${(item.total_price || item.totalPrice || 0).toFixed(2)}`)
      .join('\n')

    // Format scheduled time
    let scheduledText = ''
    if (scheduledDate) {
      const dateObj = new Date(scheduledDate)
      const formattedDate = dateObj.toLocaleDateString('nl-BE', { weekday: 'long', day: 'numeric', month: 'long' })
      scheduledText = `\n📅 ${formattedDate}`
      if (scheduledTime) {
        scheduledText += ` om ${scheduledTime}`
      }
    }

    // Build confirmation message
    const orderTypeText = orderType === 'pickup' ? '🏪 Ophalen' : '🚗 Bezorgen'

    const confirmationMessage = `📨 *Bestelling Verzonden!*

Je bestelling bij ${businessName} is ontvangen.

📋 *Bestelnummer:* #${orderNumber}
${orderTypeText}${scheduledText}

*Je bestelling:*
${itemsList}

💰 *Totaal:* €${total.toFixed(2)}

⏳ *Wacht op bevestiging van de zaak...*
Je krijgt een bericht zodra de zaak je bestelling bevestigt!`

    // Send the confirmation via WhatsApp
    const response = await fetch(`${WHATSAPP_API_URL}/${tenant.phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tenant.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedPhone,
        type: 'text',
        text: { body: confirmationMessage }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ WhatsApp API error:', error)
      return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 })
    }

    console.log(`✅ Order confirmation sent to ${formattedPhone}`)
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('❌ Error sending confirmation:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
