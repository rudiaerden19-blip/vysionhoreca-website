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

// =====================================================
// TRANSLATIONS - 11 LANGUAGES
// =====================================================
type LanguageCode = 'nl' | 'fr' | 'en' | 'de' | 'es' | 'it' | 'pt' | 'tr' | 'pl' | 'zh' | 'ja'

const translations: Record<LanguageCode, Record<string, string>> = {
  nl: {
    // Greetings
    good_morning: 'Goedemorgen',
    good_afternoon: 'Goedemiddag', 
    good_evening: 'Goedenavond',
    // Language selection
    language_selection: '🌐 Taalkeuze',
    select_language: 'Kies je taal:',
    // Welcome
    welcome_to: 'Welkom bij',
    ready_to_order: 'Klaar om te bestellen?',
    order_easily: 'Bestel snel en makkelijk via WhatsApp',
    // Buttons
    btn_order: '🍔 Bestellen',
    btn_my_order: '🛒 Mijn Bestelling',
    btn_view_menu: '📋 Bekijk Menu',
    btn_add: '➕ Toevoegen',
    btn_back_menu: '📋 Terug naar Menu',
    btn_cart: '🛒 Winkelwagen',
    btn_add_more: '➕ Meer toevoegen',
    btn_view_cart: '🛒 Bekijk Bestelling',
    btn_checkout: '✅ Afrekenen',
    btn_confirm: '✅ Bevestigen',
    btn_cancel: '❌ Annuleren',
    btn_delivery: '🚗 Bezorgen',
    btn_pickup: '🏪 Ophalen',
    btn_pay_pickup: '💵 Betalen bij ophalen',
    btn_pay_online: '💳 Online betalen',
    // Menu
    our_menu: '📋 Ons Menu',
    choose_category: 'Kies een categorie:',
    choose_product: 'Kies een product:',
    no_products: 'Geen producten beschikbaar.',
    promo: '🎁 ACTIE',
    has_options: 'Dit product heeft extra opties',
    // Cart
    your_cart: '🛒 Je Bestelling',
    cart_empty: 'Je bestelling is leeg.',
    add_products: 'Bekijk ons menu om producten toe te voegen!',
    added_to_cart: 'toegevoegd!',
    items: 'item(s)',
    subtotal: 'Subtotaal',
    vat: 'BTW',
    total: 'Totaal',
    incl_vat: 'incl. 21% BTW',
    // Checkout
    delivery_option: '🚗 Hoe wil je je bestelling ontvangen?',
    enter_name: 'Wat is je naam?',
    enter_address: 'Wat is je adres voor bezorging?',
    confirm_phone: 'We gebruiken dit nummer om je te bereiken.',
    is_correct: 'Klopt dit?',
    any_notes: 'Heb je nog opmerkingen? (typ "nee" als niet)',
    payment_method: '💳 Hoe wil je betalen?',
    // Order confirmation
    order_placed: '🎉 Bestelling Geplaatst!',
    order_number: 'Bestelnummer',
    order_date: 'Datum',
    order_type_pickup: 'Ophalen',
    order_type_delivery: 'Bezorgen',
    we_notify: 'We sturen je een bericht als je bestelling klaar is!',
    // Status updates
    status_preparing: '👨‍🍳 Je bestelling wordt bereid!',
    status_ready_time: 'Nog ongeveer 10 minuten ⏳',
    status_ready: '🔔 Je bestelling is KLAAR!',
    status_pickup_now: 'Je kunt het nu ophalen.',
    status_delivered: '✅ Bezorgd!',
    status_thanks: 'Bedankt voor je bestelling! 😊',
    status_see_again: 'Tot de volgende keer!',
    // Errors
    error_generic: 'Er ging iets mis. Probeer opnieuw.',
    type_menu: 'Typ "menu" om te bestellen.',
    // Help
    help_title: '📚 Hulp',
    help_menu: 'menu - Bekijk ons menu',
    help_cart: 'bestelling - Bekijk je bestelling',
    help_help: 'help - Toon dit bericht',
  },
  fr: {
    good_morning: 'Bonjour',
    good_afternoon: 'Bon après-midi',
    good_evening: 'Bonsoir',
    language_selection: '🌐 Choix de langue',
    select_language: 'Choisissez votre langue:',
    welcome_to: 'Bienvenue chez',
    ready_to_order: 'Prêt à commander?',
    order_easily: 'Commandez facilement via WhatsApp',
    btn_order: '🍔 Commander',
    btn_my_order: '🛒 Ma Commande',
    btn_view_menu: '📋 Voir Menu',
    btn_add: '➕ Ajouter',
    btn_back_menu: '📋 Retour au Menu',
    btn_cart: '🛒 Panier',
    btn_add_more: '➕ Ajouter plus',
    btn_view_cart: '🛒 Voir Commande',
    btn_checkout: '✅ Payer',
    btn_confirm: '✅ Confirmer',
    btn_cancel: '❌ Annuler',
    btn_delivery: '🚗 Livraison',
    btn_pickup: '🏪 À emporter',
    btn_pay_pickup: '💵 Payer sur place',
    btn_pay_online: '💳 Payer en ligne',
    our_menu: '📋 Notre Menu',
    choose_category: 'Choisissez une catégorie:',
    choose_product: 'Choisissez un produit:',
    no_products: 'Aucun produit disponible.',
    promo: '🎁 PROMO',
    has_options: 'Ce produit a des options supplémentaires',
    your_cart: '🛒 Votre Commande',
    cart_empty: 'Votre panier est vide.',
    add_products: 'Consultez notre menu!',
    added_to_cart: 'ajouté!',
    items: 'article(s)',
    subtotal: 'Sous-total',
    vat: 'TVA',
    total: 'Total',
    incl_vat: 'TVA 21% incluse',
    delivery_option: '🚗 Comment souhaitez-vous recevoir votre commande?',
    enter_name: 'Quel est votre nom?',
    enter_address: 'Quelle est votre adresse de livraison?',
    confirm_phone: 'Nous utiliserons ce numéro pour vous contacter.',
    is_correct: 'Est-ce correct?',
    any_notes: 'Avez-vous des remarques? (tapez "non" si non)',
    payment_method: '💳 Comment souhaitez-vous payer?',
    order_placed: '🎉 Commande Passée!',
    order_number: 'Numéro de commande',
    order_date: 'Date',
    order_type_pickup: 'À emporter',
    order_type_delivery: 'Livraison',
    we_notify: 'Nous vous enverrons un message quand votre commande sera prête!',
    status_preparing: '👨‍🍳 Votre commande est en préparation!',
    status_ready_time: 'Encore environ 10 minutes ⏳',
    status_ready: '🔔 Votre commande est PRÊTE!',
    status_pickup_now: 'Vous pouvez venir la chercher.',
    status_delivered: '✅ Livré!',
    status_thanks: 'Merci pour votre commande! 😊',
    status_see_again: 'À bientôt!',
    error_generic: 'Une erreur est survenue. Réessayez.',
    type_menu: 'Tapez "menu" pour commander.',
    help_title: '📚 Aide',
    help_menu: 'menu - Voir notre menu',
    help_cart: 'commande - Voir votre commande',
    help_help: 'aide - Afficher ce message',
  },
  en: {
    good_morning: 'Good morning',
    good_afternoon: 'Good afternoon',
    good_evening: 'Good evening',
    language_selection: '🌐 Language Selection',
    select_language: 'Choose your language:',
    welcome_to: 'Welcome to',
    ready_to_order: 'Ready to order?',
    order_easily: 'Order quickly and easily via WhatsApp',
    btn_order: '🍔 Order Now',
    btn_my_order: '🛒 My Order',
    btn_view_menu: '📋 View Menu',
    btn_add: '➕ Add',
    btn_back_menu: '📋 Back to Menu',
    btn_cart: '🛒 Cart',
    btn_add_more: '➕ Add more',
    btn_view_cart: '🛒 View Order',
    btn_checkout: '✅ Checkout',
    btn_confirm: '✅ Confirm',
    btn_cancel: '❌ Cancel',
    btn_delivery: '🚗 Delivery',
    btn_pickup: '🏪 Pick up',
    btn_pay_pickup: '💵 Pay at pickup',
    btn_pay_online: '💳 Pay online',
    our_menu: '📋 Our Menu',
    choose_category: 'Choose a category:',
    choose_product: 'Choose a product:',
    no_products: 'No products available.',
    promo: '🎁 SALE',
    has_options: 'This product has extra options',
    your_cart: '🛒 Your Order',
    cart_empty: 'Your cart is empty.',
    add_products: 'Check out our menu to add products!',
    added_to_cart: 'added!',
    items: 'item(s)',
    subtotal: 'Subtotal',
    vat: 'VAT',
    total: 'Total',
    incl_vat: 'incl. 21% VAT',
    delivery_option: '🚗 How would you like to receive your order?',
    enter_name: 'What is your name?',
    enter_address: 'What is your delivery address?',
    confirm_phone: 'We will use this number to contact you.',
    is_correct: 'Is this correct?',
    any_notes: 'Any notes? (type "no" if none)',
    payment_method: '💳 How would you like to pay?',
    order_placed: '🎉 Order Placed!',
    order_number: 'Order number',
    order_date: 'Date',
    order_type_pickup: 'Pickup',
    order_type_delivery: 'Delivery',
    we_notify: 'We will notify you when your order is ready!',
    status_preparing: '👨‍🍳 Your order is being prepared!',
    status_ready_time: 'About 10 minutes remaining ⏳',
    status_ready: '🔔 Your order is READY!',
    status_pickup_now: 'You can pick it up now.',
    status_delivered: '✅ Delivered!',
    status_thanks: 'Thank you for your order! 😊',
    status_see_again: 'See you next time!',
    error_generic: 'Something went wrong. Please try again.',
    type_menu: 'Type "menu" to order.',
    help_title: '📚 Help',
    help_menu: 'menu - View our menu',
    help_cart: 'order - View your order',
    help_help: 'help - Show this message',
  },
  de: {
    good_morning: 'Guten Morgen',
    good_afternoon: 'Guten Tag',
    good_evening: 'Guten Abend',
    language_selection: '🌐 Sprachauswahl',
    select_language: 'Wählen Sie Ihre Sprache:',
    welcome_to: 'Willkommen bei',
    ready_to_order: 'Bereit zu bestellen?',
    order_easily: 'Bestellen Sie einfach über WhatsApp',
    btn_order: '🍔 Bestellen',
    btn_my_order: '🛒 Meine Bestellung',
    btn_view_menu: '📋 Menü ansehen',
    btn_add: '➕ Hinzufügen',
    btn_back_menu: '📋 Zurück zum Menü',
    btn_cart: '🛒 Warenkorb',
    btn_add_more: '➕ Mehr hinzufügen',
    btn_view_cart: '🛒 Bestellung ansehen',
    btn_checkout: '✅ Bezahlen',
    btn_confirm: '✅ Bestätigen',
    btn_cancel: '❌ Abbrechen',
    btn_delivery: '🚗 Lieferung',
    btn_pickup: '🏪 Abholen',
    btn_pay_pickup: '💵 Bei Abholung zahlen',
    btn_pay_online: '💳 Online zahlen',
    our_menu: '📋 Unser Menü',
    choose_category: 'Wählen Sie eine Kategorie:',
    choose_product: 'Wählen Sie ein Produkt:',
    no_products: 'Keine Produkte verfügbar.',
    promo: '🎁 AKTION',
    has_options: 'Dieses Produkt hat zusätzliche Optionen',
    your_cart: '🛒 Ihre Bestellung',
    cart_empty: 'Ihr Warenkorb ist leer.',
    add_products: 'Schauen Sie sich unser Menü an!',
    added_to_cart: 'hinzugefügt!',
    items: 'Artikel',
    subtotal: 'Zwischensumme',
    vat: 'MwSt',
    total: 'Gesamt',
    incl_vat: 'inkl. 21% MwSt',
    delivery_option: '🚗 Wie möchten Sie Ihre Bestellung erhalten?',
    enter_name: 'Wie ist Ihr Name?',
    enter_address: 'Was ist Ihre Lieferadresse?',
    confirm_phone: 'Wir nutzen diese Nummer um Sie zu kontaktieren.',
    is_correct: 'Ist das richtig?',
    any_notes: 'Haben Sie Anmerkungen? (tippen Sie "nein" wenn nicht)',
    payment_method: '💳 Wie möchten Sie bezahlen?',
    order_placed: '🎉 Bestellung aufgegeben!',
    order_number: 'Bestellnummer',
    order_date: 'Datum',
    order_type_pickup: 'Abholen',
    order_type_delivery: 'Lieferung',
    we_notify: 'Wir benachrichtigen Sie wenn Ihre Bestellung fertig ist!',
    status_preparing: '👨‍🍳 Ihre Bestellung wird zubereitet!',
    status_ready_time: 'Noch etwa 10 Minuten ⏳',
    status_ready: '🔔 Ihre Bestellung ist FERTIG!',
    status_pickup_now: 'Sie können sie jetzt abholen.',
    status_delivered: '✅ Geliefert!',
    status_thanks: 'Danke für Ihre Bestellung! 😊',
    status_see_again: 'Bis zum nächsten Mal!',
    error_generic: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    type_menu: 'Tippen Sie "menu" zum Bestellen.',
    help_title: '📚 Hilfe',
    help_menu: 'menu - Unser Menü ansehen',
    help_cart: 'bestellung - Ihre Bestellung ansehen',
    help_help: 'hilfe - Diese Nachricht anzeigen',
  },
  es: {
    good_morning: 'Buenos días',
    good_afternoon: 'Buenas tardes',
    good_evening: 'Buenas noches',
    language_selection: '🌐 Selección de idioma',
    select_language: 'Elige tu idioma:',
    welcome_to: 'Bienvenido a',
    ready_to_order: '¿Listo para pedir?',
    order_easily: 'Pide fácilmente por WhatsApp',
    btn_order: '🍔 Pedir',
    btn_my_order: '🛒 Mi Pedido',
    btn_view_menu: '📋 Ver Menú',
    btn_add: '➕ Añadir',
    btn_back_menu: '📋 Volver al Menú',
    btn_cart: '🛒 Carrito',
    btn_add_more: '➕ Añadir más',
    btn_view_cart: '🛒 Ver Pedido',
    btn_checkout: '✅ Pagar',
    btn_confirm: '✅ Confirmar',
    btn_cancel: '❌ Cancelar',
    btn_delivery: '🚗 Entrega',
    btn_pickup: '🏪 Recoger',
    btn_pay_pickup: '💵 Pagar al recoger',
    btn_pay_online: '💳 Pagar online',
    our_menu: '📋 Nuestro Menú',
    choose_category: 'Elige una categoría:',
    choose_product: 'Elige un producto:',
    no_products: 'No hay productos disponibles.',
    promo: '🎁 OFERTA',
    has_options: 'Este producto tiene opciones adicionales',
    your_cart: '🛒 Tu Pedido',
    cart_empty: 'Tu carrito está vacío.',
    add_products: '¡Mira nuestro menú!',
    added_to_cart: '¡añadido!',
    items: 'artículo(s)',
    subtotal: 'Subtotal',
    vat: 'IVA',
    total: 'Total',
    incl_vat: 'IVA 21% incluido',
    delivery_option: '🚗 ¿Cómo quieres recibir tu pedido?',
    enter_name: '¿Cuál es tu nombre?',
    enter_address: '¿Cuál es tu dirección de entrega?',
    confirm_phone: 'Usaremos este número para contactarte.',
    is_correct: '¿Es correcto?',
    any_notes: '¿Alguna nota? (escribe "no" si no hay)',
    payment_method: '💳 ¿Cómo quieres pagar?',
    order_placed: '🎉 ¡Pedido Realizado!',
    order_number: 'Número de pedido',
    order_date: 'Fecha',
    order_type_pickup: 'Recoger',
    order_type_delivery: 'Entrega',
    we_notify: '¡Te avisaremos cuando tu pedido esté listo!',
    status_preparing: '👨‍🍳 ¡Tu pedido se está preparando!',
    status_ready_time: 'Aproximadamente 10 minutos ⏳',
    status_ready: '🔔 ¡Tu pedido está LISTO!',
    status_pickup_now: 'Puedes recogerlo ahora.',
    status_delivered: '✅ ¡Entregado!',
    status_thanks: '¡Gracias por tu pedido! 😊',
    status_see_again: '¡Hasta la próxima!',
    error_generic: 'Algo salió mal. Inténtalo de nuevo.',
    type_menu: 'Escribe "menu" para pedir.',
    help_title: '📚 Ayuda',
    help_menu: 'menu - Ver nuestro menú',
    help_cart: 'pedido - Ver tu pedido',
    help_help: 'ayuda - Mostrar este mensaje',
  },
  it: {
    good_morning: 'Buongiorno',
    good_afternoon: 'Buon pomeriggio',
    good_evening: 'Buonasera',
    language_selection: '🌐 Selezione lingua',
    select_language: 'Scegli la tua lingua:',
    welcome_to: 'Benvenuto da',
    ready_to_order: 'Pronto per ordinare?',
    order_easily: 'Ordina facilmente via WhatsApp',
    btn_order: '🍔 Ordina',
    btn_my_order: '🛒 Il Mio Ordine',
    btn_view_menu: '📋 Vedi Menu',
    btn_add: '➕ Aggiungi',
    btn_back_menu: '📋 Torna al Menu',
    btn_cart: '🛒 Carrello',
    btn_add_more: '➕ Aggiungi altro',
    btn_view_cart: '🛒 Vedi Ordine',
    btn_checkout: '✅ Paga',
    btn_confirm: '✅ Conferma',
    btn_cancel: '❌ Annulla',
    btn_delivery: '🚗 Consegna',
    btn_pickup: '🏪 Ritiro',
    btn_pay_pickup: '💵 Paga al ritiro',
    btn_pay_online: '💳 Paga online',
    our_menu: '📋 Il Nostro Menu',
    choose_category: 'Scegli una categoria:',
    choose_product: 'Scegli un prodotto:',
    no_products: 'Nessun prodotto disponibile.',
    promo: '🎁 OFFERTA',
    has_options: 'Questo prodotto ha opzioni extra',
    your_cart: '🛒 Il Tuo Ordine',
    cart_empty: 'Il tuo carrello è vuoto.',
    add_products: 'Guarda il nostro menu!',
    added_to_cart: 'aggiunto!',
    items: 'articolo/i',
    subtotal: 'Subtotale',
    vat: 'IVA',
    total: 'Totale',
    incl_vat: 'IVA 21% inclusa',
    delivery_option: '🚗 Come vuoi ricevere il tuo ordine?',
    enter_name: 'Come ti chiami?',
    enter_address: 'Qual è il tuo indirizzo di consegna?',
    confirm_phone: 'Useremo questo numero per contattarti.',
    is_correct: 'È corretto?',
    any_notes: 'Hai delle note? (scrivi "no" se non ci sono)',
    payment_method: '💳 Come vuoi pagare?',
    order_placed: '🎉 Ordine Effettuato!',
    order_number: "Numero d'ordine",
    order_date: 'Data',
    order_type_pickup: 'Ritiro',
    order_type_delivery: 'Consegna',
    we_notify: 'Ti avviseremo quando il tuo ordine sarà pronto!',
    status_preparing: '👨‍🍳 Il tuo ordine è in preparazione!',
    status_ready_time: 'Ancora circa 10 minuti ⏳',
    status_ready: '🔔 Il tuo ordine è PRONTO!',
    status_pickup_now: 'Puoi ritirarlo ora.',
    status_delivered: '✅ Consegnato!',
    status_thanks: 'Grazie per il tuo ordine! 😊',
    status_see_again: 'Alla prossima!',
    error_generic: 'Qualcosa è andato storto. Riprova.',
    type_menu: 'Scrivi "menu" per ordinare.',
    help_title: '📚 Aiuto',
    help_menu: 'menu - Vedi il nostro menu',
    help_cart: 'ordine - Vedi il tuo ordine',
    help_help: 'aiuto - Mostra questo messaggio',
  },
  pt: {
    good_morning: 'Bom dia',
    good_afternoon: 'Boa tarde',
    good_evening: 'Boa noite',
    language_selection: '🌐 Seleção de idioma',
    select_language: 'Escolha seu idioma:',
    welcome_to: 'Bem-vindo ao',
    ready_to_order: 'Pronto para pedir?',
    order_easily: 'Peça facilmente pelo WhatsApp',
    btn_order: '🍔 Pedir',
    btn_my_order: '🛒 Meu Pedido',
    btn_view_menu: '📋 Ver Menu',
    btn_add: '➕ Adicionar',
    btn_back_menu: '📋 Voltar ao Menu',
    btn_cart: '🛒 Carrinho',
    btn_add_more: '➕ Adicionar mais',
    btn_view_cart: '🛒 Ver Pedido',
    btn_checkout: '✅ Finalizar',
    btn_confirm: '✅ Confirmar',
    btn_cancel: '❌ Cancelar',
    btn_delivery: '🚗 Entrega',
    btn_pickup: '🏪 Retirar',
    btn_pay_pickup: '💵 Pagar na retirada',
    btn_pay_online: '💳 Pagar online',
    our_menu: '📋 Nosso Menu',
    choose_category: 'Escolha uma categoria:',
    choose_product: 'Escolha um produto:',
    no_products: 'Nenhum produto disponível.',
    promo: '🎁 PROMOÇÃO',
    has_options: 'Este produto tem opções extras',
    your_cart: '🛒 Seu Pedido',
    cart_empty: 'Seu carrinho está vazio.',
    add_products: 'Confira nosso menu!',
    added_to_cart: 'adicionado!',
    items: 'item(ns)',
    subtotal: 'Subtotal',
    vat: 'IVA',
    total: 'Total',
    incl_vat: 'IVA 21% incluído',
    delivery_option: '🚗 Como você quer receber seu pedido?',
    enter_name: 'Qual é o seu nome?',
    enter_address: 'Qual é o seu endereço de entrega?',
    confirm_phone: 'Usaremos este número para entrar em contato.',
    is_correct: 'Está correto?',
    any_notes: 'Alguma observação? (digite "não" se não houver)',
    payment_method: '💳 Como você quer pagar?',
    order_placed: '🎉 Pedido Realizado!',
    order_number: 'Número do pedido',
    order_date: 'Data',
    order_type_pickup: 'Retirada',
    order_type_delivery: 'Entrega',
    we_notify: 'Avisaremos quando seu pedido estiver pronto!',
    status_preparing: '👨‍🍳 Seu pedido está sendo preparado!',
    status_ready_time: 'Aproximadamente 10 minutos ⏳',
    status_ready: '🔔 Seu pedido está PRONTO!',
    status_pickup_now: 'Você pode retirar agora.',
    status_delivered: '✅ Entregue!',
    status_thanks: 'Obrigado pelo seu pedido! 😊',
    status_see_again: 'Até a próxima!',
    error_generic: 'Algo deu errado. Tente novamente.',
    type_menu: 'Digite "menu" para pedir.',
    help_title: '📚 Ajuda',
    help_menu: 'menu - Ver nosso menu',
    help_cart: 'pedido - Ver seu pedido',
    help_help: 'ajuda - Mostrar esta mensagem',
  },
  tr: {
    good_morning: 'Günaydın',
    good_afternoon: 'İyi günler',
    good_evening: 'İyi akşamlar',
    language_selection: '🌐 Dil Seçimi',
    select_language: 'Dilinizi seçin:',
    welcome_to: 'Hoş geldiniz',
    ready_to_order: 'Sipariş vermeye hazır mısınız?',
    order_easily: 'WhatsApp üzerinden kolayca sipariş verin',
    btn_order: '🍔 Sipariş Ver',
    btn_my_order: '🛒 Siparişim',
    btn_view_menu: '📋 Menüyü Gör',
    btn_add: '➕ Ekle',
    btn_back_menu: '📋 Menüye Dön',
    btn_cart: '🛒 Sepet',
    btn_add_more: '➕ Daha fazla ekle',
    btn_view_cart: '🛒 Siparişi Gör',
    btn_checkout: '✅ Öde',
    btn_confirm: '✅ Onayla',
    btn_cancel: '❌ İptal',
    btn_delivery: '🚗 Teslimat',
    btn_pickup: '🏪 Gel Al',
    btn_pay_pickup: '💵 Alırken öde',
    btn_pay_online: '💳 Online öde',
    our_menu: '📋 Menümüz',
    choose_category: 'Bir kategori seçin:',
    choose_product: 'Bir ürün seçin:',
    no_products: 'Ürün bulunmuyor.',
    promo: '🎁 KAMPANYA',
    has_options: 'Bu ürünün ekstra seçenekleri var',
    your_cart: '🛒 Siparişiniz',
    cart_empty: 'Sepetiniz boş.',
    add_products: 'Menümüze göz atın!',
    added_to_cart: 'eklendi!',
    items: 'ürün',
    subtotal: 'Ara toplam',
    vat: 'KDV',
    total: 'Toplam',
    incl_vat: '%21 KDV dahil',
    delivery_option: '🚗 Siparişinizi nasıl almak istersiniz?',
    enter_name: 'Adınız nedir?',
    enter_address: 'Teslimat adresiniz nedir?',
    confirm_phone: 'Sizinle iletişim için bu numarayı kullanacağız.',
    is_correct: 'Doğru mu?',
    any_notes: 'Notunuz var mı? (yoksa "hayır" yazın)',
    payment_method: '💳 Nasıl ödemek istersiniz?',
    order_placed: '🎉 Sipariş Verildi!',
    order_number: 'Sipariş numarası',
    order_date: 'Tarih',
    order_type_pickup: 'Gel Al',
    order_type_delivery: 'Teslimat',
    we_notify: 'Siparişiniz hazır olduğunda size haber vereceğiz!',
    status_preparing: '👨‍🍳 Siparişiniz hazırlanıyor!',
    status_ready_time: 'Yaklaşık 10 dakika ⏳',
    status_ready: '🔔 Siparişiniz HAZIR!',
    status_pickup_now: 'Şimdi alabilirsiniz.',
    status_delivered: '✅ Teslim edildi!',
    status_thanks: 'Siparişiniz için teşekkürler! 😊',
    status_see_again: 'Görüşmek üzere!',
    error_generic: 'Bir şeyler yanlış gitti. Tekrar deneyin.',
    type_menu: 'Sipariş için "menu" yazın.',
    help_title: '📚 Yardım',
    help_menu: 'menu - Menümüzü görün',
    help_cart: 'siparis - Siparişinizi görün',
    help_help: 'yardim - Bu mesajı göster',
  },
  pl: {
    good_morning: 'Dzień dobry',
    good_afternoon: 'Dzień dobry',
    good_evening: 'Dobry wieczór',
    language_selection: '🌐 Wybór języka',
    select_language: 'Wybierz język:',
    welcome_to: 'Witamy w',
    ready_to_order: 'Gotowy do zamówienia?',
    order_easily: 'Zamów łatwo przez WhatsApp',
    btn_order: '🍔 Zamów',
    btn_my_order: '🛒 Moje Zamówienie',
    btn_view_menu: '📋 Zobacz Menu',
    btn_add: '➕ Dodaj',
    btn_back_menu: '📋 Powrót do Menu',
    btn_cart: '🛒 Koszyk',
    btn_add_more: '➕ Dodaj więcej',
    btn_view_cart: '🛒 Zobacz Zamówienie',
    btn_checkout: '✅ Zapłać',
    btn_confirm: '✅ Potwierdź',
    btn_cancel: '❌ Anuluj',
    btn_delivery: '🚗 Dostawa',
    btn_pickup: '🏪 Odbiór',
    btn_pay_pickup: '💵 Płatność przy odbiorze',
    btn_pay_online: '💳 Płatność online',
    our_menu: '📋 Nasze Menu',
    choose_category: 'Wybierz kategorię:',
    choose_product: 'Wybierz produkt:',
    no_products: 'Brak dostępnych produktów.',
    promo: '🎁 PROMOCJA',
    has_options: 'Ten produkt ma dodatkowe opcje',
    your_cart: '🛒 Twoje Zamówienie',
    cart_empty: 'Twój koszyk jest pusty.',
    add_products: 'Sprawdź nasze menu!',
    added_to_cart: 'dodano!',
    items: 'pozycja/e',
    subtotal: 'Suma częściowa',
    vat: 'VAT',
    total: 'Razem',
    incl_vat: 'z 21% VAT',
    delivery_option: '🚗 Jak chcesz odebrać zamówienie?',
    enter_name: 'Jak masz na imię?',
    enter_address: 'Jaki jest twój adres dostawy?',
    confirm_phone: 'Użyjemy tego numeru do kontaktu.',
    is_correct: 'Czy to jest poprawne?',
    any_notes: 'Jakieś uwagi? (napisz "nie" jeśli nie)',
    payment_method: '💳 Jak chcesz zapłacić?',
    order_placed: '🎉 Zamówienie Złożone!',
    order_number: 'Numer zamówienia',
    order_date: 'Data',
    order_type_pickup: 'Odbiór',
    order_type_delivery: 'Dostawa',
    we_notify: 'Powiadomimy Cię gdy zamówienie będzie gotowe!',
    status_preparing: '👨‍🍳 Twoje zamówienie jest przygotowywane!',
    status_ready_time: 'Około 10 minut ⏳',
    status_ready: '🔔 Twoje zamówienie jest GOTOWE!',
    status_pickup_now: 'Możesz je teraz odebrać.',
    status_delivered: '✅ Dostarczone!',
    status_thanks: 'Dziękujemy za zamówienie! 😊',
    status_see_again: 'Do zobaczenia!',
    error_generic: 'Coś poszło nie tak. Spróbuj ponownie.',
    type_menu: 'Napisz "menu" aby zamówić.',
    help_title: '📚 Pomoc',
    help_menu: 'menu - Zobacz nasze menu',
    help_cart: 'zamowienie - Zobacz zamówienie',
    help_help: 'pomoc - Pokaż tę wiadomość',
  },
  zh: {
    good_morning: '早上好',
    good_afternoon: '下午好',
    good_evening: '晚上好',
    language_selection: '🌐 语言选择',
    select_language: '选择您的语言:',
    welcome_to: '欢迎光临',
    ready_to_order: '准备好点餐了吗?',
    order_easily: '通过WhatsApp轻松订购',
    btn_order: '🍔 点餐',
    btn_my_order: '🛒 我的订单',
    btn_view_menu: '📋 查看菜单',
    btn_add: '➕ 添加',
    btn_back_menu: '📋 返回菜单',
    btn_cart: '🛒 购物车',
    btn_add_more: '➕ 添加更多',
    btn_view_cart: '🛒 查看订单',
    btn_checkout: '✅ 结账',
    btn_confirm: '✅ 确认',
    btn_cancel: '❌ 取消',
    btn_delivery: '🚗 外送',
    btn_pickup: '🏪 自取',
    btn_pay_pickup: '💵 自取时付款',
    btn_pay_online: '💳 在线支付',
    our_menu: '📋 我们的菜单',
    choose_category: '选择类别:',
    choose_product: '选择产品:',
    no_products: '暂无产品。',
    promo: '🎁 促销',
    has_options: '此产品有额外选项',
    your_cart: '🛒 您的订单',
    cart_empty: '您的购物车是空的。',
    add_products: '查看我们的菜单!',
    added_to_cart: '已添加!',
    items: '件',
    subtotal: '小计',
    vat: '增值税',
    total: '总计',
    incl_vat: '含21%增值税',
    delivery_option: '🚗 您想如何收取订单?',
    enter_name: '您的姓名是?',
    enter_address: '您的送货地址是?',
    confirm_phone: '我们将使用此号码与您联系。',
    is_correct: '正确吗?',
    any_notes: '有备注吗?(如果没有请输入"否")',
    payment_method: '💳 您想如何付款?',
    order_placed: '🎉 订单已提交!',
    order_number: '订单号',
    order_date: '日期',
    order_type_pickup: '自取',
    order_type_delivery: '外送',
    we_notify: '订单准备好后我们会通知您!',
    status_preparing: '👨‍🍳 您的订单正在准备中!',
    status_ready_time: '大约还需10分钟 ⏳',
    status_ready: '🔔 您的订单已准备好!',
    status_pickup_now: '您现在可以取餐了。',
    status_delivered: '✅ 已送达!',
    status_thanks: '感谢您的订单! 😊',
    status_see_again: '下次再见!',
    error_generic: '出了点问题。请重试。',
    type_menu: '输入"menu"点餐。',
    help_title: '📚 帮助',
    help_menu: 'menu - 查看菜单',
    help_cart: 'order - 查看订单',
    help_help: 'help - 显示此消息',
  },
  ja: {
    good_morning: 'おはようございます',
    good_afternoon: 'こんにちは',
    good_evening: 'こんばんは',
    language_selection: '🌐 言語選択',
    select_language: '言語を選択してください:',
    welcome_to: 'ようこそ',
    ready_to_order: '注文の準備はできましたか?',
    order_easily: 'WhatsAppで簡単に注文',
    btn_order: '🍔 注文する',
    btn_my_order: '🛒 マイオーダー',
    btn_view_menu: '📋 メニューを見る',
    btn_add: '➕ 追加',
    btn_back_menu: '📋 メニューに戻る',
    btn_cart: '🛒 カート',
    btn_add_more: '➕ もっと追加',
    btn_view_cart: '🛒 注文を見る',
    btn_checkout: '✅ 会計',
    btn_confirm: '✅ 確認',
    btn_cancel: '❌ キャンセル',
    btn_delivery: '🚗 配達',
    btn_pickup: '🏪 持ち帰り',
    btn_pay_pickup: '💵 受取時に支払い',
    btn_pay_online: '💳 オンライン決済',
    our_menu: '📋 メニュー',
    choose_category: 'カテゴリを選択:',
    choose_product: '商品を選択:',
    no_products: '商品がありません。',
    promo: '🎁 セール',
    has_options: 'この商品には追加オプションがあります',
    your_cart: '🛒 ご注文',
    cart_empty: 'カートは空です。',
    add_products: 'メニューをご覧ください!',
    added_to_cart: '追加しました!',
    items: '点',
    subtotal: '小計',
    vat: '消費税',
    total: '合計',
    incl_vat: '21%消費税込',
    delivery_option: '🚗 ご注文の受け取り方法は?',
    enter_name: 'お名前は?',
    enter_address: '配達先住所は?',
    confirm_phone: 'この番号に連絡します。',
    is_correct: 'よろしいですか?',
    any_notes: '備考はありますか?(ない場合は「いいえ」と入力)',
    payment_method: '💳 お支払い方法は?',
    order_placed: '🎉 注文完了!',
    order_number: '注文番号',
    order_date: '日付',
    order_type_pickup: '持ち帰り',
    order_type_delivery: '配達',
    we_notify: 'ご注文の準備ができたらお知らせします!',
    status_preparing: '👨‍🍳 ご注文を準備中です!',
    status_ready_time: 'あと約10分 ⏳',
    status_ready: '🔔 ご注文の準備ができました!',
    status_pickup_now: '今すぐお受け取りいただけます。',
    status_delivered: '✅ 配達完了!',
    status_thanks: 'ご注文ありがとうございます! 😊',
    status_see_again: 'またのご利用をお待ちしております!',
    error_generic: 'エラーが発生しました。再試行してください。',
    type_menu: '「menu」と入力して注文。',
    help_title: '📚 ヘルプ',
    help_menu: 'menu - メニューを見る',
    help_cart: 'order - 注文を見る',
    help_help: 'help - このメッセージを表示',
  },
}

