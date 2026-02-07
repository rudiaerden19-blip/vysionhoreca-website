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
    const { tenantSlug, customerPhone, orderNumber, orderType, total, items, scheduledDate, scheduledTime } = body

    if (!tenantSlug || !customerPhone || !orderNumber) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
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
