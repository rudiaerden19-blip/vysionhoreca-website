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

// Message deduplication - prevent processing same message twice
const processedMessages = new Map<string, number>()
const MESSAGE_CACHE_TTL = 60000 // 1 minute

// Clean old messages from cache periodically
function cleanMessageCache() {
  const now = Date.now()
  for (const [id, timestamp] of processedMessages.entries()) {
    if (now - timestamp > MESSAGE_CACHE_TTL) {
      processedMessages.delete(id)
    }
  }
}

// Check if message was already processed
function isMessageProcessed(messageId: string): boolean {
  cleanMessageCache()
  if (processedMessages.has(messageId)) {
    console.log(`⚠️ Duplicate message ignored: ${messageId}`)
    return true
  }
  processedMessages.set(messageId, Date.now())
  return false
}

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
    const messageId = message.id
    const fromPhone = message.from
    const businessPhoneId = value.metadata?.phone_number_id
    const contactName = value.contacts?.[0]?.profile?.name || 'Klant'
    
    // DEDUPLICATION: Skip if already processed (Meta sometimes sends twice)
    if (isMessageProcessed(messageId)) {
      return NextResponse.json({ status: 'ok' })
    }
    
    // Get message text - can be from text message or interactive list selection
    let messageText = ''
    if (message.type === 'text') {
      messageText = message.text?.body?.toLowerCase().trim() || ''
    } else if (message.type === 'interactive') {
      // User selected from a list or button
      messageText = message.interactive?.list_reply?.id || 
                    message.interactive?.button_reply?.id || ''
    }

    console.log(`📱 Message from ${fromPhone}: "${messageText}" (type: ${message.type})`)

    // Find tenant by WhatsApp phone number ID
    const tenant = await findTenantByWhatsAppPhone(businessPhoneId)
    if (!tenant) {
      console.log('❌ No tenant found for this phone number ID')
      return NextResponse.json({ status: 'ok' })
    }

    console.log(`🏪 Tenant found: ${tenant.tenant_slug}`)

    // Mark message as read (blue checkmarks for customer)
    await markMessageAsRead(businessPhoneId, message.id, tenant.access_token)

    // Check if customer has a saved language preference
    const savedLanguage = await getCustomerLanguage(tenant.tenant_slug, fromPhone)
    
    // Reset command - clears language preference
    if (messageText === 'reset' || messageText === 'taal' || messageText === 'language') {
      await clearCustomerLanguage(tenant.tenant_slug, fromPhone)
      await sendLanguageMenu(businessPhoneId, fromPhone, tenant.access_token, tenant.business_name)
      return NextResponse.json({ status: 'ok' })
    }
    
    // Check if customer is selecting a language (all 9 supported languages)
    const validLanguages = ['nl', 'en', 'fr', 'de', 'es', 'it', 'ja', 'zh', 'ar']
    if (validLanguages.includes(messageText)) {
      await saveCustomerLanguage(tenant.tenant_slug, fromPhone, messageText)
      await sendWelcomeWithShopLink(businessPhoneId, fromPhone, tenant, contactName, messageText)
      return NextResponse.json({ status: 'ok' })
    }
    
    // If no language saved, send language selection menu first
    if (!savedLanguage) {
      await sendLanguageMenu(businessPhoneId, fromPhone, tenant.access_token, tenant.business_name)
      return NextResponse.json({ status: 'ok' })
    }
    
    // Customer has language preference, send welcome in that language
    await sendWelcomeWithShopLink(businessPhoneId, fromPhone, tenant, contactName, savedLanguage)

    return NextResponse.json({ status: 'ok' })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json({ status: 'error' }, { status: 500 })
  }
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

// Get customer's saved language preference
async function getCustomerLanguage(tenantSlug: string, customerPhone: string): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('data')
    .eq('tenant_slug', tenantSlug)
    .eq('phone', customerPhone)
    .single()
  
  // Language is stored in the JSONB data column
  return data?.data?.language || null
}

// Clear customer's language preference
async function clearCustomerLanguage(tenantSlug: string, customerPhone: string) {
  await supabaseAdmin
    .from('whatsapp_sessions')
    .delete()
    .eq('tenant_slug', tenantSlug)
    .eq('phone', customerPhone)
  console.log(`🗑️ Cleared language preference for ${customerPhone}`)
}