// Language names for selection menu
const languageNames: Record<LanguageCode, string> = {
  nl: '🇳🇱 Nederlands',
  fr: '🇫🇷 Français', 
  en: '🇬🇧 English',
  de: '🇩🇪 Deutsch',
  es: '🇪🇸 Español',
  it: '🇮🇹 Italiano',
  pt: '🇵🇹 Português',
  tr: '🇹🇷 Türkçe',
  pl: '🇵🇱 Polski',
  zh: '🇨🇳 中文',
  ja: '🇯🇵 日本語',
}

// Get translation
function t(lang: LanguageCode, key: string): string {
  return translations[lang]?.[key] || translations.nl[key] || key
}

// Get greeting based on time of day
function getGreeting(lang: LanguageCode): string {
  const now = new Date()
  const belgianTime = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Brussels' }))
  const hour = belgianTime.getHours()
  
  if (hour >= 5 && hour < 12) return t(lang, 'good_morning')
  if (hour >= 12 && hour < 18) return t(lang, 'good_afternoon')
  return t(lang, 'good_evening')
}

// =====================================================
// WEBHOOK HANDLERS
// =====================================================

// Verify webhook (GET request from Meta)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const mode = searchParams.get('hub.mode')
  const token = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

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
    console.log('📱 WhatsApp Webhook:', JSON.stringify(body, null, 2))

    const entry = body.entry?.[0]
    const changes = entry?.changes?.[0]
    const value = changes?.value

    if (!value) {
      console.log('❌ No value in webhook body')
      return NextResponse.json({ status: 'no value' })
    }

    const businessPhoneId = value.metadata?.phone_number_id
    console.log('📞 Business Phone ID:', businessPhoneId)

    if (value.messages) {
      for (const message of value.messages) {
        console.log('📨 Processing message from:', message.from, 'type:', message.type)
        await handleIncomingMessage(message, businessPhoneId, value.contacts?.[0])
      }
    }

    if (value.statuses) {
      for (const status of value.statuses) {
        console.log(`📊 Message ${status.id} status: ${status.status}`)
      }
    }

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('❌ WhatsApp webhook error:', error)
    return NextResponse.json({ error: 'Internal error', details: String(error) }, { status: 500 })
  }
}

