import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Supabase client with service role for server operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// WhatsApp Cloud API configuration
const WHATSAPP_API_VERSION = 'v24.0'
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`

// Base URL for the shop
const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://vysionhoreca.com'

// =====================================================
// WEBHOOK VERIFICATION (GET)
// =====================================================
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  console.log('🔔 Webhook verification request:', { mode, token, challenge })

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'vysion_whatsapp_verify_2024'

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ Webhook verified successfully')
    return new NextResponse(challenge, { status: 200 })
  }

  console.log('❌ Webhook verification failed')
  return new NextResponse('Forbidden', { status: 403 })
}

// =====================================================
// MESSAGE HANDLER (POST)
// =====================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📩 Incoming webhook:', JSON.stringify(body, null, 2))

    // Process message entries
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value?.messages?.[0]) {
      console.log('ℹ️ No message in webhook (status update or other)')
      return NextResponse.json({ status: 'ok' })
    }

    const message = value.messages[0]
    const fromPhone = message.from
    const businessPhoneId = value.metadata?.phone_number_id
    const contactName = value.contacts?.[0]?.profile?.name || 'Klant'

    console.log(`📱 Message from ${fromPhone} to business ${businessPhoneId}`)

    // Find tenant by WhatsApp phone number ID
    const tenant = await findTenantByWhatsAppPhone(businessPhoneId)
    if (!tenant) {
      console.log('❌ No tenant found for this phone number ID')
      return NextResponse.json({ status: 'ok' })
    }

    console.log(`🏪 Tenant found: ${tenant.tenant_slug}`)

    // Always send welcome message when customer sends anything
    await sendWelcomeWithShopLink(businessPhoneId, fromPhone, tenant, contactName)

    return NextResponse.json({ status: 'ok' })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function findTenantByWhatsAppPhone(phoneNumberId: string) {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_settings')
    .select('*')
    .eq('phone_number_id', phoneNumberId)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    console.log('❌ Tenant lookup error:', error?.message)
    return null
  }

  // Get tenant details
  const { data: tenantData } = await supabaseAdmin
    .from('tenants')
    .select('name, slug')
    .eq('slug', data.tenant_slug)
    .single()

  // Get tenant settings for cover image
  const { data: tenantSettings } = await supabaseAdmin
    .from('tenant_settings')
    .select('cover_image_1, logo_url, business_name')
    .eq('tenant_slug', data.tenant_slug)
    .single()

  // Parse cover image URL if it's JSON
  let coverImageUrl = null
  if (tenantSettings?.cover_image_1) {
    try {
      const parsed = JSON.parse(tenantSettings.cover_image_1)
      coverImageUrl = parsed.url
    } catch {
      coverImageUrl = tenantSettings.cover_image_1
    }
  }

  return {
    ...data,
    business_name: tenantSettings?.business_name || tenantData?.name || data.tenant_slug,
    shop_url: `${BASE_URL}/shop/${data.tenant_slug}`,
    cover_image_url: coverImageUrl || tenantSettings?.logo_url
  }
}

async function sendWelcomeWithShopLink(
  phoneNumberId: string,
  toPhone: string,
  tenant: any,
  customerName: string
) {
  console.log(`📤 Sending welcome message to ${toPhone}`)

  // Send professional welcome with image + CTA button
  await sendImageWithCTA(phoneNumberId, toPhone, tenant.access_token, {
    imageUrl: tenant.cover_image_url,
    body: `🍟 Welkom bij ${tenant.business_name}!\n\nBekijk ons menu en bestel direct. Je bestelling wordt bevestigd via WhatsApp.`,
    buttonText: '🍔 BESTELLEN',
    buttonUrl: `${tenant.shop_url}?wa=${toPhone}`
  })

  console.log(`✅ Welcome message sent to ${toPhone}`)
}

// Send image with CTA button (professional welcome)
async function sendImageWithCTA(
  phoneNumberId: string,
  to: string,
  accessToken: string,
  content: { imageUrl?: string; body: string; buttonText: string; buttonUrl: string }
) {
  const messageBody: any = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'cta_url',
      body: { text: content.body },
      action: {
        name: 'cta_url',
        parameters: {
          display_text: content.buttonText,
          url: content.buttonUrl
        }
      }
    }
  }

  // Add image header if available
  if (content.imageUrl) {
    messageBody.interactive.header = {
      type: 'image',
      image: { link: content.imageUrl }
    }
  }

  const response = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(messageBody)
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ WhatsApp Image+CTA API error:', error)
    
    // Fallback: send text with link
    await sendTextMessage(phoneNumberId, to, accessToken, 
      `${content.body}\n\n👉 ${content.buttonUrl}`)
  }
}

// Send a text message
async function sendTextMessage(
  phoneNumberId: string,
  to: string,
  accessToken: string,
  text: string
) {
  const response = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { body: text }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ WhatsApp text API error:', error)
  }
}

// Send a CTA (Call To Action) button with URL
async function sendCTAButton(
  phoneNumberId: string,
  to: string,
  accessToken: string,
  content: { body: string; buttons: Array<{ type: string; title: string; url: string }> }
) {
  // WhatsApp CTA URL buttons use interactive type "cta_url"
  const response = await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'interactive',
      interactive: {
        type: 'cta_url',
        body: { text: content.body },
        action: {
          name: 'cta_url',
          parameters: {
            display_text: content.buttons[0].title,
            url: content.buttons[0].url
          }
        }
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ WhatsApp CTA API error:', error)
    
    // Fallback: send as regular text with link
    await sendTextMessage(
      phoneNumberId, 
      to, 
      accessToken, 
      `${content.body}\n\n👉 ${content.buttons[0].url}`
    )
  }
}

