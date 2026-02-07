'use server'

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

// Verify webhook (GET request from Meta)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  // Get verify token from environment
  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ WhatsApp webhook verified')
    return new NextResponse(challenge, { status: 200 })
  }

  console.log('❌ WhatsApp webhook verification failed')
  return NextResponse.json({ error: 'Verification failed' }, { status: 403 })
}

// Handle incoming messages (POST request from Meta)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Log incoming webhook for debugging
    console.log('📱 WhatsApp Webhook:', JSON.stringify(body, null, 2))

    // Extract message data
    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value) {
      return NextResponse.json({ status: 'no value' })
    }

    // Get business phone number ID
    const businessPhoneId = value.metadata?.phone_number_id

    // Handle incoming messages
    if (value.messages) {
      for (const message of value.messages) {
        await handleIncomingMessage(message, businessPhoneId, value.contacts?.[0])
      }
    }

    // Handle message status updates
    if (value.statuses) {
      for (const status of value.statuses) {
        console.log(`📊 Message ${status.id} status: ${status.status}`)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ WhatsApp webhook error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Handle an incoming message
async function handleIncomingMessage(
  message: any, 
  businessPhoneId: string,
  contact: any
) {
  const fromPhone = message.from
  const messageType = message.type
  const customerName = contact?.profile?.name || 'Klant'

  console.log(`📨 Message from ${fromPhone} (${customerName}): ${messageType}`)

  // Find tenant by WhatsApp phone ID
  const tenant = await findTenantByWhatsAppPhone(businessPhoneId)
  if (!tenant) {
    console.log('❌ No tenant found for phone ID:', businessPhoneId)
    return
  }

  // Get or create conversation session
  const session = await getOrCreateSession(fromPhone, tenant.tenant_slug)

  // Handle different message types
  switch (messageType) {
    case 'text':
      await handleTextMessage(message.text.body, session, tenant, fromPhone, customerName, businessPhoneId)
      break
    case 'interactive':
      await handleInteractiveMessage(message.interactive, session, tenant, fromPhone, customerName, businessPhoneId)
      break
    case 'button':
      await handleButtonReply(message.button, session, tenant, fromPhone, customerName, businessPhoneId)
      break
    default:
      await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token,
        `Sorry, ik begrijp dit berichttype nog niet. Typ "menu" om te bestellen.`
      )
  }
}

// Find tenant by WhatsApp Business Phone ID
async function findTenantByWhatsAppPhone(phoneId: string) {
  const { data, error } = await supabaseAdmin
    .from('whatsapp_settings')
    .select('*')
    .eq('phone_number_id', phoneId)
    .eq('is_active', true)
    .single()

  return data
}

// Get or create a conversation session
async function getOrCreateSession(phone: string, tenantSlug: string) {
  // Check for existing session (within last 24 hours)
  const { data: existing } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', phone)
    .eq('tenant_slug', tenantSlug)
    .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) {
    return existing
  }

  // Create new session
  const { data: newSession, error } = await supabaseAdmin
    .from('whatsapp_sessions')
    .insert({
      phone,
      tenant_slug: tenantSlug,
      state: 'welcome',
      cart: [],
      data: {}
    })
    .select()
    .single()

  return newSession
}

// Update session state
async function updateSession(sessionId: string, updates: any) {
  await supabaseAdmin
    .from('whatsapp_sessions')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', sessionId)
}