// =====================================================
// MESSAGE HANDLERS
// =====================================================

async function handleIncomingMessage(
  message: any, 
  businessPhoneId: string,
  contact: any
) {
  const fromPhone = message.from
  const messageType = message.type
  const customerName = contact?.profile?.name || 'Klant'

  console.log(`📨 Message from ${fromPhone} (${customerName}): ${messageType}`)

  const tenant = await findTenantByWhatsAppPhone(businessPhoneId)
  if (!tenant) {
    console.log('❌ No tenant found for phone ID:', businessPhoneId)
    return
  }

  const session = await getOrCreateSession(fromPhone, tenant.tenant_slug)
  const lang = (session.data?.language as LanguageCode) || 'nl'

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
      await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token, t(lang, 'type_menu'))
  }
}

// =====================================================
// DATABASE FUNCTIONS
// =====================================================

async function findTenantByWhatsAppPhone(phoneId: string) {
  console.log('🔍 Looking for tenant with phone_number_id:', phoneId)
  
  // First check all whatsapp_settings to see what's in the database
  const { data: allSettings, error: allError } = await supabaseAdmin
    .from('whatsapp_settings')
    .select('tenant_slug, phone_number_id, is_active')
  
  console.log('📋 All WhatsApp settings in database:', JSON.stringify(allSettings, null, 2))
  if (allError) console.log('❌ Error fetching all settings:', allError)
  
  const { data, error } = await supabaseAdmin
    .from('whatsapp_settings')
    .select('*')
    .eq('phone_number_id', phoneId)
    .eq('is_active', true)
    .single()
  
  if (error) {
    console.log('❌ Error finding tenant:', error.message)
  }
  if (data) {
    console.log('✅ Found tenant:', data.tenant_slug)
  } else {
    console.log('❌ No tenant found for phone_number_id:', phoneId)
  }
  
  return data
}

