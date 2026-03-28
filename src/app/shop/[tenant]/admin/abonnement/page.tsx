'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useParams, useSearchParams } from 'next/navigation'
import { useLanguage } from '@/i18n'
import { getAuthHeaders } from '@/lib/auth-headers'
import { motion, AnimatePresence } from 'framer-motion'
import PinGate from '@/components/PinGate'
import { getTenantSettings, TenantSettings } from '@/lib/admin-api'
import { isAdminTenant } from '@/lib/protected-tenants'

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
  stripe_subscription_id: string | null
}

interface Invoice {
  id: string
  invoice_number: string
  amount: number
  status: string
  description: string
  due_date: string
  paid_at: string | null
  created_at: string
}

interface Tenant {
  id: string
  name: string
  slug: string
  plan: string
  subscription_status: string
  trial_ends_at: string | null
}


// Keep legacy translations as fallback - will be removed after migration
const legacyTranslations: Record<string, Record<string, string>> = {
  nl: {
    title: 'Abonnement',
    subtitle: 'Beheer je abonnement en bekijk facturen',
    currentPlan: 'Huidig plan',
    status: 'Status',
    paymentOverview: 'Betalingsoverzicht',
    paidInvoices: 'Betaalde facturen',
    totalPaid: 'Totaal betaald',
    outstanding: 'Openstaand',
    overdue: 'Achterstallig',
    trialStatus: 'Proefperiode',
    activeStatus: 'Actief',
    expiredStatus: 'Verlopen',
    overdueStatus: 'Achterstallig',
    endsOn: 'Eindigt op',
    daysLeft: 'dagen over',
    nextPayment: 'Volgende betaling',
    perMonth: '/maand',
    starter: 'Vysion Pro',
    starterDesc: 'Alles wat je nodig hebt',
    pro: 'Vysion Premium',
    proDesc: 'Alles + extra features',
    popular: 'POPULAIR',
    buyStarter: 'Starter Kopen',
    buyPro: 'Pro Kopen',
    payInvoice: 'Openstaande factuur betalen',
    hasInvoices: 'Je hebt {count} openstaande factuur(en)',
    noInvoices: 'Geen openstaande facturen',
    payNow: 'Factuur Nu Betalen',
    invoices: 'Facturen',
    noInvoicesYet: 'Nog geen facturen',
    firstInvoice: 'Je eerste factuur verschijnt hier na je eerste betaling',
    invoiceNr: 'Factuurnr.',
    date: 'Datum',
    description: 'Omschrijving',
    amount: 'Bedrag',
    statusCol: 'Status',
    action: 'Actie',
    paid: 'Betaald',
    pending: 'Openstaand',
    pay: 'Betalen',
    done: 'Voldaan',
    questions: 'Vragen over facturatie?',
    questionsDesc: 'Heb je vragen over je abonnement of facturen? Neem contact met ons op.',
    loading: 'Laden...',
    noOutstanding: 'Je hebt geen openstaande facturen',
    overdueWarning: 'Achterstallige betaling',
    overdueDesc: 'Je hebt {count} onbetaalde factuur(en) ter waarde van €{amount}. Betaal zo snel mogelijk om je account actief te houden.',
  },
  en: {
    title: 'Subscription',
    subtitle: 'Manage your subscription and view invoices',
    currentPlan: 'Current plan',
    status: 'Status',
    paymentOverview: 'Payment overview',
    paidInvoices: 'Paid invoices',
    totalPaid: 'Total paid',
    outstanding: 'Outstanding',
    overdue: 'Overdue',
    trialStatus: 'Trial',
    activeStatus: 'Active',
    expiredStatus: 'Expired',
    overdueStatus: 'Overdue',
    endsOn: 'Ends on',
    daysLeft: 'days left',
    nextPayment: 'Next payment',
    perMonth: '/month',
    starter: 'Vysion Pro',
    starterDesc: 'Everything you need',
    pro: 'Vysion Premium',
    proDesc: 'Everything + extra features',
    popular: 'POPULAR',
    buyStarter: 'Buy Starter',
    buyPro: 'Buy Pro',
    payInvoice: 'Pay outstanding invoice',
    hasInvoices: 'You have {count} outstanding invoice(s)',
    noInvoices: 'No outstanding invoices',
    payNow: 'Pay Invoice Now',
    invoices: 'Invoices',
    noInvoicesYet: 'No invoices yet',
    firstInvoice: 'Your first invoice will appear here after your first payment',
    invoiceNr: 'Invoice no.',
    date: 'Date',
    description: 'Description',
    amount: 'Amount',
    statusCol: 'Status',
    action: 'Action',
    paid: 'Paid',
    pending: 'Pending',
    pay: 'Pay',
    done: 'Done',
    questions: 'Questions about billing?',
    questionsDesc: 'Have questions about your subscription or invoices? Contact us.',
    loading: 'Loading...',
    noOutstanding: 'You have no outstanding invoices',
    overdueWarning: 'Overdue payment',
    overdueDesc: 'You have {count} unpaid invoice(s) worth €{amount}. Please pay as soon as possible to keep your account active.',
  },
  fr: {
    title: 'Abonnement',
    subtitle: 'Gérez votre abonnement et consultez vos factures',
    currentPlan: 'Plan actuel',
    status: 'Statut',
    paymentOverview: 'Aperçu des paiements',
    paidInvoices: 'Factures payées',
    totalPaid: 'Total payé',
    outstanding: 'En attente',
    overdue: 'En retard',
    trialStatus: 'Essai',
    activeStatus: 'Actif',
    expiredStatus: 'Expiré',
    overdueStatus: 'En retard',
    endsOn: 'Se termine le',
    daysLeft: 'jours restants',
    nextPayment: 'Prochain paiement',
    perMonth: '/mois',
    starter: 'Vysion Pro',
    starterDesc: 'Tout ce dont vous avez besoin',
    pro: 'Vysion Premium',
    proDesc: 'Tout + fonctionnalités supplémentaires',
    popular: 'POPULAIRE',
    buyStarter: 'Acheter Starter',
    buyPro: 'Acheter Pro',
    payInvoice: 'Payer la facture en attente',
    hasInvoices: 'Vous avez {count} facture(s) en attente',
    noInvoices: 'Aucune facture en attente',
    payNow: 'Payer Maintenant',
    invoices: 'Factures',
    noInvoicesYet: 'Pas encore de factures',
    firstInvoice: 'Votre première facture apparaîtra ici après votre premier paiement',
    invoiceNr: 'N° facture',
    date: 'Date',
    description: 'Description',
    amount: 'Montant',
    statusCol: 'Statut',
    action: 'Action',
    paid: 'Payée',
    pending: 'En attente',
    pay: 'Payer',
    done: 'Fait',
    questions: 'Questions sur la facturation?',
    questionsDesc: 'Des questions sur votre abonnement ou vos factures? Contactez-nous.',
    loading: 'Chargement...',
    noOutstanding: 'Vous n\'avez aucune facture en attente',
    overdueWarning: 'Paiement en retard',
    overdueDesc: 'Vous avez {count} facture(s) impayée(s) d\'une valeur de €{amount}. Veuillez payer dès que possible.',
  },
  de: {
    title: 'Abonnement',
    subtitle: 'Verwalten Sie Ihr Abonnement und sehen Sie Rechnungen ein',
    currentPlan: 'Aktueller Plan',
    status: 'Status',
    paymentOverview: 'Zahlungsübersicht',
    paidInvoices: 'Bezahlte Rechnungen',
    totalPaid: 'Gesamt bezahlt',
    outstanding: 'Ausstehend',
    overdue: 'Überfällig',
    trialStatus: 'Testphase',
    activeStatus: 'Aktiv',
    expiredStatus: 'Abgelaufen',
    overdueStatus: 'Überfällig',
    endsOn: 'Endet am',
    daysLeft: 'Tage übrig',
    nextPayment: 'Nächste Zahlung',
    perMonth: '/Monat',
    starter: 'Vysion Pro',
    starterDesc: 'Alles was Sie brauchen',
    pro: 'Vysion Premium',
    proDesc: 'Alles + Zusatzfunktionen',
    popular: 'BELIEBT',
    buyStarter: 'Starter Kaufen',
    buyPro: 'Pro Kaufen',
    payInvoice: 'Offene Rechnung bezahlen',
    hasInvoices: 'Sie haben {count} offene Rechnung(en)',
    noInvoices: 'Keine offenen Rechnungen',
    payNow: 'Jetzt Bezahlen',
    invoices: 'Rechnungen',
    noInvoicesYet: 'Noch keine Rechnungen',
    firstInvoice: 'Ihre erste Rechnung erscheint hier nach Ihrer ersten Zahlung',
    invoiceNr: 'Rechnungsnr.',
    date: 'Datum',
    description: 'Beschreibung',
    amount: 'Betrag',
    statusCol: 'Status',
    action: 'Aktion',
    paid: 'Bezahlt',
    pending: 'Ausstehend',
    pay: 'Bezahlen',
    done: 'Erledigt',
    questions: 'Fragen zur Abrechnung?',
    questionsDesc: 'Haben Sie Fragen zu Ihrem Abonnement oder Ihren Rechnungen? Kontaktieren Sie uns.',
    loading: 'Laden...',
    noOutstanding: 'Sie haben keine offenen Rechnungen',
    overdueWarning: 'Überfällige Zahlung',
    overdueDesc: 'Sie haben {count} unbezahlte Rechnung(en) im Wert von €{amount}. Bitte zahlen Sie so schnell wie möglich.',
  },
  es: {
    title: 'Suscripción',
    subtitle: 'Gestiona tu suscripción y consulta facturas',
    currentPlan: 'Plan actual',
    status: 'Estado',
    paymentOverview: 'Resumen de pagos',
    paidInvoices: 'Facturas pagadas',
    totalPaid: 'Total pagado',
    outstanding: 'Pendiente',
    overdue: 'Vencido',
    trialStatus: 'Prueba',
    activeStatus: 'Activo',
    expiredStatus: 'Expirado',
    overdueStatus: 'Vencido',
    endsOn: 'Termina el',
    daysLeft: 'días restantes',
    nextPayment: 'Próximo pago',
    perMonth: '/mes',
    starter: 'Vysion Pro',
    starterDesc: 'Todo lo que necesitas',
    pro: 'Vysion Premium',
    proDesc: 'Todo + funciones extra',
    popular: 'POPULAR',
    buyStarter: 'Comprar Starter',
    buyPro: 'Comprar Pro',
    payInvoice: 'Pagar factura pendiente',
    hasInvoices: 'Tienes {count} factura(s) pendiente(s)',
    noInvoices: 'Sin facturas pendientes',
    payNow: 'Pagar Ahora',
    invoices: 'Facturas',
    noInvoicesYet: 'Aún no hay facturas',
    firstInvoice: 'Tu primera factura aparecerá aquí después de tu primer pago',
    invoiceNr: 'N° factura',
    date: 'Fecha',
    description: 'Descripción',
    amount: 'Importe',
    statusCol: 'Estado',
    action: 'Acción',
    paid: 'Pagada',
    pending: 'Pendiente',
    pay: 'Pagar',
    done: 'Hecho',
    questions: '¿Preguntas sobre facturación?',
    questionsDesc: '¿Tienes preguntas sobre tu suscripción o facturas? Contáctanos.',
    loading: 'Cargando...',
    noOutstanding: 'No tienes facturas pendientes',
    overdueWarning: 'Pago vencido',
    overdueDesc: 'Tienes {count} factura(s) impagada(s) por valor de €{amount}. Por favor paga lo antes posible.',
  },
  it: {
    title: 'Abbonamento',
    subtitle: 'Gestisci il tuo abbonamento e visualizza le fatture',
    currentPlan: 'Piano attuale',
    status: 'Stato',
    paymentOverview: 'Panoramica pagamenti',
    paidInvoices: 'Fatture pagate',
    totalPaid: 'Totale pagato',
    outstanding: 'In sospeso',
    overdue: 'Scaduto',
    trialStatus: 'Prova',
    activeStatus: 'Attivo',
    expiredStatus: 'Scaduto',
    overdueStatus: 'Scaduto',
    endsOn: 'Termina il',
    daysLeft: 'giorni rimanenti',
    nextPayment: 'Prossimo pagamento',
    perMonth: '/mese',
    starter: 'Vysion Pro',
    starterDesc: 'Tutto ciò di cui hai bisogno',
    pro: 'Vysion Premium',
    proDesc: 'Tutto + funzionalità extra',
    popular: 'POPOLARE',
    buyStarter: 'Acquista Starter',
    buyPro: 'Acquista Pro',
    payInvoice: 'Paga fattura in sospeso',
    hasInvoices: 'Hai {count} fattura/e in sospeso',
    noInvoices: 'Nessuna fattura in sospeso',
    payNow: 'Paga Ora',
    invoices: 'Fatture',
    noInvoicesYet: 'Nessuna fattura ancora',
    firstInvoice: 'La tua prima fattura apparirà qui dopo il primo pagamento',
    invoiceNr: 'N° fattura',
    date: 'Data',
    description: 'Descrizione',
    amount: 'Importo',
    statusCol: 'Stato',
    action: 'Azione',
    paid: 'Pagata',
    pending: 'In sospeso',
    pay: 'Paga',
    done: 'Fatto',
    questions: 'Domande sulla fatturazione?',
    questionsDesc: 'Hai domande sul tuo abbonamento o sulle fatture? Contattaci.',
    loading: 'Caricamento...',
    noOutstanding: 'Non hai fatture in sospeso',
    overdueWarning: 'Pagamento scaduto',
    overdueDesc: 'Hai {count} fattura/e non pagata/e per un valore di €{amount}. Paga il prima possibile.',
  },
  ar: {
    title: 'الاشتراك',
    subtitle: 'إدارة اشتراكك وعرض الفواتير',
    currentPlan: 'الخطة الحالية',
    status: 'الحالة',
    paymentOverview: 'نظرة عامة على المدفوعات',
    paidInvoices: 'الفواتير المدفوعة',
    totalPaid: 'إجمالي المدفوع',
    outstanding: 'معلق',
    overdue: 'متأخر',
    trialStatus: 'تجريبي',
    activeStatus: 'نشط',
    expiredStatus: 'منتهي',
    overdueStatus: 'متأخر',
    endsOn: 'ينتهي في',
    daysLeft: 'أيام متبقية',
    nextPayment: 'الدفعة التالية',
    perMonth: '/شهر',
    starter: 'Vysion Pro',
    starterDesc: 'كل ما تحتاجه',
    pro: 'Vysion Premium',
    proDesc: 'كل شيء + ميزات إضافية',
    popular: 'شائع',
    buyStarter: 'شراء Starter',
    buyPro: 'شراء Pro',
    payInvoice: 'دفع الفاتورة المعلقة',
    hasInvoices: 'لديك {count} فاتورة معلقة',
    noInvoices: 'لا توجد فواتير معلقة',
    payNow: 'ادفع الآن',
    invoices: 'الفواتير',
    noInvoicesYet: 'لا توجد فواتير بعد',
    firstInvoice: 'ستظهر فاتورتك الأولى هنا بعد أول دفعة',
    invoiceNr: 'رقم الفاتورة',
    date: 'التاريخ',
    description: 'الوصف',
    amount: 'المبلغ',
    statusCol: 'الحالة',
    action: 'إجراء',
    paid: 'مدفوعة',
    pending: 'معلقة',
    pay: 'ادفع',
    done: 'تم',
    questions: 'أسئلة حول الفواتير؟',
    questionsDesc: 'هل لديك أسئلة حول اشتراكك أو فواتيرك؟ اتصل بنا.',
    loading: 'جاري التحميل...',
    noOutstanding: 'ليس لديك فواتير معلقة',
    overdueWarning: 'دفعة متأخرة',
    overdueDesc: 'لديك {count} فاتورة غير مدفوعة بقيمة €{amount}. يرجى الدفع في أقرب وقت ممكن.',
  },
  zh: {
    title: '订阅',
    subtitle: '管理您的订阅并查看发票',
    currentPlan: '当前计划',
    status: '状态',
    paymentOverview: '付款概览',
    paidInvoices: '已付发票',
    totalPaid: '已付总额',
    outstanding: '待付',
    overdue: '逾期',
    trialStatus: '试用',
    activeStatus: '活跃',
    expiredStatus: '已过期',
    overdueStatus: '逾期',
    endsOn: '结束于',
    daysLeft: '天剩余',
    nextPayment: '下次付款',
    perMonth: '/月',
    starter: 'Vysion Pro',
    starterDesc: '您需要的一切',
    pro: 'Vysion Premium',
    proDesc: '一切 + 额外功能',
    popular: '热门',
    buyStarter: '购买 Starter',
    buyPro: '购买 Pro',
    payInvoice: '支付待付发票',
    hasInvoices: '您有 {count} 张待付发票',
    noInvoices: '没有待付发票',
    payNow: '立即支付',
    invoices: '发票',
    noInvoicesYet: '还没有发票',
    firstInvoice: '您的第一张发票将在首次付款后显示在这里',
    invoiceNr: '发票号',
    date: '日期',
    description: '描述',
    amount: '金额',
    statusCol: '状态',
    action: '操作',
    paid: '已付',
    pending: '待付',
    pay: '支付',
    done: '完成',
    questions: '账单问题？',
    questionsDesc: '对您的订阅或发票有疑问？联系我们。',
    loading: '加载中...',
    noOutstanding: '您没有待付发票',
    overdueWarning: '逾期付款',
    overdueDesc: '您有 {count} 张未付发票，价值 €{amount}。请尽快付款。',
  },
  ja: {
    title: 'サブスクリプション',
    subtitle: 'サブスクリプションの管理と請求書の確認',
    currentPlan: '現在のプラン',
    status: 'ステータス',
    paymentOverview: '支払い概要',
    paidInvoices: '支払済み請求書',
    totalPaid: '支払い総額',
    outstanding: '未払い',
    overdue: '延滞',
    trialStatus: 'お試し',
    activeStatus: 'アクティブ',
    expiredStatus: '期限切れ',
    overdueStatus: '延滞',
    endsOn: '終了日',
    daysLeft: '日残り',
    nextPayment: '次回支払い',
    perMonth: '/月',
    starter: 'Vysion Pro',
    starterDesc: '必要なものすべて',
    pro: 'Vysion Premium',
    proDesc: 'すべて + 追加機能',
    popular: '人気',
    buyStarter: 'Starterを購入',
    buyPro: 'Proを購入',
    payInvoice: '未払い請求書を支払う',
    hasInvoices: '{count}件の未払い請求書があります',
    noInvoices: '未払い請求書はありません',
    payNow: '今すぐ支払う',
    invoices: '請求書',
    noInvoicesYet: 'まだ請求書はありません',
    firstInvoice: '最初の請求書は最初の支払い後にここに表示されます',
    invoiceNr: '請求書番号',
    date: '日付',
    description: '説明',
    amount: '金額',
    statusCol: 'ステータス',
    action: 'アクション',
    paid: '支払済み',
    pending: '未払い',
    pay: '支払う',
    done: '完了',
    questions: '請求に関するご質問は？',
    questionsDesc: 'サブスクリプションや請求書についてご質問がありますか？お問い合わせください。',
    loading: '読み込み中...',
    noOutstanding: '未払いの請求書はありません',
    overdueWarning: '延滞支払い',
    overdueDesc: '€{amount}相当の未払い請求書が{count}件あります。できるだけ早くお支払いください。',
  },
}