// Save customer's language preference
async function saveCustomerLanguage(tenantSlug: string, customerPhone: string, language: string) {
  // First check if session exists
  const { data: existing } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('id, data')
    .eq('tenant_slug', tenantSlug)
    .eq('phone', customerPhone)
    .single()
  
  if (existing) {
    // Update existing session
    await supabaseAdmin
      .from('whatsapp_sessions')
      .update({
        data: { ...existing.data, language },
        updated_at: new Date().toISOString()
      })
      .eq('id', existing.id)
  } else {
    // Create new session
    await supabaseAdmin
      .from('whatsapp_sessions')
      .insert({
        tenant_slug: tenantSlug,
        phone: customerPhone,
        state: 'welcome',
        data: { language }
      })
  }
  console.log(`💾 Saved language preference: ${language} for ${customerPhone}`)
}

// Send language selection menu as interactive list
async function sendLanguageMenu(
  phoneNumberId: string,
  toPhone: string,
  accessToken: string,
  businessName: string
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
      to: toPhone,
      type: 'interactive',
      interactive: {
        type: 'list',
        body: {
          text: `🌍 Welcome to ${businessName}!\n\nChoose your language / Kies je taal:`
        },
        action: {
          button: '🌍 Select Language',
          sections: [{
            title: 'Languages',
            rows: [
              { id: 'nl', title: '🇳🇱 Nederlands' },
              { id: 'en', title: '🇬🇧 English' },
              { id: 'fr', title: '🇫🇷 Français' },
              { id: 'de', title: '🇩🇪 Deutsch' },
              { id: 'es', title: '🇪🇸 Español' },
              { id: 'it', title: '🇮🇹 Italiano' },
              { id: 'ja', title: '🇯🇵 日本語' },
              { id: 'zh', title: '🇨🇳 中文' },
              { id: 'ar', title: '🇸🇦 العربية' }
            ]
          }]
        }
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ Language menu error:', error)
    // No fallback - only log the error
  } else {
    console.log(`🌍 Language menu sent to ${toPhone}`)
  }
}

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