async function getOrCreateSession(phone: string, tenantSlug: string) {
  const { data: existing } = await supabaseAdmin
    .from('whatsapp_sessions')
    .select('*')
    .eq('phone', phone)
    .eq('tenant_slug', tenantSlug)
    .gte('updated_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  if (existing) return existing

  const { data: newSession } = await supabaseAdmin
    .from('whatsapp_sessions')
    .insert({
      phone,
      tenant_slug: tenantSlug,
      state: 'language_select',
      cart: [],
      data: {}
    })
    .select()
    .single()

  return newSession
}

async function updateSession(sessionId: string, updates: any) {
  await supabaseAdmin
    .from('whatsapp_sessions')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', sessionId)
}

// =====================================================
// TEXT MESSAGE HANDLER
// =====================================================

async function handleTextMessage(
  text: string,
  session: any,
  tenant: any,
  fromPhone: string,
  customerName: string,
  businessPhoneId: string
) {
  const lowerText = text.toLowerCase().trim()
  const lang = (session.data?.language as LanguageCode) || 'nl'

  // Reset commands - always go to language selection first
  if (['menu', 'bestellen', 'start', 'hallo', 'hello', 'hi', 'bonjour', 'hola', 'ciao'].includes(lowerText)) {
    await sendLanguageSelection(businessPhoneId, fromPhone, tenant)
    await updateSession(session.id, { state: 'language_select', cart: [] })
    return
  }

  // Check cart commands
  if (['winkelwagen', 'cart', 'bestelling', 'order', 'commande', 'pedido', 'ordine'].includes(lowerText)) {
    await sendCartSummary(businessPhoneId, fromPhone, tenant, session, lang)
    return
  }

  // Help commands
  if (['help', 'hulp', 'aide', 'ayuda', 'aiuto', 'hilfe', '?'].includes(lowerText)) {
    await sendHelpMessage(businessPhoneId, fromPhone, tenant, lang)
    return
  }

  // Handle based on session state
  switch (session.state) {
    case 'language_select':
      await sendLanguageSelection(businessPhoneId, fromPhone, tenant)
      break
    case 'awaiting_name':
      await updateSession(session.id, { 
        state: 'awaiting_phone_confirm',
        data: { ...session.data, customer_name: text }
      })
      await sendPhoneConfirmation(businessPhoneId, fromPhone, tenant, text, lang)
      break
    case 'awaiting_address':
      await updateSession(session.id, {
        state: 'awaiting_notes',
        data: { ...session.data, delivery_address: text }
      })
      await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token, t(lang, 'any_notes'))
      break
    case 'awaiting_notes':
      const notes = lowerText === 'nee' || lowerText === 'no' || lowerText === 'non' ? null : text
      await updateSession(session.id, {
        state: 'awaiting_payment',
        data: { ...session.data, notes }
      })
      await sendPaymentOptions(businessPhoneId, fromPhone, tenant, session, lang)
      break
    default:
      await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token, t(lang, 'type_menu'))
  }
}