const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) return null
  return createClient(supabaseUrl, supabaseKey)
}

export default function AbonnementPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const tenantSlug = params.tenant as string
  const { t: globalT, locale } = useLanguage()
  
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [tenantInfo, setTenantInfo] = useState<TenantSettings | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [billingYearly, setBillingYearly] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [showCancelled, setShowCancelled] = useState(false)
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false)
  const [successType, setSuccessType] = useState<'subscription' | 'invoice'>('subscription')

  // Check URL parameters for payment result
  useEffect(() => {
    const success = searchParams.get('success')
    const payment = searchParams.get('payment')
    const cancelled = searchParams.get('cancelled')
    const upgrade = searchParams.get('upgrade')
    
    if (upgrade === 'pro') {
      setShowUpgradeBanner(true)
      setBillingYearly(false)
      window.history.replaceState({}, '', window.location.pathname)
    } else if (success === 'true') {
      setSuccessType('subscription')
      setShowSuccess(true)
      window.history.replaceState({}, '', window.location.pathname)
    } else if (payment === 'success') {
      setSuccessType('invoice')
      setShowSuccess(true)
      window.history.replaceState({}, '', window.location.pathname)
    } else if (cancelled === 'true' || payment === 'cancelled') {
      setShowCancelled(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [searchParams])

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantSlug])

  // Translation function that uses global i18n system
  const t = (key: string, replacements?: Record<string, string | number>) => {
    // Try global i18n first
    let text = globalT(`adminPages.subscription.${key}`)
    
    // If key not found in global, fall back to legacy translations
    if (text === `adminPages.subscription.${key}`) {
      text = legacyTranslations[locale]?.[key] || legacyTranslations.nl[key] || key
    }
    
    // Apply replacements
    if (replacements) {
      Object.entries(replacements).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v))
      })
    }
    return text
  }

  async function loadData() {
    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }

    const { data: subData } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .single()
    setSubscription(subData)

    const { data: tenantData } = await supabase
      .from('tenants')
      .select('*')
      .eq('slug', tenantSlug)
      .single()
    setTenant(tenantData)

    const settingsData = await getTenantSettings(tenantSlug)
    setTenantInfo(settingsData)

    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .order('created_at', { ascending: false })
    setInvoices(invoiceData || [])

    setLoading(false)
  }

  async function handleSubscribe(planId: string, billing: string = 'monthly') {
    setProcessing(planId)
    
    try {
      const response = await fetch('/api/create-subscription-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ tenantSlug, planId, billing }),
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

  async function handlePayInvoice(invoice: Invoice) {
    setProcessing(invoice.id)
    
    try {
      const response = await fetch('/api/create-invoice-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          tenantSlug,
          invoiceId: invoice.id,
          amount: invoice.amount,
          description: invoice.description || `Factuur ${invoice.invoice_number}`,
        }),
      })

      const data = await response.json()

      if (data.url) {
        window.location.href = data.url
      } else if (data.error) {
        alert(data.error)
      }
    } catch (error) {
      console.error('Payment error:', error)
      alert('Er ging iets mis. Probeer het opnieuw.')
    } finally {
      setProcessing(null)
    }
  }

  // Calculate stats
  const paidInvoices = invoices.filter(i => i.status === 'paid')
  const pendingInvoices = invoices.filter(i => i.status === 'pending')
  const overdueInvoices = invoices.filter(i => i.status === 'overdue')
  const totalPaid = paidInvoices.reduce((sum, i) => sum + Number(i.amount), 0)
  const totalOverdue = overdueInvoices.reduce((sum, i) => sum + Number(i.amount), 0)

  // Calculate trial info
  let daysLeft = 0
  let trialEndDate = ''
  const trialEndsAt =
    isAdminTenant(tenantSlug) ? null : subscription?.trial_ends_at || tenant?.trial_ends_at
  let status = subscription?.status || tenant?.subscription_status || 'trial'
  if (isAdminTenant(tenantSlug)) {
    status = 'active'
  }

  if ((status === 'trial' || status === 'TRIAL') && trialEndsAt) {
    const now = new Date()
    const trialEnd = new Date(trialEndsAt)
    daysLeft = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
    trialEndDate = trialEnd.toLocaleDateString(locale === 'nl' ? 'nl-BE' : locale, { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const currentPlan = isAdminTenant(tenantSlug)
    ? 'pro'
    : (status === 'trial' || status === 'TRIAL')
      ? 'pro'
      : (subscription?.plan || tenant?.plan || 'starter')
  const isActive = status === 'active' || status === 'ACTIVE'
  const isTrial = status === 'trial' || status === 'TRIAL'
  const isExpired = status === 'expired' || status === 'EXPIRED'
  const hasOverdue = overdueInvoices.length > 0

  // Check of abonnement bijna verloopt (binnen 7 dagen)
  let expiringDays: number | null = null
  let expiringDate = ''
  if (isActive && subscription?.next_payment_at) {
    const nextPayment = new Date(subscription.next_payment_at)
    const now = new Date()
    const diffDays = Math.ceil((nextPayment.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays <= 7 && diffDays > 0) {
      expiringDays = diffDays
      expiringDate = nextPayment.toLocaleDateString(locale === 'nl' ? 'nl-BE' : locale, {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <PinGate tenant={tenantSlug}>
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-gray-600 mt-2">{t('subtitle')}</p>
      </div>

      {/* Zaakgegevens + Upgrade knop */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 mb-4">🏢 Zaakgegevens</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {tenantInfo?.business_name && (
                <div><span className="text-gray-500">Naam</span><p className="font-semibold text-gray-900">{tenantInfo.business_name}</p></div>
              )}
              {tenantInfo?.email && (
                <div><span className="text-gray-500">E-mail</span><p className="font-semibold text-gray-900">{tenantInfo.email}</p></div>
              )}
              {tenantInfo?.phone && (
                <div><span className="text-gray-500">Telefoon</span><p className="font-semibold text-gray-900">{tenantInfo.phone}</p></div>
              )}
              {tenantInfo?.btw_number && (
                <div><span className="text-gray-500">BTW-nummer</span><p className="font-semibold text-gray-900">{tenantInfo.btw_number}</p></div>
              )}
              {tenantInfo?.address && (
                <div><span className="text-gray-500">Adres</span><p className="font-semibold text-gray-900">{tenantInfo.address}</p></div>
              )}
              {(tenantInfo?.postal_code || tenantInfo?.city) && (
                <div><span className="text-gray-500">Gemeente</span><p className="font-semibold text-gray-900">{[tenantInfo.postal_code, tenantInfo.city].filter(Boolean).join(' ')}</p></div>
              )}
              {tenantInfo?.country && (
                <div><span className="text-gray-500">Land</span><p className="font-semibold text-gray-900">{tenantInfo.country}</p></div>
              )}
            </div>
          </div>
          {/* Upgrade knop voor starter plan */}
          {(currentPlan === 'starter' || currentPlan === 'STARTER') && (
            <div className="flex-shrink-0">
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-2xl p-5 text-center max-w-xs">
                <span className="text-3xl">✨</span>
                <h3 className="font-bold text-purple-900 mt-2 mb-1">Upgrade naar Premium</h3>
                <p className="text-purple-700 text-sm mb-4">Alle features voor €99/maand</p>
                <button
                  onClick={() => handleSubscribe('pro', 'monthly')}
                  disabled={processing !== null}
                  className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-3 px-6 rounded-xl font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {processing === 'pro' ? '⏳ Laden...' : '🛒 Upgrade naar Premium'}
                </button>
              </div>
            </div>
          )}
          {/* Huidig plan is Premium */}
          {(currentPlan === 'pro' || currentPlan === 'PRO') && (isActive || isTrial) && (
            <div className="flex-shrink-0">
              <div className="bg-gradient-to-br from-purple-100 to-pink-100 border border-purple-300 rounded-2xl p-5 text-center max-w-xs">
                <span className="text-3xl">✨</span>
                <h3 className="font-bold text-purple-900 mt-2 mb-1">Vysion Premium</h3>
                <p className="text-green-700 font-semibold text-sm">✅ Uw huidig plan is Premium</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade Banner - wordt getoond wanneer tenant een Pro feature probeert te openen */}
      <AnimatePresence>
        {showUpgradeBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-2xl p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">✨</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-purple-900">Dit is een Pro functie</h3>
                <p className="text-purple-700 mt-1">
                  Het volledige reserveringssysteem met tafelplan, online boeking door klanten, no-show bescherming en gaste CRM is beschikbaar in <strong>Vysion Premium (€99/maand)</strong>.
                </p>
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => {
                      setShowUpgradeBanner(false)
                      setBillingYearly(false)
                      document.getElementById('pro-plan-card')?.scrollIntoView({ behavior: 'smooth' })
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-lg font-bold text-sm transition-colors"
                  >
                    🛒 Upgrade naar Pro
                  </button>
                  <button
                    onClick={() => setShowUpgradeBanner(false)}
                    className="text-purple-600 hover:text-purple-700 font-medium text-sm"
                  >
                    Later
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Success Banner */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-green-50 border-2 border-green-300 rounded-2xl p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">✓</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-green-800">
                  {successType === 'subscription' ? 'Abonnement geactiveerd!' : 'Factuur betaald!'}
                </h3>
                <p className="text-green-700 mt-1">
                  {successType === 'subscription' 
                    ? 'Bedankt voor je betaling! Je abonnement is nu actief en je hebt volledige toegang tot alle functies.'
                    : 'Bedankt voor je betaling! Je factuur is succesvol betaald.'}
                </p>
                <button
                  onClick={() => setShowSuccess(false)}
                  className="mt-4 text-green-600 hover:text-green-700 font-medium text-sm"
                >
                  Sluiten
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cancelled Banner */}
      <AnimatePresence>
        {showCancelled && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6"
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-2xl">⚠️</span>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-amber-800">Betaling geannuleerd</h3>
                <p className="text-amber-700 mt-1">
                  Je betaling is geannuleerd. Geen zorgen, er is niets afgeschreven. Je kunt het opnieuw proberen wanneer je klaar bent.
                </p>
                <button
                  onClick={() => setShowCancelled(false)}
                  className="mt-4 text-amber-600 hover:text-amber-700 font-medium text-sm"
                >
                  Sluiten
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Warning Banner for Overdue */}
      {hasOverdue && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800">{t('overdueWarning')}</h3>
              <p className="text-red-700 mt-1">
                {t('overdueDesc', { count: overdueInvoices.length, amount: totalOverdue.toFixed(2) })}
              </p>
              <button
                onClick={() => overdueInvoices[0] && handlePayInvoice(overdueInvoices[0])}
                className="mt-4 bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                {t('payNow')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Warning Banner voor bijna verlopend abonnement */}
      {expiringDays !== null && !hasOverdue && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">⏰</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-amber-800">Uw abonnement loopt bijna af!</h3>
              <p className="text-amber-700 mt-1">
                Uw abonnement verloopt over <strong>{expiringDays} {expiringDays === 1 ? 'dag' : 'dagen'}</strong> ({expiringDate}).
                Verleng op tijd om uw webshop online te houden.
              </p>
              <button
                onClick={() => handleSubscribe(currentPlan)}
                disabled={processing !== null}
                className="mt-4 bg-amber-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-amber-700 transition-colors disabled:opacity-50"
              >
                {processing ? t('loading') : '💳 Nu Verlengen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan Overview */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Plan Card */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              currentPlan === 'pro' || currentPlan === 'PRO' ? 'bg-purple-100' : 'bg-yellow-100'
            }`}>
              <span className="text-2xl">{currentPlan === 'pro' || currentPlan === 'PRO' ? '✨' : '⚡'}</span>
            </div>
            <div>
              <p className="text-sm text-gray-500">{t('currentPlan')}</p>
              <p className="text-xl font-bold text-gray-900 capitalize">
                Vysion {currentPlan}
              </p>
            </div>
          </div>
          <div className="text-3xl font-bold text-gray-900">
            €{currentPlan === 'pro' || currentPlan === 'PRO' ? '99' : '59'}
            <span className="text-base font-normal text-gray-500">{t('perMonth')}</span>
          </div>
        </div>

        {/* Status Card */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-2">{t('status')}</p>
          <div className="flex items-center gap-3 mb-4">
            <span className={`px-4 py-2 rounded-full text-sm font-bold ${
              hasOverdue 
                ? 'bg-red-100 text-red-700'
                : isActive 
                ? 'bg-green-100 text-green-700'
                : isTrial
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-700'
            }`}>
              {hasOverdue ? `⚠️ ${t('overdueStatus')}` : 
               isActive ? `✓ ${t('activeStatus')}` : 
               isTrial ? `🕐 ${t('trialStatus')}` : 
               isExpired ? `✗ ${t('expiredStatus')}` : status}
            </span>
          </div>
          {isTrial && (
            <p className="text-gray-600">
              {t('endsOn')} <strong>{trialEndDate}</strong>
              <br />
              <span className="text-blue-600 font-medium">{daysLeft} {t('daysLeft')}</span>
            </p>
          )}
          {isActive && subscription?.next_payment_at && (
            <p className="text-gray-600">
              {t('nextPayment')}: {new Date(subscription.next_payment_at).toLocaleDateString(locale === 'nl' ? 'nl-BE' : locale)}
            </p>
          )}
        </div>

        {/* Payment Stats Card */}
        <div className="bg-white rounded-2xl border-2 border-gray-200 p-6">
          <p className="text-sm text-gray-500 mb-4">{t('paymentOverview')}</p>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('paidInvoices')}</span>
              <span className="font-bold text-green-600">{paidInvoices.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('totalPaid')}</span>
              <span className="font-bold text-gray-900">€{totalPaid.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">{t('outstanding')}</span>
              <span className={`font-bold ${pendingInvoices.length > 0 ? 'text-blue-600' : 'text-gray-400'}`}>
                {pendingInvoices.length}
              </span>
            </div>
            {overdueInvoices.length > 0 && (
              <div className="flex justify-between text-red-600">
                <span>{t('overdue')}</span>
                <span className="font-bold">€{totalOverdue.toFixed(2)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Abonnement Kopen - ALTIJD ZICHTBAAR */}
      {/* Billing Toggle */}
      <div className="flex flex-col items-center mb-6">
        <div className="bg-gray-100 p-1 rounded-full inline-flex items-center">
          <button
            onClick={() => setBillingYearly(false)}
            className={`px-5 py-2 rounded-full font-semibold transition-all text-sm ${
              !billingYearly 
                ? 'bg-white text-gray-900 shadow' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Maandelijks
          </button>
          <button
            onClick={() => setBillingYearly(true)}
            className={`px-5 py-2 rounded-full font-semibold transition-all text-sm relative ${
              billingYearly 
                ? 'bg-white text-gray-900 shadow' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Jaarlijks
            <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              -10%
            </span>
          </button>
        </div>
        {billingYearly && (
          <p className="text-green-600 text-sm mt-2 font-medium">
            ✓ Je bespaart 10% met een jaarabonnement!
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Starter Plan */}
        <div className="bg-gradient-to-br from-[#1a2e1a] to-[#2d4a2d] rounded-2xl p-6 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-yellow-400 rounded-xl flex items-center justify-center">
              <span className="text-2xl">⚡</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">{t('starter')}</h3>
              <p className="text-green-200 text-sm">{t('starterDesc')}</p>
            </div>
          </div>
          <div className="mb-6">
            {billingYearly ? (
              <>
                <span className="text-4xl font-bold text-yellow-400">€{Math.round(59 * 12 * 0.9)}</span>
                <span className="text-gray-300 ml-2">/jaar</span>
                <p className="text-green-300 text-sm mt-1">= €{Math.round(59 * 0.9)}/maand</p>
              </>
            ) : (
              <>
                <span className="text-4xl font-bold text-yellow-400">€59</span>
                <span className="text-gray-300 ml-2">{t('perMonth')}</span>
              </>
            )}
          </div>
          <button
            onClick={() => handleSubscribe('starter', billingYearly ? 'yearly' : 'monthly')}
            disabled={processing !== null}
            className="w-full bg-yellow-400 hover:bg-yellow-300 text-gray-900 py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-50"
          >
            {processing === 'starter' ? t('loading') : `🛒 ${t('buyStarter')}`}
          </button>
        </div>

        {/* Pro Plan */}
        <div id="pro-plan-card" className="bg-gradient-to-br from-[#2d1f3d] to-[#4a2d6a] rounded-2xl p-6 text-white relative">
          <div className="absolute -top-3 right-6">
            <span className="bg-pink-500 text-white text-xs font-bold px-4 py-1.5 rounded-full">
              {t('popular')}
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-purple-400 rounded-xl flex items-center justify-center">
              <span className="text-2xl">✨</span>
            </div>
            <div>
              <h3 className="text-xl font-bold">{t('pro')}</h3>
              <p className="text-purple-200 text-sm">{t('proDesc')}</p>
            </div>
          </div>
          <div className="mb-6">
            {billingYearly ? (
              <>
                <span className="text-4xl font-bold text-purple-300">€{Math.round(99 * 12 * 0.9)}</span>
                <span className="text-gray-300 ml-2">/jaar</span>
                <p className="text-purple-200 text-sm mt-1">= €{Math.round(99 * 0.9)}/maand</p>
              </>
            ) : (
              <>
                <span className="text-4xl font-bold text-purple-300">€99</span>
                <span className="text-gray-300 ml-2">{t('perMonth')}</span>
              </>
            )}
          </div>
          <button
            onClick={() => handleSubscribe('pro', billingYearly ? 'yearly' : 'monthly')}
            disabled={processing !== null}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-50"
          >
            {processing === 'pro' ? t('loading') : `🛒 ${t('buyPro')}`}
          </button>
        </div>
      </div>

      {/* Factuur Betalen Knop - ALTIJD ZICHTBAAR */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{t('payInvoice')}</h3>
            <p className="text-gray-600 mt-1">
              {pendingInvoices.length > 0 || overdueInvoices.length > 0 
                ? t('hasInvoices', { count: pendingInvoices.length + overdueInvoices.length })
                : t('noInvoices')}
            </p>
          </div>
          <button
            onClick={() => {
              const invoice = overdueInvoices[0] || pendingInvoices[0]
              if (invoice) {
                handlePayInvoice(invoice)
              } else {
                alert(t('noOutstanding'))
              }
            }}
            disabled={processing !== null}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {processing && processing !== 'starter' && processing !== 'pro' ? t('loading') : `💳 ${t('payNow')}`}
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{t('invoices')}</h2>
        </div>
        
        {invoices.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-lg font-medium">{t('noInvoicesYet')}</p>
            <p className="text-sm mt-1">{t('firstInvoice')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('invoiceNr')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('date')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('description')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('amount')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('statusCol')}</th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">{t('action')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-mono text-sm">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 text-gray-600">
                      {new Date(invoice.created_at).toLocaleDateString(locale === 'nl' ? 'nl-BE' : locale)}
                    </td>
                    <td className="px-6 py-4 text-gray-900">{invoice.description || '-'}</td>
                    <td className="px-6 py-4 font-semibold">€{Number(invoice.amount).toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                        invoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                        invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {invoice.status === 'paid' ? t('paid') :
                         invoice.status === 'overdue' ? t('overdue') :
                         invoice.status === 'pending' ? t('pending') :
                         invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {(invoice.status === 'pending' || invoice.status === 'overdue') ? (
                        <button
                          onClick={() => handlePayInvoice(invoice)}
                          disabled={processing === invoice.id}
                          className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                        >
                          {processing === invoice.id ? t('loading') : t('pay')}
                        </button>
                      ) : invoice.status === 'paid' ? (
                        <span className="text-gray-400 text-sm">✓ {t('done')}</span>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="font-bold text-gray-900 mb-4">{t('questions')}</h3>
        <p className="text-gray-600 mb-4">{t('questionsDesc')}</p>
        <div className="flex flex-wrap gap-4">
          <a 
            href="mailto:info@vysionhoreca.com" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            info@vysionhoreca.com
          </a>
          <a 
            href="tel:+32492129383" 
            className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            +32 492 12 93 83
          </a>
        </div>
      </div>
    </div>
    </PinGate>
  )
}
