import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHATSAPP_API_VERSION = 'v24.0'
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📨 Order reject API called with:', JSON.stringify(body))
    
    const { orderId, tenantSlug, rejectionReason, rejectionNotes } = body

    if (!orderId || !tenantSlug || !rejectionReason) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Get the order first to get customer phone
    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('❌ Order not found:', orderError)
      return NextResponse.json({ error: 'Order not found' }, { status: 404 })
    }

    // Update order status to rejected
    const { error: updateError } = await supabaseAdmin
      .from('orders')
      .update({ 
        status: 'rejected',
        rejection_reason: rejectionReason,
        rejection_notes: rejectionNotes || null,
        rejected_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('❌ Failed to update order:', updateError)
      return NextResponse.json({ error: 'Failed to reject order' }, { status: 500 })
    }

    console.log('✅ Order rejected:', orderId)

    // Send WhatsApp notification if customer has phone
    if (order.customer_phone) {
      console.log('📱 Sending WhatsApp rejection to:', order.customer_phone)
      
      // Normalize tenant slug
      const normalizedSlug = tenantSlug.replace(/-/g, '')
      
      // Get WhatsApp settings
      let { data: waSettings } = await supabaseAdmin
        .from('whatsapp_settings')
        .select('*')
        .eq('tenant_slug', normalizedSlug)
        .eq('is_active', true)
        .single()

      if (!waSettings) {
        const { data: waSettingsAlt } = await supabaseAdmin
          .from('whatsapp_settings')
          .select('*')
          .eq('tenant_slug', tenantSlug)
          .eq('is_active', true)
          .single()
        waSettings = waSettingsAlt
      }

      if (waSettings) {
        // Get business name
        const { data: tenantData } = await supabaseAdmin
          .from('tenants')
          .select('name')
          .eq('slug', normalizedSlug)
          .single()

        const businessName = tenantData?.name || tenantSlug
        
        // Format phone number
        const formattedPhone = order.customer_phone
          .replace(/\s+/g, '')
          .replace(/^0/, '32')
          .replace(/^\+/, '')

        const message = `❌ *Bestelling Afgewezen*

Je bestelling #${order.order_number} is helaas afgewezen.

Reden: ${rejectionReason}

Neem contact op met ${businessName} voor meer informatie. Onze excuses voor het ongemak.`

        // Send WhatsApp message
        const waResponse = await fetch(`${WHATSAPP_API_URL}/${waSettings.phone_number_id}/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${waSettings.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: formattedPhone,
            type: 'text',
            text: { body: message }
          })
        })

        if (waResponse.ok) {
          console.log('✅ WhatsApp rejection sent to:', formattedPhone)
        } else {
          const error = await waResponse.text()
          console.error('❌ WhatsApp API error:', error)
        }
      } else {
        console.log('⚠️ No WhatsApp settings found for tenant')
      }
    } else {
      console.log('⚠️ No customer phone, skipping WhatsApp')
    }

    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('❌ Order reject error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