// =====================================================
// INTERACTIVE MESSAGE HANDLERS
// =====================================================

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
    await handleButtonAction(interactive.button_reply.id, session, tenant, fromPhone, customerName, businessPhoneId)
  } else if (type === 'list_reply') {
    await handleListSelection(interactive.list_reply.id, session, tenant, fromPhone, customerName, businessPhoneId)
  }
}

async function handleButtonReply(
  button: any,
  session: any,
  tenant: any,
  fromPhone: string,
  customerName: string,
  businessPhoneId: string
) {
  await handleButtonAction(button.payload, session, tenant, fromPhone, customerName, businessPhoneId)
}

async function handleButtonAction(
  buttonId: string,
  session: any,
  tenant: any,
  fromPhone: string,
  customerName: string,
  businessPhoneId: string
) {
  console.log(`🔘 Button action: ${buttonId}`)
  const lang = (session.data?.language as LanguageCode) || 'nl'

  // Language selection
  if (buttonId.startsWith('lang_')) {
    const selectedLang = buttonId.replace('lang_', '') as LanguageCode
    await updateSession(session.id, { 
      state: 'welcome',
      data: { ...session.data, language: selectedLang }
    })
    await sendWelcomeMessage(businessPhoneId, fromPhone, tenant, customerName, selectedLang)
    return
  }

  // Menu actions
  if (buttonId === 'view_menu') {
    await sendCategoryList(businessPhoneId, fromPhone, tenant, lang)
    await updateSession(session.id, { state: 'browsing' })
  } else if (buttonId === 'view_cart') {
    await sendCartSummary(businessPhoneId, fromPhone, tenant, session, lang)
  } else if (buttonId === 'checkout') {
    if (!session.cart || session.cart.length === 0) {
      await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token, t(lang, 'cart_empty'))
      return
    }
    await sendDeliveryOptions(businessPhoneId, fromPhone, tenant, lang)
    await updateSession(session.id, { state: 'awaiting_delivery_choice' })
  } 
  // Delivery options
  else if (buttonId === 'delivery') {
    await updateSession(session.id, { 
      state: 'awaiting_name',
      data: { ...session.data, order_type: 'delivery' }
    })
    await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token, t(lang, 'enter_name'))
  } else if (buttonId === 'pickup') {
    await updateSession(session.id, { 
      state: 'awaiting_name',
      data: { ...session.data, order_type: 'pickup' }
    })
    await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token, t(lang, 'enter_name'))
  }
  // Payment
  else if (buttonId === 'pay_pickup') {
    await createOrder(session, tenant, fromPhone, customerName, 'cash', businessPhoneId, lang)
  } else if (buttonId === 'pay_online') {
    await createOrder(session, tenant, fromPhone, customerName, 'online', businessPhoneId, lang)
  }
  // Confirmation
  else if (buttonId === 'confirm_phone') {
    const orderType = session.data?.order_type || 'pickup'
    if (orderType === 'delivery') {
      await updateSession(session.id, { state: 'awaiting_address' })
      await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token, t(lang, 'enter_address'))
    } else {
      await updateSession(session.id, { state: 'awaiting_notes' })
      await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token, t(lang, 'any_notes'))
    }
  } else if (buttonId === 'cancel_order') {
    await updateSession(session.id, { state: 'browsing', cart: [], data: { language: lang } })
    await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token, t(lang, 'type_menu'))
  }
  // Category/Product actions
  else if (buttonId.startsWith('cat_')) {
    const categoryId = buttonId.replace('cat_', '')
    await sendProductsInCategory(businessPhoneId, fromPhone, tenant, categoryId, lang)
  } else if (buttonId.startsWith('add_')) {
    const productId = buttonId.replace('add_', '')
    await addProductToCart(session, tenant, fromPhone, productId, businessPhoneId, lang)
  } else if (buttonId.startsWith('remove_')) {
    const productId = buttonId.replace('remove_', '')
    await removeProductFromCart(session, tenant, fromPhone, productId, businessPhoneId, lang)
  }
}