// Translations for welcome messages (all 9 languages)
// Made larger with more spacing and text to fill screen
const WELCOME_MESSAGES: Record<string, { body: string; button: string; tip: string }> = {
  nl: {
    body: '🎉 *Welkom bij {business}!*\n\n━━━━━━━━━━━━━━━━━━━━\n\n📱 Bestel gemakkelijk via onze webshop\n\n✅ Kies je favoriete gerechten\n✅ Betaal veilig online of bij afhalen\n✅ Ontvang updates via WhatsApp\n\n━━━━━━━━━━━━━━━━━━━━\n\n👇 *Klik hieronder om te bestellen*',
    button: '🍔 BESTELLEN',
    tip: '💡 Tip: Stuur ons altijd BESTEL om de shop te openen!'
  },
  en: {
    body: '🎉 *Welcome to {business}!*\n\n━━━━━━━━━━━━━━━━━━━━\n\n📱 Order easily via our webshop\n\n✅ Choose your favorite dishes\n✅ Pay securely online or at pickup\n✅ Receive updates via WhatsApp\n\n━━━━━━━━━━━━━━━━━━━━\n\n👇 *Click below to order*',
    button: '🍔 ORDER NOW',
    tip: '💡 Tip: Always send ORDER to open the shop!'
  },
  fr: {
    body: '🎉 *Bienvenue chez {business}!*\n\n━━━━━━━━━━━━━━━━━━━━\n\n📱 Commandez facilement via notre boutique\n\n✅ Choisissez vos plats préférés\n✅ Payez en ligne ou au retrait\n✅ Recevez des mises à jour via WhatsApp\n\n━━━━━━━━━━━━━━━━━━━━\n\n👇 *Cliquez ci-dessous pour commander*',
    button: '🍔 COMMANDER',
    tip: '💡 Conseil: Envoyez COMMANDER pour ouvrir la boutique!'
  },
  de: {
    body: '🎉 *Willkommen bei {business}!*\n\n━━━━━━━━━━━━━━━━━━━━\n\n📱 Bestellen Sie einfach über unseren Webshop\n\n✅ Wählen Sie Ihre Lieblingsgerichte\n✅ Zahlen Sie sicher online oder bei Abholung\n✅ Erhalten Sie Updates via WhatsApp\n\n━━━━━━━━━━━━━━━━━━━━\n\n👇 *Klicken Sie unten um zu bestellen*',
    button: '🍔 BESTELLEN',
    tip: '💡 Tipp: Senden Sie BESTELLEN um den Shop zu öffnen!'
  },
  es: {
    body: '🎉 *¡Bienvenido a {business}!*\n\n━━━━━━━━━━━━━━━━━━━━\n\n📱 Pide fácilmente en nuestra tienda\n\n✅ Elige tus platos favoritos\n✅ Paga seguro online o al recoger\n✅ Recibe actualizaciones por WhatsApp\n\n━━━━━━━━━━━━━━━━━━━━\n\n👇 *Haz clic abajo para pedir*',
    button: '🍔 PEDIR',
    tip: '💡 Consejo: ¡Envía PEDIR para abrir la tienda!'
  },
  it: {
    body: '🎉 *Benvenuto da {business}!*\n\n━━━━━━━━━━━━━━━━━━━━\n\n📱 Ordina facilmente dal nostro negozio\n\n✅ Scegli i tuoi piatti preferiti\n✅ Paga sicuro online o al ritiro\n✅ Ricevi aggiornamenti via WhatsApp\n\n━━━━━━━━━━━━━━━━━━━━\n\n👇 *Clicca sotto per ordinare*',
    button: '🍔 ORDINA',
    tip: '💡 Consiglio: Invia ORDINA per aprire il negozio!'
  },
  ja: {
    body: '🎉 *{business}へようこそ!*\n\n━━━━━━━━━━━━━━━━━━━━\n\n📱 ウェブショップで簡単注文\n\n✅ お気に入りの料理を選択\n✅ オンラインまたは受取時に安全にお支払い\n✅ WhatsAppで更新を受け取る\n\n━━━━━━━━━━━━━━━━━━━━\n\n👇 *下をクリックして注文*',
    button: '🍔 注文する',
    tip: '💡 ヒント: 注文と送信してショップを開きます!'
  },
  zh: {
    body: '🎉 *欢迎来到 {business}!*\n\n━━━━━━━━━━━━━━━━━━━━\n\n📱 通过我们的网店轻松订购\n\n✅ 选择您喜爱的菜品\n✅ 在线或取货时安全付款\n✅ 通过WhatsApp接收更新\n\n━━━━━━━━━━━━━━━━━━━━\n\n👇 *点击下方下单*',
    button: '🍔 下单',
    tip: '💡 提示: 发送 下单 打开商店!'
  },
  ar: {
    body: '🎉 *مرحباً بك في {business}!*\n\n━━━━━━━━━━━━━━━━━━━━\n\n📱 اطلب بسهولة من متجرنا\n\n✅ اختر أطباقك المفضلة\n✅ ادفع بأمان عبر الإنترنت أو عند الاستلام\n✅ احصل على تحديثات عبر واتساب\n\n━━━━━━━━━━━━━━━━━━━━\n\n👇 *انقر أدناه للطلب*',
    button: '🍔 اطلب الآن',
    tip: '💡 نصيحة: أرسل اطلب لفتح المتجر!'
  }
}

async function sendWelcomeWithShopLink(
  phoneNumberId: string,
  toPhone: string,
  tenant: any,
  customerName: string,
  language: string = 'nl'
) {
  console.log(`📤 Sending welcome message to ${toPhone} in ${language}`)

  const messages = WELCOME_MESSAGES[language] || WELCOME_MESSAGES.nl
  const bodyText = messages.body.replace('{business}', tenant.business_name)

  // Send professional welcome with image + CTA button
  await sendImageWithCTA(phoneNumberId, toPhone, tenant.access_token, {
    imageUrl: tenant.cover_image_url,
    body: bodyText,
    buttonText: messages.button,
    buttonUrl: `${tenant.shop_url}?wa=${toPhone}&lang=${language}`
  })

  console.log(`✅ Welcome message sent to ${toPhone} in ${language}`)
}

// Mark message as read (blue checkmarks)
async function markMessageAsRead(
  phoneNumberId: string,
  messageId: string,
  accessToken: string
) {
  try {
    await fetch(`${WHATSAPP_API_URL}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: messageId
      })
    })
    console.log('✅ Message marked as read')
  } catch (error) {
    console.error('❌ Failed to mark as read:', error)
  }
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
    // Don't send fallback - prevents duplicate messages
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