// Handle text messages
async function handleTextMessage(
  text: string,
  session: any,
  tenant: any,
  fromPhone: string,
  customerName: string,
  businessPhoneId: string
) {
  const lowerText = text.toLowerCase().trim()

  // Reset commands
  if (['menu', 'bestellen', 'start', 'hallo', 'hello', 'hi'].includes(lowerText)) {
    await sendWelcomeMessage(businessPhoneId, fromPhone, tenant, customerName)
    await updateSession(session.id, { state: 'browsing', cart: [] })
    return
  }

  // Check cart
  if (['winkelwagen', 'cart', 'bestelling'].includes(lowerText)) {
    await sendCartSummary(businessPhoneId, fromPhone, tenant, session)
    return
  }

  // Help
  if (['help', 'hulp', '?'].includes(lowerText)) {
    await sendHelpMessage(businessPhoneId, fromPhone, tenant)
    return
  }

  // Handle based on session state
  switch (session.state) {
    case 'welcome':
    case 'browsing':
      await sendWelcomeMessage(businessPhoneId, fromPhone, tenant, customerName)
      await updateSession(session.id, { state: 'browsing' })
      break
    case 'awaiting_name':
      await updateSession(session.id, { 
        state: 'awaiting_phone_confirm',
        data: { ...session.data, customer_name: text }
      })
      await sendPhoneConfirmation(businessPhoneId, fromPhone, tenant, text)
      break
    case 'awaiting_notes':
      await updateSession(session.id, {
        state: 'awaiting_payment',
        data: { ...session.data, notes: text }
      })
      await sendPaymentOptions(businessPhoneId, fromPhone, tenant, session)
      break
    default:
      await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token,
        `Typ "menu" om ons menu te bekijken, of "winkelwagen" om je bestelling te zien.`
      )
  }
}

// Handle interactive messages (button clicks, list selections)
async function handleInteractiveMessage(
  interactive: any,
  session: any,
  tenant: any,
  fromPhone: string,
  customerName: string,
  businessPhoneId: string
) {
  const type = interactive.type

  if (type === 'button_reply') {
    const buttonId = interactive.button_reply.id
    await handleButtonAction(buttonId, session, tenant, fromPhone, customerName, businessPhoneId)
  } else if (type === 'list_reply') {
    const listId = interactive.list_reply.id
    await handleListSelection(listId, session, tenant, fromPhone, customerName, businessPhoneId)
  }
}

// Handle button replies
async function handleButtonReply(
  button: any,
  session: any,
  tenant: any,
  fromPhone: string,
  customerName: string,
  businessPhoneId: string
) {
  const buttonId = button.payload
  await handleButtonAction(buttonId, session, tenant, fromPhone, customerName, businessPhoneId)
}

// Handle button actions
async function handleButtonAction(
  buttonId: string,
  session: any,
  tenant: any,
  fromPhone: string,
  customerName: string,
  businessPhoneId: string
) {
  console.log(`🔘 Button action: ${buttonId}`)

  // Parse button ID
  if (buttonId === 'view_menu') {
    await sendCategoryList(businessPhoneId, fromPhone, tenant)
    await updateSession(session.id, { state: 'browsing' })
  } else if (buttonId === 'view_cart') {
    await sendCartSummary(businessPhoneId, fromPhone, tenant, session)
  } else if (buttonId === 'checkout') {
    if (!session.cart || session.cart.length === 0) {
      await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token,
        `Je winkelwagen is leeg. Bekijk eerst ons menu om producten toe te voegen.`
      )
      return
    }
    await updateSession(session.id, { state: 'awaiting_name' })
    await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token,
      `Perfect! Om je bestelling af te ronden, wat is je naam?`
    )
  } else if (buttonId === 'pay_pickup') {
    await createOrder(session, tenant, fromPhone, customerName, 'pickup', businessPhoneId)
  } else if (buttonId === 'pay_online') {
    // For now, redirect to pickup - online payment can be added later
    await createOrder(session, tenant, fromPhone, customerName, 'pickup', businessPhoneId)
  } else if (buttonId === 'confirm_phone') {
    await updateSession(session.id, { state: 'awaiting_notes' })
    await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token,
      `Heb je nog opmerkingen voor je bestelling? (Typ "nee" als je geen opmerkingen hebt)`
    )
  } else if (buttonId === 'cancel_order') {
    await updateSession(session.id, { state: 'browsing', cart: [], data: {} })
    await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token,
      `Bestelling geannuleerd. Typ "menu" om opnieuw te beginnen.`
    )
  } else if (buttonId.startsWith('cat_')) {
    const categoryId = buttonId.replace('cat_', '')
    await sendProductsInCategory(businessPhoneId, fromPhone, tenant, categoryId)
  } else if (buttonId.startsWith('add_')) {
    const productId = buttonId.replace('add_', '')
    await addProductToCart(session, tenant, fromPhone, productId, businessPhoneId)
  } else if (buttonId.startsWith('remove_')) {
    const productId = buttonId.replace('remove_', '')
    await removeProductFromCart(session, tenant, fromPhone, productId, businessPhoneId)
  }
}

