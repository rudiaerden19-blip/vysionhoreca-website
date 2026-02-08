import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHATSAPP_API_VERSION = 'v24.0'
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`

// Status types and their messages
const STATUS_MESSAGES: Record<string, { nl: string; emoji: string }> = {
  confirmed: {
    emoji: '✅',
    nl: `✅ *Bestelling Bevestigd!*

Je bestelling #{orderNumber} is bevestigd door {businessName}!

We zijn ermee bezig en laten je weten wanneer het klaar is. 🍟`
  },
  preparing: {
    emoji: '👨‍🍳',
    nl: `👨‍🍳 *Bestelling wordt bereid!*

Je bestelling #{orderNumber} wordt nu klaargemaakt.

Nog even geduld... ⏳`
  },
  ready: {
    emoji: '🔔',
    nl: `🔔 *Je bestelling is KLAAR!*

Bestelnummer: #{orderNumber}

Je kunt je bestelling nu ophalen bij {businessName}! 🍟

Tot zo! 👋`
  },
  delivering: {
    emoji: '🚗',
    nl: `🚗 *Onderweg!*

Je bestelling #{orderNumber} is onderweg naar jou!

Bezorger is vertrokken. 📍`
  },
  delivered: {
    emoji: '✅',
    nl: `✅ *Bezorgd!*

Je bestelling #{orderNumber} is bezorgd.

Bedankt voor je bestelling bij {businessName}! 
Smakelijk! 😋`
  },
  cancelled: {
    emoji: '❌',
    nl: `❌ *Bestelling Geannuleerd*

Je bestelling #{orderNumber} is helaas geannuleerd.

Neem contact op met {businessName} voor meer informatie.`
  },
  rejected: {
    emoji: '❌',
    nl: `❌ *Bestelling Afgewezen*

Je bestelling #{orderNumber} is helaas afgewezen.

Reden: {rejectionReason}

Neem contact op met {businessName} voor meer informatie. Onze excuses voor het ongemak.`
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📨 WhatsApp send-status called with:', JSON.stringify(body))
    
    const { tenantSlug, customerPhone, orderNumber, status, rejectionReason } = body

    if (!tenantSlug || !customerPhone || !orderNumber || !status) {
      console.log('❌ Missing required fields:', { tenantSlug, customerPhone, orderNumber, status })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Normalize tenant slug (remove hyphens for database lookup)
    const normalizedSlug = tenantSlug.replace(/-/g, '')

    // Check if status is valid
    if (!STATUS_MESSAGES[status]) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get tenant WhatsApp settings (try normalized slug first, then original)
    let { data: tenant } = await supabaseAdmin
      .from('whatsapp_settings')
      .select('*')
      .eq('tenant_slug', normalizedSlug)
      .eq('is_active', true)
      .single()

    // Fallback to original slug if not found
    if (!tenant) {
      const { data: tenantAlt } = await supabaseAdmin
        .from('whatsapp_settings')
        .select('*')
        .eq('tenant_slug', tenantSlug)
        .eq('is_active', true)
        .single()
      tenant = tenantAlt
    }

    if (!tenant) {
      console.log('❌ No WhatsApp settings found for tenant:', tenantSlug, 'or', normalizedSlug)
      return NextResponse.json({ error: 'WhatsApp not configured' }, { status: 404 })
    }

    // Get tenant name
    const { data: tenantData } = await supabaseAdmin
      .from('tenants')
      .select('name')
      .eq('slug', normalizedSlug)
      .single()

    const businessName = tenantData?.name || tenantSlug

    // Format phone number
    let formattedPhone = customerPhone.replace(/\s+/g, '').replace(/^0/, '32').replace(/^\+/, '')

    // Get the message template and replace placeholders
    const messageTemplate = STATUS_MESSAGES[status].nl
    const message = messageTemplate
      .replace(/{orderNumber}/g, orderNumber)
      .replace(/{businessName}/g, businessName)
      .replace(/{rejectionReason}/g, rejectionReason || 'Niet gespecificeerd')

    // Send the message via WhatsApp
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
        text: { body: message }
      })
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('❌ WhatsApp API error:', error)
      return NextResponse.json({ error: 'Failed to send WhatsApp message' }, { status: 500 })
    }

    console.log(`✅ Status update "${status}" sent to ${formattedPhone}`)
    return NextResponse.json({ success: true })

  } catch (error: any) {
    console.error('❌ Error sending status update:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
