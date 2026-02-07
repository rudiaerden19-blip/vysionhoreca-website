import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client with service role for server operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHATSAPP_API_VERSION = 'v24.0'
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`

export async function POST(request: NextRequest) {
  try {
    const { tenantSlug, orderId, status } = await request.json()

    if (!tenantSlug || !orderId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get order details
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Only send WhatsApp if order was placed via WhatsApp and has phone number
    if (order.source !== 'whatsapp' || !order.customer_phone) {
      return NextResponse.json({ 
        success: true, 
        message: 'Order not from WhatsApp or no phone number' 
      })
    }

    // Get tenant's WhatsApp settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('whatsapp_settings')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .eq('is_active', true)
      .single()

    if (settingsError || !settings) {
      return NextResponse.json({ 
        success: true, 
        message: 'WhatsApp not configured for tenant' 
      })
    }

    // Determine message based on status
    let message = ''
    switch (status) {
      case 'preparing':
        message = `👨‍🍳 Je bestelling #${order.order_number} wordt nu bereid!\n\nWe laten je weten wanneer het klaar is. ⏳`
        break
      case 'ready':
        message = settings.ready_message || `🔔 *Je bestelling #${order.order_number} is KLAAR!*\n\nJe kunt het nu ophalen. Tot zo! 🎉`
        break
      case 'completed':
        message = `✅ Bedankt voor je bestelling #${order.order_number}!\n\nWe hopen je snel weer te zien! 😊`
        break
      case 'cancelled':
        message = `❌ Je bestelling #${order.order_number} is helaas geannuleerd.\n\nNeem contact op met de zaak voor meer informatie.`
        break
      default:
        return NextResponse.json({ 
          success: true, 
          message: 'No notification for this status' 
        })
    }

    // Send WhatsApp message
    const response = await fetch(`${WHATSAPP_API_URL}/${settings.phone_number_id}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${settings.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: order.customer_phone,
        type: 'text',
        text: { body: message }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ WhatsApp API error:', error)
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to send WhatsApp message' 
      }, { status: 500 })
    }

    console.log(`✅ WhatsApp status update sent for order #${order.order_number}`)

    return NextResponse.json({ 
      success: true, 
      message: `Status update sent to ${order.customer_phone}` 
    })

  } catch (error) {
    console.error('❌ WhatsApp send-status error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