// Handle list selection
async function handleListSelection(
  listId: string,
  session: any,
  tenant: any,
  fromPhone: string,
  customerName: string,
  businessPhoneId: string
) {
  console.log(`📋 List selection: ${listId}`)

  if (listId.startsWith('cat_')) {
    const categoryId = listId.replace('cat_', '')
    await sendProductsInCategory(businessPhoneId, fromPhone, tenant, categoryId)
  } else if (listId.startsWith('prod_')) {
    const productId = listId.replace('prod_', '')
    await sendProductDetail(businessPhoneId, fromPhone, tenant, productId, session)
  }
}

// Send welcome message with buttons
async function sendWelcomeMessage(
  businessPhoneId: string,
  toPhone: string,
  tenant: any,
  customerName: string
) {
  // Get business info
  const { data: settings } = await supabaseAdmin
    .from('tenant_settings')
    .select('business_name, tagline')
    .eq('tenant_slug', tenant.tenant_slug)
    .single()

  const businessName = settings?.business_name || 'Onze Zaak'
  const tagline = settings?.tagline || 'Welkom!'

  await sendInteractiveButtons(
    businessPhoneId,
    toPhone,
    tenant.access_token,
    {
      header: {
        type: 'text',
        text: `👋 Welkom ${customerName}!`
      },
      body: {
        text: `Bij *${businessName}*\n${tagline}\n\nWat wil je doen?`
      },
      footer: {
        text: 'Bestel eenvoudig via WhatsApp'
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'view_menu', title: '📋 Bekijk Menu' } },
          { type: 'reply', reply: { id: 'view_cart', title: '🛒 Winkelwagen' } }
        ]
      }
    }
  )
}

// Send category list
async function sendCategoryList(
  businessPhoneId: string,
  toPhone: string,
  tenant: any
) {
  // Get categories
  const { data: categories } = await supabaseAdmin
    .from('menu_categories')
    .select('*')
    .eq('tenant_slug', tenant.tenant_slug)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (!categories || categories.length === 0) {
    await sendTextMessage(businessPhoneId, toPhone, tenant.access_token,
      `Sorry, er zijn momenteel geen producten beschikbaar.`
    )
    return
  }

  // Create list sections
  const rows = categories.slice(0, 10).map(cat => ({
    id: `cat_${cat.id}`,
    title: cat.name.substring(0, 24),
    description: cat.description?.substring(0, 72) || ''
  }))

  await sendInteractiveList(
    businessPhoneId,
    toPhone,
    tenant.access_token,
    {
      header: {
        type: 'text',
        text: '📋 Ons Menu'
      },
      body: {
        text: 'Kies een categorie om de producten te bekijken:'
      },
      footer: {
        text: 'Tip: Typ "menu" om terug te gaan'
      },
      action: {
        button: 'Kies Categorie',
        sections: [
          {
            title: 'Categorieën',
            rows
          }
        ]
      }
    }
  )
}

// Send products in category
async function sendProductsInCategory(
  businessPhoneId: string,
  toPhone: string,
  tenant: any,
  categoryId: string
) {
  // Get category name
  const { data: category } = await supabaseAdmin
    .from('menu_categories')
    .select('name')
    .eq('id', categoryId)
    .single()

  // Get products
  const { data: products } = await supabaseAdmin
    .from('menu_products')
    .select('*')
    .eq('tenant_slug', tenant.tenant_slug)
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (!products || products.length === 0) {
    await sendTextMessage(businessPhoneId, toPhone, tenant.access_token,
      `Geen producten gevonden in deze categorie.`
    )
    return
  }

  // Create list of products
  const rows = products.slice(0, 10).map(prod => {
    const price = prod.is_promo && prod.promo_price ? prod.promo_price : prod.price
    return {
      id: `prod_${prod.id}`,
      title: prod.name.substring(0, 24),
      description: `€${price.toFixed(2)} ${prod.is_promo ? '🎁 ACTIE' : ''}`
    }
  })

  await sendInteractiveList(
    businessPhoneId,
    toPhone,
    tenant.access_token,
    {
      header: {
        type: 'text',
        text: `${category?.name || 'Producten'}`
      },
      body: {
        text: 'Kies een product voor meer details:'
      },
      footer: {
        text: 'Typ "menu" voor andere categorieën'
      },
      action: {
        button: 'Kies Product',
        sections: [
          {
            title: category?.name || 'Producten',
            rows
          }
        ]
      }
    }
  )
}