async function handleListSelection(
  listId: string,
  session: any,
  tenant: any,
  fromPhone: string,
  customerName: string,
  businessPhoneId: string
) {
  console.log(`📋 List selection: ${listId}`)
  const lang = (session.data?.language as LanguageCode) || 'nl'

  if (listId.startsWith('cat_')) {
    const categoryId = listId.replace('cat_', '')
    await sendProductsInCategory(businessPhoneId, fromPhone, tenant, categoryId, lang)
  } else if (listId.startsWith('prod_')) {
    const productId = listId.replace('prod_', '')
    await sendProductDetail(businessPhoneId, fromPhone, tenant, productId, session, lang)
  } else if (listId.startsWith('lang_')) {
    const selectedLang = listId.replace('lang_', '') as LanguageCode
    await updateSession(session.id, { 
      state: 'welcome',
      data: { ...session.data, language: selectedLang }
    })
    await sendWelcomeMessage(businessPhoneId, fromPhone, tenant, customerName, selectedLang)
  }
}

// =====================================================
// SEND FUNCTIONS
// =====================================================

// Send language selection
async function sendLanguageSelection(
  businessPhoneId: string,
  toPhone: string,
  tenant: any
) {
  const rows = Object.entries(languageNames).map(([code, name]) => ({
    id: `lang_${code}`,
    title: name.substring(0, 24),
    description: ''
  }))

  await sendInteractiveList(businessPhoneId, toPhone, tenant.access_token, {
    header: { type: 'text', text: '🌐 Language / Taal / Langue' },
    body: { text: 'Please select your language:\nKies je taal:\nChoisissez votre langue:' },
    action: {
      button: 'Select / Kies',
      sections: [{ title: 'Languages', rows }]
    }
  })
}

