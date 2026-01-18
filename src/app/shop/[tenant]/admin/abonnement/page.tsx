'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams } from 'next/navigation'

interface Subscription {
  id: string
  tenant_slug: string
  plan: string
  status: string
  price_monthly: number
  trial_started_at: string | null
  trial_ends_at: string | null
  subscription_started_at: string | null
  next_payment_at: string | null
}

const translations: Record<string, Record<string, string>> = {
  nl: {
    title: 'Abonnement',
    subtitle: 'Kies het abonnement dat bij je past',
    starter: 'Vysion Starter',
    pro: 'Vysion Pro',
    popular: 'POPULAIR',
    perMonth: '/maand',
    monthlyCancel: 'Maandelijks opzegbaar',
    chooseStarter: 'Kies Starter',
    choosePro: 'Kies Pro',
    currentPlan: 'Huidig plan',
    allFromStarter: 'Alles van Starter, plus:',
    // Starter features
    onlineOrdering: 'Online bestelplatform',
    ownWebsite: 'Eigen website volledig aanpasbaar',
    products: 'Producten & categorieën',
    paymentTerminal: 'Betaalterminal integratie',
    inventory: 'Voorraad',
    emailPhoneSupport: 'Email & telefoon support',
    languages: 'Beschikbaar in 9 talen',
    kitchenDisplay: 'Keuken display',
    allergens: 'Allergenen',
    qrCodes: 'QR codes',
    promotions: 'Promoties',
    tableReservation: 'Tafelreservatie',
    freeTraining: 'Volledige gratis opleiding',
    // Pro features
    seoVisibility: 'SEO vindbaarheid',
    customerLoyalty: 'Klantenkaart & loyaliteit',
    staffAdmin: 'Personeel & loonadministratie',
    scradaPeppol: 'SCRADA & Peppol boekhouding',
    fullAnalysis: 'Volledige bedrijfsanalyse',
    reviews: 'Reviews',
    prioritySupport: 'Prioriteit support',
    // Status
    trialStatus: 'Proefperiode',
    activeStatus: 'Actief',
    expiredStatus: 'Verlopen',
    cancelledStatus: 'Geannuleerd',
    trialEndsOn: 'Je proefperiode eindigt op',
    daysLeft: 'dagen over',
    dayLeft: 'dag over',
    nextPayment: 'Volgende betaling',
    // FAQ
    faqTitle: 'Veelgestelde vragen',
    faq1Q: 'Kan ik op elk moment opzeggen?',
    faq1A: 'Ja, je kunt op elk moment opzeggen. Je abonnement blijft actief tot het einde van de betaalperiode.',
    faq2Q: 'Wat gebeurt er na de proefperiode?',
    faq2A: 'Na 14 dagen wordt je gevraagd een abonnement te kiezen. Zonder abonnement wordt de toegang tot je admin panel geblokkeerd.',
    faq3Q: 'Kan ik van plan wisselen?',
    faq3A: 'Ja, je kunt op elk moment upgraden of downgraden. Het verschil wordt pro-rata verrekend.',
    faq4Q: 'Welke betaalmethodes worden geaccepteerd?',
    faq4A: 'We accepteren Bancontact, iDEAL, creditcard (Visa, Mastercard) en SEPA domiciliëring.',
    contactQuestion: 'Vragen over abonnementen?',
    contactLink: 'Neem contact op',
    processing: 'Verwerken...',
  },
  en: {
    title: 'Subscription',
    subtitle: 'Choose the plan that fits you',
    starter: 'Vysion Starter',
    pro: 'Vysion Pro',
    popular: 'POPULAR',
    perMonth: '/month',
    monthlyCancel: 'Cancel monthly',
    chooseStarter: 'Choose Starter',
    choosePro: 'Choose Pro',
    currentPlan: 'Current plan',
    allFromStarter: 'Everything from Starter, plus:',
    onlineOrdering: 'Online ordering platform',
    ownWebsite: 'Fully customizable website',
    products: 'Products & categories',
    paymentTerminal: 'Payment terminal integration',
    inventory: 'Inventory',
    emailPhoneSupport: 'Email & phone support',
    languages: 'Available in 9 languages',
    kitchenDisplay: 'Kitchen display',
    allergens: 'Allergens',
    qrCodes: 'QR codes',
    promotions: 'Promotions',
    tableReservation: 'Table reservation',
    freeTraining: 'Complete free training',
    seoVisibility: 'SEO visibility',
    customerLoyalty: 'Customer card & loyalty',
    staffAdmin: 'Staff & payroll administration',
    scradaPeppol: 'SCRADA & Peppol accounting',
    fullAnalysis: 'Complete business analysis',
    reviews: 'Reviews',
    prioritySupport: 'Priority support',
    trialStatus: 'Trial',
    activeStatus: 'Active',
    expiredStatus: 'Expired',
    cancelledStatus: 'Cancelled',
    trialEndsOn: 'Your trial ends on',
    daysLeft: 'days left',
    dayLeft: 'day left',
    nextPayment: 'Next payment',
    faqTitle: 'Frequently asked questions',
    faq1Q: 'Can I cancel anytime?',
    faq1A: 'Yes, you can cancel at any time. Your subscription remains active until the end of the billing period.',
    faq2Q: 'What happens after the trial?',
    faq2A: 'After 14 days you will be asked to choose a subscription. Without a subscription, access to your admin panel will be blocked.',
    faq3Q: 'Can I switch plans?',
    faq3A: 'Yes, you can upgrade or downgrade at any time. The difference will be prorated.',
    faq4Q: 'What payment methods are accepted?',
    faq4A: 'We accept Bancontact, iDEAL, credit card (Visa, Mastercard) and SEPA direct debit.',
    contactQuestion: 'Questions about subscriptions?',
    contactLink: 'Contact us',
    processing: 'Processing...',
  },
  fr: {
    title: 'Abonnement',
    subtitle: 'Choisissez l\'abonnement qui vous convient',
    starter: 'Vysion Starter',
    pro: 'Vysion Pro',
    popular: 'POPULAIRE',
    perMonth: '/mois',
    monthlyCancel: 'Résiliable mensuellement',
    chooseStarter: 'Choisir Starter',
    choosePro: 'Choisir Pro',
    currentPlan: 'Plan actuel',
    allFromStarter: 'Tout de Starter, plus:',
    onlineOrdering: 'Plateforme de commande en ligne',
    ownWebsite: 'Site web entièrement personnalisable',
    products: 'Produits & catégories',
    paymentTerminal: 'Intégration terminal de paiement',
    inventory: 'Stock',
    emailPhoneSupport: 'Support email & téléphone',
    languages: 'Disponible en 9 langues',
    kitchenDisplay: 'Affichage cuisine',
    allergens: 'Allergènes',
    qrCodes: 'Codes QR',
    promotions: 'Promotions',
    tableReservation: 'Réservation de table',
    freeTraining: 'Formation gratuite complète',
    seoVisibility: 'Visibilité SEO',
    customerLoyalty: 'Carte client & fidélité',
    staffAdmin: 'Personnel & administration des salaires',
    scradaPeppol: 'Comptabilité SCRADA & Peppol',
    fullAnalysis: 'Analyse commerciale complète',
    reviews: 'Avis',
    prioritySupport: 'Support prioritaire',
    trialStatus: 'Période d\'essai',
    activeStatus: 'Actif',
    expiredStatus: 'Expiré',
    cancelledStatus: 'Annulé',
    trialEndsOn: 'Votre période d\'essai se termine le',
    daysLeft: 'jours restants',
    dayLeft: 'jour restant',
    nextPayment: 'Prochain paiement',
    faqTitle: 'Questions fréquentes',
    faq1Q: 'Puis-je annuler à tout moment?',
    faq1A: 'Oui, vous pouvez annuler à tout moment. Votre abonnement reste actif jusqu\'à la fin de la période de facturation.',
    faq2Q: 'Que se passe-t-il après l\'essai?',
    faq2A: 'Après 14 jours, vous serez invité à choisir un abonnement. Sans abonnement, l\'accès à votre panneau admin sera bloqué.',
    faq3Q: 'Puis-je changer de plan?',
    faq3A: 'Oui, vous pouvez passer à un plan supérieur ou inférieur à tout moment. La différence sera calculée au prorata.',
    faq4Q: 'Quels modes de paiement sont acceptés?',
    faq4A: 'Nous acceptons Bancontact, iDEAL, carte de crédit (Visa, Mastercard) et prélèvement SEPA.',
    contactQuestion: 'Questions sur les abonnements?',
    contactLink: 'Contactez-nous',
    processing: 'Traitement...',
  },
  de: {
    title: 'Abonnement',
    subtitle: 'Wählen Sie das Abonnement, das zu Ihnen passt',
    starter: 'Vysion Starter',
    pro: 'Vysion Pro',
    popular: 'BELIEBT',
    perMonth: '/Monat',
    monthlyCancel: 'Monatlich kündbar',
    chooseStarter: 'Starter wählen',
    choosePro: 'Pro wählen',
    currentPlan: 'Aktueller Plan',
    allFromStarter: 'Alles von Starter, plus:',
    onlineOrdering: 'Online-Bestellplattform',
    ownWebsite: 'Vollständig anpassbare Website',
    products: 'Produkte & Kategorien',
    paymentTerminal: 'Zahlungsterminal-Integration',
    inventory: 'Lagerbestand',
    emailPhoneSupport: 'E-Mail & Telefon-Support',
    languages: 'Verfügbar in 9 Sprachen',
    kitchenDisplay: 'Küchenanzeige',
    allergens: 'Allergene',
    qrCodes: 'QR-Codes',
    promotions: 'Aktionen',
    tableReservation: 'Tischreservierung',
    freeTraining: 'Vollständige kostenlose Schulung',
    seoVisibility: 'SEO-Sichtbarkeit',
    customerLoyalty: 'Kundenkarte & Treue',
    staffAdmin: 'Personal & Lohnverwaltung',
    scradaPeppol: 'SCRADA & Peppol Buchhaltung',
    fullAnalysis: 'Vollständige Geschäftsanalyse',
    reviews: 'Bewertungen',
    prioritySupport: 'Prioritäts-Support',
    trialStatus: 'Testphase',
    activeStatus: 'Aktiv',
    expiredStatus: 'Abgelaufen',
    cancelledStatus: 'Gekündigt',
    trialEndsOn: 'Ihre Testphase endet am',
    daysLeft: 'Tage übrig',
    dayLeft: 'Tag übrig',
    nextPayment: 'Nächste Zahlung',
    faqTitle: 'Häufig gestellte Fragen',
    faq1Q: 'Kann ich jederzeit kündigen?',
    faq1A: 'Ja, Sie können jederzeit kündigen. Ihr Abonnement bleibt bis zum Ende des Abrechnungszeitraums aktiv.',
    faq2Q: 'Was passiert nach der Testphase?',
    faq2A: 'Nach 14 Tagen werden Sie aufgefordert, ein Abonnement zu wählen. Ohne Abonnement wird der Zugang zu Ihrem Admin-Panel gesperrt.',
    faq3Q: 'Kann ich den Plan wechseln?',
    faq3A: 'Ja, Sie können jederzeit upgraden oder downgraden. Die Differenz wird anteilig berechnet.',
    faq4Q: 'Welche Zahlungsmethoden werden akzeptiert?',
    faq4A: 'Wir akzeptieren Bancontact, iDEAL, Kreditkarte (Visa, Mastercard) und SEPA-Lastschrift.',
    contactQuestion: 'Fragen zu Abonnements?',
    contactLink: 'Kontaktieren Sie uns',
    processing: 'Verarbeitung...',
  },
  es: {
    title: 'Suscripción',
    subtitle: 'Elige el plan que mejor se adapte a ti',
    starter: 'Vysion Starter',
    pro: 'Vysion Pro',
    popular: 'POPULAR',
    perMonth: '/mes',
    monthlyCancel: 'Cancelable mensualmente',
    chooseStarter: 'Elegir Starter',
    choosePro: 'Elegir Pro',
    currentPlan: 'Plan actual',
    allFromStarter: 'Todo de Starter, más:',
    onlineOrdering: 'Plataforma de pedidos online',
    ownWebsite: 'Sitio web totalmente personalizable',
    products: 'Productos y categorías',
    paymentTerminal: 'Integración de terminal de pago',
    inventory: 'Inventario',
    emailPhoneSupport: 'Soporte por email y teléfono',
    languages: 'Disponible en 9 idiomas',
    kitchenDisplay: 'Pantalla de cocina',
    allergens: 'Alérgenos',
    qrCodes: 'Códigos QR',
    promotions: 'Promociones',
    tableReservation: 'Reserva de mesa',
    freeTraining: 'Formación gratuita completa',
    seoVisibility: 'Visibilidad SEO',
    customerLoyalty: 'Tarjeta de cliente y fidelidad',
    staffAdmin: 'Personal y administración de nóminas',
    scradaPeppol: 'Contabilidad SCRADA y Peppol',
    fullAnalysis: 'Análisis empresarial completo',
    reviews: 'Reseñas',
    prioritySupport: 'Soporte prioritario',
    trialStatus: 'Período de prueba',
    activeStatus: 'Activo',
    expiredStatus: 'Expirado',
    cancelledStatus: 'Cancelado',
    trialEndsOn: 'Tu período de prueba termina el',
    daysLeft: 'días restantes',
    dayLeft: 'día restante',
    nextPayment: 'Próximo pago',
    faqTitle: 'Preguntas frecuentes',
    faq1Q: '¿Puedo cancelar en cualquier momento?',
    faq1A: 'Sí, puedes cancelar en cualquier momento. Tu suscripción permanece activa hasta el final del período de facturación.',
    faq2Q: '¿Qué pasa después de la prueba?',
    faq2A: 'Después de 14 días se te pedirá que elijas una suscripción. Sin suscripción, el acceso a tu panel de administración será bloqueado.',
    faq3Q: '¿Puedo cambiar de plan?',
    faq3A: 'Sí, puedes actualizar o degradar en cualquier momento. La diferencia se prorrateará.',
    faq4Q: '¿Qué métodos de pago se aceptan?',
    faq4A: 'Aceptamos Bancontact, iDEAL, tarjeta de crédito (Visa, Mastercard) y débito directo SEPA.',
    contactQuestion: '¿Preguntas sobre suscripciones?',
    contactLink: 'Contáctanos',
    processing: 'Procesando...',
  },
  it: {
    title: 'Abbonamento',
    subtitle: 'Scegli l\'abbonamento più adatto a te',
    starter: 'Vysion Starter',
    pro: 'Vysion Pro',
    popular: 'POPOLARE',
    perMonth: '/mese',
    monthlyCancel: 'Cancellabile mensilmente',
    chooseStarter: 'Scegli Starter',
    choosePro: 'Scegli Pro',
    currentPlan: 'Piano attuale',
    allFromStarter: 'Tutto di Starter, più:',
    onlineOrdering: 'Piattaforma ordini online',
    ownWebsite: 'Sito web completamente personalizzabile',
    products: 'Prodotti e categorie',
    paymentTerminal: 'Integrazione terminale di pagamento',
    inventory: 'Inventario',
    emailPhoneSupport: 'Supporto email e telefono',
    languages: 'Disponibile in 9 lingue',
    kitchenDisplay: 'Display cucina',
    allergens: 'Allergeni',
    qrCodes: 'Codici QR',
    promotions: 'Promozioni',
    tableReservation: 'Prenotazione tavolo',
    freeTraining: 'Formazione gratuita completa',
    seoVisibility: 'Visibilità SEO',
    customerLoyalty: 'Carta cliente e fedeltà',
    staffAdmin: 'Personale e amministrazione stipendi',
    scradaPeppol: 'Contabilità SCRADA e Peppol',
    fullAnalysis: 'Analisi aziendale completa',
    reviews: 'Recensioni',
    prioritySupport: 'Supporto prioritario',
    trialStatus: 'Periodo di prova',
    activeStatus: 'Attivo',
    expiredStatus: 'Scaduto',
    cancelledStatus: 'Annullato',
    trialEndsOn: 'Il tuo periodo di prova termina il',
    daysLeft: 'giorni rimanenti',
    dayLeft: 'giorno rimanente',
    nextPayment: 'Prossimo pagamento',
    faqTitle: 'Domande frequenti',
    faq1Q: 'Posso annullare in qualsiasi momento?',
    faq1A: 'Sì, puoi annullare in qualsiasi momento. Il tuo abbonamento rimane attivo fino alla fine del periodo di fatturazione.',
    faq2Q: 'Cosa succede dopo la prova?',
    faq2A: 'Dopo 14 giorni ti verrà chiesto di scegliere un abbonamento. Senza abbonamento, l\'accesso al pannello admin sarà bloccato.',
    faq3Q: 'Posso cambiare piano?',
    faq3A: 'Sì, puoi passare a un piano superiore o inferiore in qualsiasi momento. La differenza sarà calcolata proporzionalmente.',
    faq4Q: 'Quali metodi di pagamento sono accettati?',
    faq4A: 'Accettiamo Bancontact, iDEAL, carta di credito (Visa, Mastercard) e addebito diretto SEPA.',
    contactQuestion: 'Domande sugli abbonamenti?',
    contactLink: 'Contattaci',
    processing: 'Elaborazione...',
  },
  ar: {
    title: 'الاشتراك',
    subtitle: 'اختر الخطة المناسبة لك',
    starter: 'Vysion Starter',
    pro: 'Vysion Pro',
    popular: 'شائع',
    perMonth: '/شهر',
    monthlyCancel: 'قابل للإلغاء شهرياً',
    chooseStarter: 'اختر Starter',
    choosePro: 'اختر Pro',
    currentPlan: 'الخطة الحالية',
    allFromStarter: 'كل شيء من Starter، بالإضافة إلى:',
    onlineOrdering: 'منصة الطلب عبر الإنترنت',
    ownWebsite: 'موقع ويب قابل للتخصيص بالكامل',
    products: 'المنتجات والفئات',
    paymentTerminal: 'تكامل محطة الدفع',
    inventory: 'المخزون',
    emailPhoneSupport: 'دعم البريد الإلكتروني والهاتف',
    languages: 'متوفر بـ 9 لغات',
    kitchenDisplay: 'شاشة المطبخ',
    allergens: 'مسببات الحساسية',
    qrCodes: 'رموز QR',
    promotions: 'العروض الترويجية',
    tableReservation: 'حجز الطاولة',
    freeTraining: 'تدريب مجاني كامل',
    seoVisibility: 'ظهور SEO',
    customerLoyalty: 'بطاقة العميل والولاء',
    staffAdmin: 'إدارة الموظفين والرواتب',
    scradaPeppol: 'محاسبة SCRADA و Peppol',
    fullAnalysis: 'تحليل الأعمال الكامل',
    reviews: 'التقييمات',
    prioritySupport: 'دعم الأولوية',
    trialStatus: 'فترة تجريبية',
    activeStatus: 'نشط',
    expiredStatus: 'منتهي الصلاحية',
    cancelledStatus: 'ملغى',
    trialEndsOn: 'تنتهي الفترة التجريبية في',
    daysLeft: 'أيام متبقية',
    dayLeft: 'يوم متبقي',
    nextPayment: 'الدفعة التالية',
    faqTitle: 'الأسئلة الشائعة',
    faq1Q: 'هل يمكنني الإلغاء في أي وقت؟',
    faq1A: 'نعم، يمكنك الإلغاء في أي وقت. يبقى اشتراكك نشطاً حتى نهاية فترة الفوترة.',
    faq2Q: 'ماذا يحدث بعد الفترة التجريبية؟',
    faq2A: 'بعد 14 يوماً، سيُطلب منك اختيار اشتراك. بدون اشتراك، سيتم حظر الوصول إلى لوحة الإدارة الخاصة بك.',
    faq3Q: 'هل يمكنني تغيير الخطة؟',
    faq3A: 'نعم، يمكنك الترقية أو التخفيض في أي وقت. سيتم احتساب الفرق بشكل تناسبي.',
    faq4Q: 'ما هي طرق الدفع المقبولة؟',
    faq4A: 'نقبل Bancontact، iDEAL، بطاقة الائتمان (Visa، Mastercard) والخصم المباشر SEPA.',
    contactQuestion: 'أسئلة حول الاشتراكات؟',
    contactLink: 'اتصل بنا',
    processing: 'جاري المعالجة...',
  },
  zh: {
    title: '订阅',
    subtitle: '选择适合您的方案',
    starter: 'Vysion Starter',
    pro: 'Vysion Pro',
    popular: '热门',
    perMonth: '/月',
    monthlyCancel: '按月取消',
    chooseStarter: '选择 Starter',
    choosePro: '选择 Pro',
    currentPlan: '当前方案',
    allFromStarter: 'Starter 的所有功能，加上：',
    onlineOrdering: '在线订购平台',
    ownWebsite: '完全可定制的网站',
    products: '产品和分类',
    paymentTerminal: '支付终端集成',
    inventory: '库存',
    emailPhoneSupport: '邮件和电话支持',
    languages: '支持9种语言',
    kitchenDisplay: '厨房显示',
    allergens: '过敏原',
    qrCodes: '二维码',
    promotions: '促销',
    tableReservation: '餐桌预订',
    freeTraining: '完整免费培训',
    seoVisibility: 'SEO 可见性',
    customerLoyalty: '客户卡和忠诚度',
    staffAdmin: '员工和工资管理',
    scradaPeppol: 'SCRADA 和 Peppol 会计',
    fullAnalysis: '完整业务分析',
    reviews: '评价',
    prioritySupport: '优先支持',
    trialStatus: '试用期',
    activeStatus: '活跃',
    expiredStatus: '已过期',
    cancelledStatus: '已取消',
    trialEndsOn: '您的试用期结束于',
    daysLeft: '天剩余',
    dayLeft: '天剩余',
    nextPayment: '下次付款',
    faqTitle: '常见问题',
    faq1Q: '我可以随时取消吗？',
    faq1A: '是的，您可以随时取消。您的订阅在计费周期结束前仍然有效。',
    faq2Q: '试用期后会怎样？',
    faq2A: '14天后，您将被要求选择订阅。没有订阅，您的管理面板访问将被阻止。',
    faq3Q: '我可以更改方案吗？',
    faq3A: '是的，您可以随时升级或降级。差额将按比例计算。',
    faq4Q: '接受哪些付款方式？',
    faq4A: '我们接受 Bancontact、iDEAL、信用卡（Visa、Mastercard）和 SEPA 直接借记。',
    contactQuestion: '关于订阅有问题？',
    contactLink: '联系我们',
    processing: '处理中...',
  },
  ja: {
    title: 'サブスクリプション',
    subtitle: 'あなたに合ったプランを選択',
    starter: 'Vysion Starter',
    pro: 'Vysion Pro',
    popular: '人気',
    perMonth: '/月',
    monthlyCancel: '月単位でキャンセル可能',
    chooseStarter: 'Starterを選択',
    choosePro: 'Proを選択',
    currentPlan: '現在のプラン',
    allFromStarter: 'Starterのすべて、さらに：',
    onlineOrdering: 'オンライン注文プラットフォーム',
    ownWebsite: '完全にカスタマイズ可能なウェブサイト',
    products: '製品とカテゴリ',
    paymentTerminal: '決済端末統合',
    inventory: '在庫',
    emailPhoneSupport: 'メール＆電話サポート',
    languages: '9言語対応',
    kitchenDisplay: 'キッチンディスプレイ',
    allergens: 'アレルゲン',
    qrCodes: 'QRコード',
    promotions: 'プロモーション',
    tableReservation: 'テーブル予約',
    freeTraining: '完全無料トレーニング',
    seoVisibility: 'SEO可視性',
    customerLoyalty: '顧客カード＆ロイヤルティ',
    staffAdmin: 'スタッフ＆給与管理',
    scradaPeppol: 'SCRADA＆Peppol会計',
    fullAnalysis: '完全なビジネス分析',
    reviews: 'レビュー',
    prioritySupport: '優先サポート',
    trialStatus: 'お試し期間',
    activeStatus: 'アクティブ',
    expiredStatus: '期限切れ',
    cancelledStatus: 'キャンセル済み',
    trialEndsOn: 'お試し期間終了日',
    daysLeft: '日残り',
    dayLeft: '日残り',
    nextPayment: '次回支払い',
    faqTitle: 'よくある質問',
    faq1Q: 'いつでもキャンセルできますか？',
    faq1A: 'はい、いつでもキャンセルできます。サブスクリプションは請求期間の終了まで有効です。',
    faq2Q: 'お試し期間後はどうなりますか？',
    faq2A: '14日後、サブスクリプションを選択するよう求められます。サブスクリプションがない場合、管理パネルへのアクセスがブロックされます。',
    faq3Q: 'プランを変更できますか？',
    faq3A: 'はい、いつでもアップグレードまたはダウングレードできます。差額は日割り計算されます。',
    faq4Q: 'どの支払い方法が利用できますか？',
    faq4A: 'Bancontact、iDEAL、クレジットカード（Visa、Mastercard）、SEPA口座振替に対応しています。',
    contactQuestion: 'サブスクリプションについて質問がありますか？',
    contactLink: 'お問い合わせ',
    processing: '処理中...',
  },
}