// Send product detail with add button
async function sendProductDetail(
  businessPhoneId: string,
  toPhone: string,
  tenant: any,
  productId: string,
  session: any
) {
  const { data: product } = await supabaseAdmin
    .from('menu_products')
    .select('*')
    .eq('id', productId)
    .single()

  if (!product) {
    await sendTextMessage(businessPhoneId, toPhone, tenant.access_token,
      `Product niet gevonden.`
    )
    return
  }

  const price = product.is_promo && product.promo_price ? product.promo_price : product.price
  const originalPrice = product.is_promo && product.promo_price ? ` ~~€${product.price.toFixed(2)}~~` : ''

  let bodyText = `*${product.name}*\n\n`
  if (product.description) {
    bodyText += `${product.description}\n\n`
  }
  bodyText += `💰 *€${price.toFixed(2)}*${originalPrice}`
  if (product.is_promo) {
    bodyText += `\n🎁 *ACTIEPRIJS!*`
  }

  // Check if product has options
  const { data: optionLinks } = await supabaseAdmin
    .from('product_option_links')
    .select('option_id')
    .eq('product_id', productId)

  const hasOptions = optionLinks && optionLinks.length > 0

  await sendInteractiveButtons(
    businessPhoneId,
    toPhone,
    tenant.access_token,
    {
      header: product.image_url ? {
        type: 'image',
        image: { link: product.image_url }
      } : undefined,
      body: {
        text: bodyText
      },
      footer: {
        text: hasOptions ? 'Dit product heeft extra opties' : ''
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: `add_${productId}`, title: '➕ Toevoegen' } },
          { type: 'reply', reply: { id: 'view_menu', title: '📋 Terug naar Menu' } },
          { type: 'reply', reply: { id: 'view_cart', title: '🛒 Winkelwagen' } }
        ]
      }
    }
  )
}

// Add product to cart
async function addProductToCart(
  session: any,
  tenant: any,
  fromPhone: string,
  productId: string,
  businessPhoneId: string
) {
  const { data: product } = await supabaseAdmin
    .from('menu_products')
    .select('*')
    .eq('id', productId)
    .single()

  if (!product) {
    await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token,
      `Product niet gevonden.`
    )
    return
  }

  const price = product.is_promo && product.promo_price ? product.promo_price : product.price

  // Update cart
  const cart = session.cart || []
  const existingItem = cart.find((item: any) => item.product_id === productId)
  
  if (existingItem) {
    existingItem.quantity += 1
  } else {
    cart.push({
      product_id: productId,
      product_name: product.name,
      price,
      quantity: 1,
      options: []
    })
  }

  await updateSession(session.id, { cart })

  const totalItems = cart.reduce((sum: number, item: any) => sum + item.quantity, 0)
  const totalPrice = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)

  await sendInteractiveButtons(
    businessPhoneId,
    fromPhone,
    tenant.access_token,
    {
      body: {
        text: `✅ *${product.name}* toegevoegd!\n\n🛒 Winkelwagen: ${totalItems} item(s) - €${totalPrice.toFixed(2)}`
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'view_menu', title: '➕ Meer toevoegen' } },
          { type: 'reply', reply: { id: 'view_cart', title: '🛒 Bekijk Wagen' } },
          { type: 'reply', reply: { id: 'checkout', title: '✅ Afrekenen' } }
        ]
      }
    }
  )
}