// Send welcome message with business image
async function sendWelcomeMessage(
  businessPhoneId: string,
  toPhone: string,
  tenant: any,
  customerName: string,
  lang: LanguageCode
) {
  const { data: settings } = await supabaseAdmin
    .from('tenant_settings')
    .select('business_name, tagline, logo_url')
    .eq('tenant_slug', tenant.tenant_slug)
    .single()

  const businessName = settings?.business_name || 'Onze Zaak'
  const tagline = settings?.tagline || ''
  const logoUrl = settings?.logo_url
  const greeting = getGreeting(lang)
  
  let welcomeText = `${greeting} ${customerName}! 👋\n\n`
  welcomeText += `${t(lang, 'welcome_to')} *${businessName}*`
  if (tagline) welcomeText += `\n${tagline}`
  welcomeText += `\n\n${t(lang, 'ready_to_order')}`

  const messageContent: any = {
    body: { text: welcomeText },
    footer: { text: t(lang, 'order_easily') },
    action: {
      buttons: [
        { type: 'reply', reply: { id: 'view_menu', title: t(lang, 'btn_order').substring(0, 20) } },
        { type: 'reply', reply: { id: 'view_cart', title: t(lang, 'btn_my_order').substring(0, 20) } }
      ]
    }
  }

  // Add header image if available
  if (logoUrl) {
    messageContent.header = { type: 'image', image: { link: logoUrl } }
  }

  await sendInteractiveButtons(businessPhoneId, toPhone, tenant.access_token, messageContent)
}

// Send category list
async function sendCategoryList(
  businessPhoneId: string,
  toPhone: string,
  tenant: any,
  lang: LanguageCode
) {
  const { data: categories } = await supabaseAdmin
    .from('menu_categories')
    .select('*')
    .eq('tenant_slug', tenant.tenant_slug)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (!categories || categories.length === 0) {
    await sendTextMessage(businessPhoneId, toPhone, tenant.access_token, t(lang, 'no_products'))
    return
  }

  const rows = categories.slice(0, 10).map(cat => ({
    id: `cat_${cat.id}`,
    title: cat.name.substring(0, 24),
    description: cat.description?.substring(0, 72) || ''
  }))

  await sendInteractiveList(businessPhoneId, toPhone, tenant.access_token, {
    header: { type: 'text', text: t(lang, 'our_menu') },
    body: { text: t(lang, 'choose_category') },
    action: {
      button: t(lang, 'btn_view_menu').substring(0, 20),
      sections: [{ title: t(lang, 'our_menu'), rows }]
    }
  })
}

// Send products in category
async function sendProductsInCategory(
  businessPhoneId: string,
  toPhone: string,
  tenant: any,
  categoryId: string,
  lang: LanguageCode
) {
  const { data: category } = await supabaseAdmin
    .from('menu_categories')
    .select('name')
    .eq('id', categoryId)
    .single()

  const { data: products } = await supabaseAdmin
    .from('menu_products')
    .select('*')
    .eq('tenant_slug', tenant.tenant_slug)
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (!products || products.length === 0) {
    await sendTextMessage(businessPhoneId, toPhone, tenant.access_token, t(lang, 'no_products'))
    return
  }

  const rows = products.slice(0, 10).map(prod => {
    const price = prod.is_promo && prod.promo_price ? prod.promo_price : prod.price
    return {
      id: `prod_${prod.id}`,
      title: prod.name.substring(0, 24),
      description: `€${price.toFixed(2)} ${prod.is_promo ? t(lang, 'promo') : ''}`
    }
  })

  await sendInteractiveList(businessPhoneId, toPhone, tenant.access_token, {
    header: { type: 'text', text: category?.name || t(lang, 'our_menu') },
    body: { text: t(lang, 'choose_product') },
    action: {
      button: t(lang, 'btn_view_menu').substring(0, 20),
      sections: [{ title: category?.name || '', rows }]
    }
  })
}

// Send product detail with image
async function sendProductDetail(
  businessPhoneId: string,
  toPhone: string,
  tenant: any,
  productId: string,
  session: any,
  lang: LanguageCode
) {
  const { data: product } = await supabaseAdmin
    .from('menu_products')
    .select('*')
    .eq('id', productId)
    .single()

  if (!product) {
    await sendTextMessage(businessPhoneId, toPhone, tenant.access_token, t(lang, 'no_products'))
    return
  }

  const price = product.is_promo && product.promo_price ? product.promo_price : product.price
  const originalPrice = product.is_promo && product.promo_price ? ` ~~€${product.price.toFixed(2)}~~` : ''

  let bodyText = `*${product.name}*\n\n`
  if (product.description) bodyText += `${product.description}\n\n`
  bodyText += `💰 *€${price.toFixed(2)}*${originalPrice}`
  if (product.is_promo) bodyText += `\n${t(lang, 'promo')}`

  const messageContent: any = {
    body: { text: bodyText },
    action: {
      buttons: [
        { type: 'reply', reply: { id: `add_${productId}`, title: t(lang, 'btn_add').substring(0, 20) } },
        { type: 'reply', reply: { id: 'view_menu', title: t(lang, 'btn_back_menu').substring(0, 20) } },
        { type: 'reply', reply: { id: 'view_cart', title: t(lang, 'btn_cart').substring(0, 20) } }
      ]
    }
  }

  if (product.image_url) {
    messageContent.header = { type: 'image', image: { link: product.image_url } }
  }

  await sendInteractiveButtons(businessPhoneId, toPhone, tenant.access_token, messageContent)
}

// Add product to cart
async function addProductToCart(
  session: any,
  tenant: any,
  fromPhone: string,
  productId: string,
  businessPhoneId: string,
  lang: LanguageCode
) {
  const { data: product } = await supabaseAdmin
    .from('menu_products')
    .select('*')
    .eq('id', productId)
    .single()

  if (!product) {
    await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token, t(lang, 'no_products'))
    return
  }

  const price = product.is_promo && product.promo_price ? product.promo_price : product.price
  const cart = session.cart || []
  const existingItem = cart.find((item: any) => item.product_id === productId)
  
  if (existingItem) {
    existingItem.quantity += 1
  } else {
    cart.push({
      product_id: productId,
      product_name: product.name,
      image_url: product.image_url,
      price,
      quantity: 1,
      options: []
    })
  }

  await updateSession(session.id, { cart })

  const totalItems = cart.reduce((sum: number, item: any) => sum + item.quantity, 0)
  const totalPrice = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)

  await sendInteractiveButtons(businessPhoneId, fromPhone, tenant.access_token, {
    body: {
      text: `✅ *${product.name}* ${t(lang, 'added_to_cart')}\n\n🛒 ${totalItems} ${t(lang, 'items')} - €${totalPrice.toFixed(2)}`
    },
    action: {
      buttons: [
        { type: 'reply', reply: { id: 'view_menu', title: t(lang, 'btn_add_more').substring(0, 20) } },
        { type: 'reply', reply: { id: 'view_cart', title: t(lang, 'btn_view_cart').substring(0, 20) } },
        { type: 'reply', reply: { id: 'checkout', title: t(lang, 'btn_checkout').substring(0, 20) } }
      ]
    }
  })
}

