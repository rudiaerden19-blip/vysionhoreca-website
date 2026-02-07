import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const WHATSAPP_API_VERSION = 'v24.0'
const WHATSAPP_API_URL = `https://graph.facebook.com/${WHATSAPP_API_VERSION}`

// Status messages in 11 languages
type LanguageCode = 'nl' | 'fr' | 'en' | 'de' | 'es' | 'it' | 'pt' | 'tr' | 'pl' | 'zh' | 'ja'

const statusMessages: Record<LanguageCode, Record<string, string>> = {
  nl: {
    preparing: '👨‍🍳 Je bestelling #{order} wordt nu bereid!\n\nNog ongeveer 10 minuten ⏳',
    ready: '🔔 *Je bestelling #{order} is KLAAR!*\n\nJe kunt het nu ophalen. Tot zo! 🎉',
    out_for_delivery: '🚗 Je bestelling #{order} is onderweg!\n\nOnze bezorger komt eraan.',
    delivered: '✅ Je bestelling #{order} is bezorgd!\n\nEet smakelijk! 😊',
    completed: '✅ Bedankt voor je bestelling #{order}!\n\nWe hopen je snel weer te zien! 😊\nTot de volgende keer!',
    cancelled: '❌ Je bestelling #{order} is helaas geannuleerd.\n\nNeem contact op met de zaak voor meer informatie.'
  },
  fr: {
    preparing: '👨‍🍳 Votre commande #{order} est en préparation!\n\nEncore environ 10 minutes ⏳',
    ready: '🔔 *Votre commande #{order} est PRÊTE!*\n\nVous pouvez venir la chercher. À bientôt! 🎉',
    out_for_delivery: '🚗 Votre commande #{order} est en route!\n\nNotre livreur arrive.',
    delivered: '✅ Votre commande #{order} a été livrée!\n\nBon appétit! 😊',
    completed: '✅ Merci pour votre commande #{order}!\n\nNous espérons vous revoir bientôt! 😊\nÀ bientôt!',
    cancelled: '❌ Votre commande #{order} a été annulée.\n\nContactez le restaurant pour plus d\'informations.'
  },
  en: {
    preparing: '👨‍🍳 Your order #{order} is being prepared!\n\nAbout 10 minutes remaining ⏳',
    ready: '🔔 *Your order #{order} is READY!*\n\nYou can pick it up now. See you soon! 🎉',
    out_for_delivery: '🚗 Your order #{order} is on its way!\n\nOur driver is coming.',
    delivered: '✅ Your order #{order} has been delivered!\n\nEnjoy your meal! 😊',
    completed: '✅ Thank you for your order #{order}!\n\nWe hope to see you again soon! 😊\nSee you next time!',
    cancelled: '❌ Your order #{order} has been cancelled.\n\nPlease contact the restaurant for more information.'
  },
  de: {
    preparing: '👨‍🍳 Ihre Bestellung #{order} wird zubereitet!\n\nNoch etwa 10 Minuten ⏳',
    ready: '🔔 *Ihre Bestellung #{order} ist FERTIG!*\n\nSie können sie jetzt abholen. Bis gleich! 🎉',
    out_for_delivery: '🚗 Ihre Bestellung #{order} ist unterwegs!\n\nUnser Fahrer kommt.',
    delivered: '✅ Ihre Bestellung #{order} wurde geliefert!\n\nGuten Appetit! 😊',
    completed: '✅ Danke für Ihre Bestellung #{order}!\n\nWir hoffen, Sie bald wiederzusehen! 😊\nBis zum nächsten Mal!',
    cancelled: '❌ Ihre Bestellung #{order} wurde storniert.\n\nKontaktieren Sie das Restaurant für weitere Informationen.'
  },
  es: {
    preparing: '👨‍🍳 ¡Tu pedido #{order} se está preparando!\n\nAproximadamente 10 minutos ⏳',
    ready: '🔔 *¡Tu pedido #{order} está LISTO!*\n\nPuedes recogerlo ahora. ¡Hasta pronto! 🎉',
    out_for_delivery: '🚗 ¡Tu pedido #{order} está en camino!\n\nNuestro repartidor está llegando.',
    delivered: '✅ ¡Tu pedido #{order} ha sido entregado!\n\n¡Buen provecho! 😊',
    completed: '✅ ¡Gracias por tu pedido #{order}!\n\n¡Esperamos verte pronto! 😊\n¡Hasta la próxima!',
    cancelled: '❌ Tu pedido #{order} ha sido cancelado.\n\nContacta con el restaurante para más información.'
  },
  it: {
    preparing: '👨‍🍳 Il tuo ordine #{order} è in preparazione!\n\nAncora circa 10 minuti ⏳',
    ready: '🔔 *Il tuo ordine #{order} è PRONTO!*\n\nPuoi ritirarlo ora. A presto! 🎉',
    out_for_delivery: '🚗 Il tuo ordine #{order} è in consegna!\n\nIl nostro corriere sta arrivando.',
    delivered: '✅ Il tuo ordine #{order} è stato consegnato!\n\nBuon appetito! 😊',
    completed: '✅ Grazie per il tuo ordine #{order}!\n\nSperiamo di rivederti presto! 😊\nAlla prossima!',
    cancelled: '❌ Il tuo ordine #{order} è stato annullato.\n\nContatta il ristorante per maggiori informazioni.'
  },
  pt: {
    preparing: '👨‍🍳 Seu pedido #{order} está sendo preparado!\n\nAproximadamente 10 minutos ⏳',
    ready: '🔔 *Seu pedido #{order} está PRONTO!*\n\nVocê pode retirar agora. Até logo! 🎉',
    out_for_delivery: '🚗 Seu pedido #{order} está a caminho!\n\nNosso entregador está chegando.',
    delivered: '✅ Seu pedido #{order} foi entregue!\n\nBom apetite! 😊',
    completed: '✅ Obrigado pelo seu pedido #{order}!\n\nEsperamos vê-lo em breve! 😊\nAté a próxima!',
    cancelled: '❌ Seu pedido #{order} foi cancelado.\n\nEntre em contato com o restaurante para mais informações.'
  },
  tr: {
    preparing: '👨‍🍳 Siparişiniz #{order} hazırlanıyor!\n\nYaklaşık 10 dakika ⏳',
    ready: '🔔 *Siparişiniz #{order} HAZIR!*\n\nŞimdi alabilirsiniz. Görüşmek üzere! 🎉',
    out_for_delivery: '🚗 Siparişiniz #{order} yola çıktı!\n\nKuryemiz geliyor.',
    delivered: '✅ Siparişiniz #{order} teslim edildi!\n\nAfiyet olsun! 😊',
    completed: '✅ Siparişiniz #{order} için teşekkürler!\n\nYakında tekrar görüşmek dileğiyle! 😊\nGörüşmek üzere!',
    cancelled: '❌ Siparişiniz #{order} iptal edildi.\n\nDaha fazla bilgi için restoranla iletişime geçin.'
  },
  pl: {
    preparing: '👨‍🍳 Twoje zamówienie #{order} jest przygotowywane!\n\nOkoło 10 minut ⏳',
    ready: '🔔 *Twoje zamówienie #{order} jest GOTOWE!*\n\nMożesz je teraz odebrać. Do zobaczenia! 🎉',
    out_for_delivery: '🚗 Twoje zamówienie #{order} jest w drodze!\n\nNasz kurier już jedzie.',
    delivered: '✅ Twoje zamówienie #{order} zostało dostarczone!\n\nSmacznego! 😊',
    completed: '✅ Dziękujemy za zamówienie #{order}!\n\nMamy nadzieję zobaczyć Cię wkrótce! 😊\nDo zobaczenia!',
    cancelled: '❌ Twoje zamówienie #{order} zostało anulowane.\n\nSkontaktuj się z restauracją po więcej informacji.'
  },
  zh: {
    preparing: '👨‍🍳 您的订单 #{order} 正在准备中！\n\n大约还需10分钟 ⏳',
    ready: '🔔 *您的订单 #{order} 已准备好！*\n\n您现在可以取餐了。再见！🎉',
    out_for_delivery: '🚗 您的订单 #{order} 正在配送中！\n\n我们的骑手即将到达。',
    delivered: '✅ 您的订单 #{order} 已送达！\n\n祝您用餐愉快！😊',
    completed: '✅ 感谢您的订单 #{order}！\n\n期待再次为您服务！😊\n下次再见！',
    cancelled: '❌ 您的订单 #{order} 已取消。\n\n请联系餐厅了解更多信息。'
  },
  ja: {
    preparing: '👨‍🍳 ご注文 #{order} を準備中です！\n\nあと約10分 ⏳',
    ready: '🔔 *ご注文 #{order} の準備ができました！*\n\n今すぐお受け取りいただけます。またのご来店をお待ちしております！🎉',
    out_for_delivery: '🚗 ご注文 #{order} は配達中です！\n\n配達員が向かっています。',
    delivered: '✅ ご注文 #{order} をお届けしました！\n\nごゆっくりお召し上がりください！😊',
    completed: '✅ ご注文 #{order} ありがとうございます！\n\nまたのご利用をお待ちしております！😊\nまたお会いしましょう！',
    cancelled: '❌ ご注文 #{order} はキャンセルされました。\n\n詳細についてはレストランにお問い合わせください。'
  }
}

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

    // Get customer's language preference from session
    const { data: session } = await supabaseAdmin
      .from('whatsapp_sessions')
      .select('data')
      .eq('phone', order.customer_phone)
      .eq('tenant_slug', tenantSlug)
      .order('updated_at', { ascending: false })
      .limit(1)
      .single()

    const lang = (session?.data?.language as LanguageCode) || 'nl'

    // Get message template for status
    const messageTemplate = statusMessages[lang]?.[status] || statusMessages.nl[status]
    
    if (!messageTemplate) {
      return NextResponse.json({ 
        success: true, 
        message: 'No notification for this status' 
      })
    }

    // Replace order number placeholder
    const message = messageTemplate.replace('{order}', order.order_number.toString())

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

    console.log(`✅ WhatsApp status update (${lang}) sent for order #${order.order_number}`)

    return NextResponse.json({ 
      success: true, 
      message: `Status update sent to ${order.customer_phone} in ${lang}` 
    })

  } catch (error) {
    console.error('❌ WhatsApp send-status error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