// Remove product from cart
async function removeProductFromCart(
  session: any,
  tenant: any,
  fromPhone: string,
  productId: string,
  businessPhoneId: string
) {
  const cart = session.cart || []
  const itemIndex = cart.findIndex((item: any) => item.product_id === productId)
  
  if (itemIndex > -1) {
    if (cart[itemIndex].quantity > 1) {
      cart[itemIndex].quantity -= 1
    } else {
      cart.splice(itemIndex, 1)
    }
  }

  await updateSession(session.id, { cart })

  await sendCartSummary(businessPhoneId, fromPhone, tenant, { ...session, cart })
}

// Send cart summary
async function sendCartSummary(
  businessPhoneId: string,
  toPhone: string,
  tenant: any,
  session: any
) {
  const cart = session.cart || []

  if (cart.length === 0) {
    await sendInteractiveButtons(
      businessPhoneId,
      toPhone,
      tenant.access_token,
      {
        body: {
          text: `🛒 Je winkelwagen is leeg.\n\nBekijk ons menu om producten toe te voegen!`
        },
        action: {
          buttons: [
            { type: 'reply', reply: { id: 'view_menu', title: '📋 Bekijk Menu' } }
          ]
        }
      }
    )
    return
  }

  let cartText = `🛒 *Je Winkelwagen*\n\n`
  let total = 0

  cart.forEach((item: any) => {
    const itemTotal = item.price * item.quantity
    total += itemTotal
    cartText += `${item.quantity}x ${item.product_name}\n`
    cartText += `   €${item.price.toFixed(2)} × ${item.quantity} = €${itemTotal.toFixed(2)}\n\n`
  })

  // Add VAT info (21% included)
  const vatAmount = total * 0.21 / 1.21
  cartText += `━━━━━━━━━━━━━━━━━━━━\n`
  cartText += `*Totaal: €${total.toFixed(2)}*\n`
  cartText += `(incl. 21% BTW: €${vatAmount.toFixed(2)})`

  await sendInteractiveButtons(
    businessPhoneId,
    toPhone,
    tenant.access_token,
    {
      body: {
        text: cartText
      },
      footer: {
        text: 'Klaar om te bestellen?'
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'checkout', title: '✅ Afrekenen' } },
          { type: 'reply', reply: { id: 'view_menu', title: '➕ Meer toevoegen' } }
        ]
      }
    }
  )
}

// Send phone confirmation
async function sendPhoneConfirmation(
  businessPhoneId: string,
  toPhone: string,
  tenant: any,
  customerName: string
) {
  await sendInteractiveButtons(
    businessPhoneId,
    toPhone,
    tenant.access_token,
    {
      body: {
        text: `Bedankt ${customerName}!\n\nWe gebruiken dit WhatsApp nummer (${toPhone}) om je te bereiken als je bestelling klaar is.\n\nKlopt dit?`
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'confirm_phone', title: '✅ Klopt!' } },
          { type: 'reply', reply: { id: 'cancel_order', title: '❌ Annuleren' } }
        ]
      }
    }
  )
}

// Send payment options
async function sendPaymentOptions(
  businessPhoneId: string,
  toPhone: string,
  tenant: any,
  session: any
) {
  const cart = session.cart || []
  const total = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)

  await sendInteractiveButtons(
    businessPhoneId,
    toPhone,
    tenant.access_token,
    {
      body: {
        text: `💳 *Hoe wil je betalen?*\n\nTotaal: *€${total.toFixed(2)}*`
      },
      footer: {
        text: 'Kies je betaalmethode'
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'pay_pickup', title: '💵 Betalen bij ophalen' } },
          { type: 'reply', reply: { id: 'cancel_order', title: '❌ Annuleren' } }
        ]
      }
    }
  )
}