const starterFeatures = [
  'onlineOrdering',
  'ownWebsite',
  'products',
  'paymentTerminal',
  'inventory',
  'emailPhoneSupport',
  'languages',
  'kitchenDisplay',
  'allergens',
  'qrCodes',
  'promotions',
  'tableReservation',
  'freeTraining',
]

const proFeatures = [
  'seoVisibility',
  'customerLoyalty',
  'staffAdmin',
  'scradaPeppol',
  'fullAnalysis',
  'reviews',
  'prioritySupport',
  'freeTraining',
]

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey)
}

export default function AbonnementPage() {
  const params = useParams()
  const tenantSlug = params.tenant as string
  
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [lang, setLang] = useState('nl')

  useEffect(() => {
    loadSubscription()
    // Detect language from browser
    const browserLang = navigator.language.split('-')[0]
    if (translations[browserLang]) {
      setLang(browserLang)
    }
  }, [tenantSlug])

  const t = (key: string) => translations[lang]?.[key] || translations.nl[key] || key

  async function loadSubscription() {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .single()

    setSubscription(data)
    setLoading(false)
  }

  async function handleSubscribe(planId: string) {
    setProcessing(planId)
    
    try {
      const response = await fetch('/api/create-subscription-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantSlug,
          planId,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        alert(data.error)
      }
    } catch (error) {
      console.error('Subscription error:', error)
      alert('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setProcessing(null)
    }
  }

  // Calculate trial info
  let daysLeft = 0
  let trialEndDate = ''
  if (subscription?.status === 'trial' && subscription.trial_ends_at) {
    const now = new Date()
    const trialEnd = new Date(subscription.trial_ends_at)
    daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    trialEndDate = trialEnd.toLocaleDateString(lang === 'nl' ? 'nl-BE' : lang, { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  const isCurrentPlan = (planId: string) => subscription?.status === 'active' && subscription.plan === planId

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600 mt-2">{t('subtitle')}</p>
      </div>

      {/* Current Status */}
      {subscription && (
        <div className={`rounded-2xl p-6 mb-8 ${
          subscription.status === 'trial' 
            ? 'bg-blue-50 border-2 border-blue-200' 
            : subscription.status === 'active'
            ? 'bg-green-50 border-2 border-green-200'
            : 'bg-red-50 border-2 border-red-200'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  subscription.status === 'trial' 
                    ? 'bg-blue-100 text-blue-700'
                    : subscription.status === 'active'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {subscription.status === 'trial' && t('trialStatus')}
                  {subscription.status === 'active' && t('activeStatus')}
                  {subscription.status === 'expired' && t('expiredStatus')}
                  {subscription.status === 'cancelled' && t('cancelledStatus')}
                </span>
                <span className="text-gray-900 font-semibold capitalize">{subscription.plan}</span>
              </div>
              
              {subscription.status === 'trial' && (
                <p className="text-gray-600 mt-2">
                  {t('trialEndsOn')} <strong>{trialEndDate}</strong> 
                  {daysLeft > 0 && ` (${daysLeft} ${daysLeft === 1 ? t('dayLeft') : t('daysLeft')})`}
                </p>
              )}
              
              {subscription.status === 'active' && subscription.next_payment_at && (
                <p className="text-gray-600 mt-2">
                  {t('nextPayment')}: {new Date(subscription.next_payment_at).toLocaleDateString(lang === 'nl' ? 'nl-BE' : lang)}
                </p>
              )}
            </div>

            {subscription.status === 'active' && (
              <div className="text-right">
                <p className="text-3xl font-bold text-gray-900">
                  €{subscription.price_monthly}
                  <span className="text-base font-normal text-gray-500">{t('perMonth')}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {/* Starter Plan */}
        <div className="relative bg-gradient-to-br from-[#1a2e1a] to-[#2d4a2d] rounded-3xl p-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
              <span className="text-xl">⚡</span>
            </div>
            <h3 className="text-xl font-bold">{t('starter')}</h3>
          </div>

          <div className="mb-6">
            <span className="text-5xl font-bold text-yellow-400">€79</span>
            <span className="text-gray-300 ml-2">{t('perMonth')}</span>
          </div>

          <ul className="space-y-3 mb-8">
            {starterFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-200">{t(feature)}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleSubscribe('starter')}
            disabled={processing !== null || isCurrentPlan('starter')}
            className={`w-full py-4 px-6 rounded-xl font-semibold transition-all ${
              isCurrentPlan('starter')
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gray-800 text-white hover:bg-gray-700'
            }`}
          >
            {processing === 'starter' ? t('processing') : isCurrentPlan('starter') ? t('currentPlan') : t('chooseStarter')}
          </button>
          
          <p className="text-center text-gray-400 text-sm mt-3">{t('monthlyCancel')}</p>
        </div>

        {/* Pro Plan */}
        <div className="relative bg-gradient-to-br from-[#2d1f3d] to-[#4a2d6a] rounded-3xl p-8 text-white">
          {/* Popular Badge */}
          <div className="absolute -top-3 right-6">
            <span className="bg-pink-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
              {t('popular')}
            </span>
          </div>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-400 rounded-xl flex items-center justify-center">
              <span className="text-xl">✨</span>
            </div>
            <h3 className="text-xl font-bold">{t('pro')}</h3>
          </div>

          <div className="mb-6">
            <span className="text-5xl font-bold text-purple-300">€99</span>
            <span className="text-gray-300 ml-2">{t('perMonth')}</span>
          </div>

          <p className="text-purple-200 mb-4 flex items-center gap-2">
            <span>✨</span> {t('allFromStarter')}
          </p>

          <ul className="space-y-3 mb-8">
            {proFeatures.map((feature) => (
              <li key={feature} className="flex items-start gap-3">
                <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-gray-200">{t(feature)}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => handleSubscribe('pro')}
            disabled={processing !== null || isCurrentPlan('pro')}
            className={`w-full py-4 px-6 rounded-xl font-semibold transition-all ${
              isCurrentPlan('pro')
                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:from-pink-600 hover:to-purple-600'
            }`}
          >
            {processing === 'pro' ? t('processing') : isCurrentPlan('pro') ? t('currentPlan') : t('choosePro')}
          </button>
          
          <p className="text-center text-gray-400 text-sm mt-3">{t('monthlyCancel')}</p>
        </div>
      </div>

      {/* FAQ */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">{t('faqTitle')}</h2>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900">{t('faq1Q')}</h3>
            <p className="text-gray-600 text-sm mt-1">{t('faq1A')}</p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900">{t('faq2Q')}</h3>
            <p className="text-gray-600 text-sm mt-1">{t('faq2A')}</p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900">{t('faq3Q')}</h3>
            <p className="text-gray-600 text-sm mt-1">{t('faq3A')}</p>
          </div>
          
          <div>
            <h3 className="font-semibold text-gray-900">{t('faq4Q')}</h3>
            <p className="text-gray-600 text-sm mt-1">{t('faq4A')}</p>
          </div>
        </div>
      </div>

      {/* Contact */}
      <div className="text-center mt-8 text-gray-500">
        <p>
          {t('contactQuestion')}{' '}
          <a href="mailto:support@vysionhoreca.com" className="text-orange-500 hover:underline">
            {t('contactLink')}
          </a>
        </p>
      </div>
    </div>
  )
}