// Remove product from cart
async function removeProductFromCart(
  session: any,
  tenant: any,
  fromPhone: string,
  productId: string,
  businessPhoneId: string,
  lang: LanguageCode
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
  await sendCartSummary(businessPhoneId, fromPhone, tenant, { ...session, cart }, lang)
}

// Send cart summary
async function sendCartSummary(
  businessPhoneId: string,
  toPhone: string,
  tenant: any,
  session: any,
  lang: LanguageCode
) {
  const cart = session.cart || []

  if (cart.length === 0) {
    await sendInteractiveButtons(businessPhoneId, toPhone, tenant.access_token, {
      body: { text: `🛒 ${t(lang, 'cart_empty')}\n\n${t(lang, 'add_products')}` },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'view_menu', title: t(lang, 'btn_view_menu').substring(0, 20) } }
        ]
      }
    })
    return
  }

  let cartText = `${t(lang, 'your_cart')}\n\n`
  let subtotal = 0

  cart.forEach((item: any) => {
    const itemTotal = item.price * item.quantity
    subtotal += itemTotal
    cartText += `${item.quantity}x ${item.product_name}\n`
    cartText += `   €${item.price.toFixed(2)} × ${item.quantity} = €${itemTotal.toFixed(2)}\n\n`
  })

  const vatAmount = subtotal * 0.21 / 1.21
  cartText += `━━━━━━━━━━━━━━━━━━━━\n`
  cartText += `${t(lang, 'subtotal')}: €${(subtotal - vatAmount).toFixed(2)}\n`
  cartText += `${t(lang, 'vat')} (21%): €${vatAmount.toFixed(2)}\n`
  cartText += `*${t(lang, 'total')}: €${subtotal.toFixed(2)}*`

  await sendInteractiveButtons(businessPhoneId, toPhone, tenant.access_token, {
    body: { text: cartText },
    action: {
      buttons: [
        { type: 'reply', reply: { id: 'checkout', title: t(lang, 'btn_checkout').substring(0, 20) } },
        { type: 'reply', reply: { id: 'view_menu', title: t(lang, 'btn_add_more').substring(0, 20) } }
      ]
    }
  })
}

// Send delivery options
async function sendDeliveryOptions(
  businessPhoneId: string,
  toPhone: string,
  tenant: any,
  lang: LanguageCode
) {
  await sendInteractiveButtons(businessPhoneId, toPhone, tenant.access_token, {
    body: { text: t(lang, 'delivery_option') },
    action: {
      buttons: [
        { type: 'reply', reply: { id: 'delivery', title: t(lang, 'btn_delivery').substring(0, 20) } },
        { type: 'reply', reply: { id: 'pickup', title: t(lang, 'btn_pickup').substring(0, 20) } }
      ]
    }
  })
}

// Send phone confirmation
async function sendPhoneConfirmation(
  businessPhoneId: string,
  toPhone: string,
  tenant: any,
  customerName: string,
  lang: LanguageCode
) {
  await sendInteractiveButtons(businessPhoneId, toPhone, tenant.access_token, {
    body: {
      text: `${customerName}!\n\n${t(lang, 'confirm_phone')}\n📱 ${toPhone}\n\n${t(lang, 'is_correct')}`
    },
    action: {
      buttons: [
        { type: 'reply', reply: { id: 'confirm_phone', title: t(lang, 'btn_confirm').substring(0, 20) } },
        { type: 'reply', reply: { id: 'cancel_order', title: t(lang, 'btn_cancel').substring(0, 20) } }
      ]
    }
  })
}

// Send payment options
async function sendPaymentOptions(
  businessPhoneId: string,
  toPhone: string,
  tenant: any,
  session: any,
  lang: LanguageCode
) {
  const cart = session.cart || []
  const subtotal = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
  const vatAmount = subtotal * 0.21 / 1.21

  let text = `${t(lang, 'payment_method')}\n\n`
  text += `${t(lang, 'subtotal')}: €${(subtotal - vatAmount).toFixed(2)}\n`
  text += `${t(lang, 'vat')} (21%): €${vatAmount.toFixed(2)}\n\n`
  text += `*${t(lang, 'total')}: €${subtotal.toFixed(2)}*`

  await sendInteractiveButtons(businessPhoneId, toPhone, tenant.access_token, {
    body: { text },
    action: {
      buttons: [
        { type: 'reply', reply: { id: 'pay_pickup', title: t(lang, 'btn_pay_pickup').substring(0, 20) } },
        { type: 'reply', reply: { id: 'cancel_order', title: t(lang, 'btn_cancel').substring(0, 20) } }
      ]
    }
  })
}

// Create order
async function createOrder(
  session: any,
  tenant: any,
  fromPhone: string,
  customerName: string,
  paymentType: string,
  businessPhoneId: string,
  lang: LanguageCode
) {
  const cart = session.cart || []
  if (cart.length === 0) {
    await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token, t(lang, 'cart_empty'))
    return
  }

  const total = cart.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
  const orderType = session.data?.order_type || 'pickup'

  const { data: lastOrder } = await supabaseAdmin
    .from('orders')
    .select('order_number')
    .eq('tenant_slug', tenant.tenant_slug)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const orderNumber = (lastOrder?.order_number || 0) + 1

  const items = cart.map((item: any) => ({
    product_id: item.product_id,
    product_name: item.product_name,
    name: item.product_name,
    quantity: item.quantity,
    price: item.price,
    options: item.options || [],
    notes: ''
  }))

  const { error } = await supabaseAdmin
    .from('orders')
    .insert({
      tenant_slug: tenant.tenant_slug,
      order_number: orderNumber,
      customer_name: session.data?.customer_name || customerName,
      customer_phone: fromPhone,
      customer_email: null,
      delivery_address: session.data?.delivery_address || null,
      order_type: orderType,
      status: 'confirmed',
      payment_status: paymentType === 'online' ? 'paid' : 'pending',
      payment_method: paymentType === 'online' ? 'online' : 'cash',
      items: JSON.stringify(items),
      subtotal: total,
      total,
      customer_notes: session.data?.notes,
      source: 'whatsapp'
    })

  if (error) {
    console.error('❌ Order creation error:', error)
    await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token, t(lang, 'error_generic'))
    return
  }

  await updateSession(session.id, { state: 'completed', cart: [], data: { language: lang } })

  // Format date
  const now = new Date()
  const dateStr = now.toLocaleDateString('nl-BE', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  })

  let confirmationText = `${t(lang, 'order_placed')}\n\n`
  confirmationText += `📋 ${t(lang, 'order_number')}: *#${orderNumber}*\n`
  confirmationText += `📅 ${t(lang, 'order_date')}: ${dateStr}\n`
  confirmationText += `📦 ${orderType === 'delivery' ? t(lang, 'order_type_delivery') : t(lang, 'order_type_pickup')}\n\n`
  
  items.forEach((item: any) => {
    confirmationText += `${item.quantity}x ${item.name}\n`
  })
  
  confirmationText += `\n━━━━━━━━━━━━━━━━━━━━\n`
  confirmationText += `💰 ${t(lang, 'total')}: *€${total.toFixed(2)}*\n\n`
  confirmationText += `${t(lang, 'we_notify')} 👨‍🍳`

  await sendTextMessage(businessPhoneId, fromPhone, tenant.access_token, confirmationText)

  console.log(`✅ Order #${orderNumber} created for ${fromPhone}`)
}

// Send help message
async function sendHelpMessage(
  businessPhoneId: string,
  toPhone: string,
  tenant: any,
  lang: LanguageCode
) {
  await sendTextMessage(
    businessPhoneId,
    toPhone,
    tenant.access_token,
    `${t(lang, 'help_title')}\n\n` +
    `• ${t(lang, 'help_menu')}\n` +
    `• ${t(lang, 'help_cart')}\n` +
    `• ${t(lang, 'help_help')}`
  )
}

// =====================================================
// WHATSAPP API FUNCTIONS
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
      interactive: { type: 'button', ...interactive }
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
      interactive: { type: 'list', ...interactive }
    })
  })

  if (!response.ok) {
    const error = await response.text()
    console.error('❌ WhatsApp API error:', error)
  }
}