// Create order in database
async function createOrder(
  session: any,
  tenant: any,
  fromPhone: string,
  customerName: string,
  paymentType: string,
  businessPhoneId: string
) {
  const cart = session.cart || []
  if (cart.length === 0) {
    await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token,
      `Je winkelwagen is leeg. Typ "menu" om te bestellen.`
    )
    return
  }

  const total = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)

  // Get next order number
  const { data: lastOrder } = await supabaseAdmin
    .from('orders')
    .select('order_number')
    .eq('tenant_slug', tenant.tenant_slug)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const orderNumber = (lastOrder?.order_number || 0) + 1

  // Format items for order
  const items = cart.map((item: any) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    name: item.product_name,
    quantity: item.quantity,
    price: item.price,
    options: item.options || [],
    notes: ''
  }))

  // Create order
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .insert({
      tenant_slug: tenant.tenant_slug,
      order_number: orderNumber,
      customer_name: session.data?.customer_name || customerName,
      customer_phone: fromPhone,
      customer_email: null,
      order_type: 'pickup',
      status: 'confirmed',
      payment_status: paymentType === 'online' ? 'paid' : 'pending',
      payment_method: paymentType === 'online' ? 'online' : 'cash',
      items: JSON.stringify(items),
      subtotal: total,
      total,
      customer_notes: session.data?.notes === 'nee' ? null : session.data?.notes,
      source: 'whatsapp'
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Order creation error:', error)
    await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token,
      `Sorry, er ging iets mis bij het plaatsen van je bestelling. Probeer het opnieuw of neem contact op met de zaak.`
    )
    return
  }

  // Clear session
  await updateSession(session.id, { state: 'completed', cart: [], data: {} })

  // Send order confirmation
  let confirmationText = `🎉 *Bestelling Geplaatst!*\n\n`
  confirmationText += `📋 Bestelnummer: *#${orderNumber}*\n\n`
  
  items.forEach((item: any) => {
    confirmationText += `${item.quantity}x ${item.name}\n`
  })
  
  confirmationText += `\n━━━━━━━━━━━━━━━━━━━━\n`
  confirmationText += `💰 Totaal: *€${total.toFixed(2)}*\n\n`
  confirmationText += `We sturen je een bericht als je bestelling klaar is! 👨‍🍳`

  await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token, confirmationText)

  console.log(`✅ Order #${orderNumber} created for ${fromPhone}`)
}

// Send help message
async function sendHelpMessage(
  businessPhoneId: string,
  toPhone: string,
  tenant: any
) {
  await sendTextMessage(
    businessPhoneId,
    toPhone,
    tenant.access_token,
    `📚 *Hulp*\n\n` +
    `Typ een van deze woorden:\n\n` +
    `• *menu* - Bekijk ons menu\n` +
    `• *winkelwagen* - Bekijk je bestelling\n` +
    `• *help* - Toon dit bericht\n\n` +
    `Bij problemen, neem contact op met de zaak.`
  )
}

// =====================================================
// WhatsApp API Helper Functions
// =====================================================

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
    console.error('❌ WhatsApp API error:', error)
  }
}

async function sendInteractiveButtons(
  phoneNumberId: string,
  to: string,
  accessToken: string,
  interactive: any
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
      type: 'interactive',
      interactive: {
        type: 'button',
        ...interactive
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ WhatsApp API error:', error)
  }
}

async function sendInteractiveList(
  phoneNumberId: string,
  to: string,
  accessToken: string,
  interactive: any
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
      type: 'interactive',
      interactive: {
        type: 'list',
        ...interactive
      }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ WhatsApp API error:', error)
  }
}

// Export function to send order status updates
export async function sendOrderStatusUpdate(
  tenantSlug: string,
  orderNumber: number,
  customerPhone: string,
  status: 'preparing' | 'ready' | 'completed'
) {
  // Get tenant's WhatsApp settings
  const { data: settings } = await supabaseAdmin
    .from('whatsapp_settings')
    .select('*')
    .eq('tenant_slug', tenantSlug)
    .eq('is_active', true)
    .single()

  if (!settings) {
    console.log('❌ No WhatsApp settings for tenant:', tenantSlug)
    return false
  }

  let message = ''
  switch (status) {
    case 'preparing':
      message = `👨‍🍳 Je bestelling #${orderNumber} wordt nu bereid!\n\nWe laten je weten wanneer het klaar is.`
      break
    case 'ready':
      message = `🔔 *Je bestelling #${orderNumber} is KLAAR!*\n\nJe kunt het nu ophalen. Tot zo! 🎉`
      break
    case 'completed':
      message = `✅ Bedankt voor je bestelling #${orderNumber}!\n\nWe hopen je snel weer te zien! 😊`
      break
  }

  await sendTextMessage(
    settings.phone_number_id,
    customerPhone,
    settings.access_token,
    message
  )

  return true
}
