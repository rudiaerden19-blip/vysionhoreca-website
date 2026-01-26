'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getTenantSettings } from '@/lib/admin-api'
import { useLanguage } from '@/i18n'

// KRITIEK: Hash functie voor integriteitsverificatie (fiscale compliance)
async function generateReportHash(data: {
  tenant: string
  date: string
  orderCount: number
  total: number
  orderIds: string[]
}): Promise<string> {
  const hashInput = JSON.stringify({
    tenant: data.tenant,
    date: data.date,
    orderCount: data.orderCount,
    total: Math.round(data.total * 100), // Cents voor precisie
    orderIds: data.orderIds.sort(), // Sorteer voor consistentie
    version: 'v1' // Versie voor toekomstige updates
  })
  
  const encoder = new TextEncoder()
  const dataBuffer = encoder.encode(hashInput)
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

interface DailyStats {
  date: string
  orderCount: number
  subtotal: number
  taxLow: number
  taxMid: number
  taxHigh: number
  total: number
  cashPayments: number
  onlinePayments: number
  cardPayments: number
  orderIds: string[] // KRITIEK: Audit trail voor fiscale compliance
}

interface SavedReport {
  id: string
  report_date: string
  order_count: number
  total: number
  generated_at: string
  order_ids?: string[]
  report_hash?: string
}

export default function ZRapportPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  // Get today's date in local timezone (not UTC)
  const getLocalDateString = (date: Date = new Date()) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  
  const [selectedDate, setSelectedDate] = useState(getLocalDateString())
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [businessInfo, setBusinessInfo] = useState<any>(null)
  const [btwPercentage, setBtwPercentage] = useState(6)
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [sendingEmail, setSendingEmail] = useState(false)

  useEffect(() => {
    loadData()
    loadSavedReports()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant, selectedDate])

  const loadData = async () => {
    setLoading(true)
    
    const settings = await getTenantSettings(params.tenant)
    if (settings) {
      setBusinessInfo(settings)
      setBtwPercentage(settings.btw_percentage || 6)
    }

    const startOfDay = `${selectedDate}T00:00:00`
    const endOfDay = `${selectedDate}T23:59:59`

    const { data: orders } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      // KRITIEK: Alleen 'completed' orders meetellen voor fiscale compliance
      // Andere statussen (confirmed, preparing, ready) kunnen nog geweigerd worden!
      .eq('status', 'completed')


    if (orders) {
      let total = 0
      let cashPayments = 0
      let onlinePayments = 0
      let cardPayments = 0
      const orderIds: string[] = []

      orders.forEach(order => {
        // KRITIEK: Bewaar order ID voor audit trail
        orderIds.push(order.id)
        
        const orderTotal = order.total || 0
        total += orderTotal
        
        const paymentMethod = (order.payment_method || '').toLowerCase()
        if (paymentMethod === 'cash' || paymentMethod === 'contant') {
          cashPayments += orderTotal
        } else if (paymentMethod === 'card' || paymentMethod === 'pin' || paymentMethod === 'kaart') {
          cardPayments += orderTotal
        } else {
          onlinePayments += orderTotal
        }
      })

      const taxRate = btwPercentage / 100
      const subtotal = total / (1 + taxRate)
      const tax = total - subtotal

      setStats({
        date: selectedDate,
        orderCount: orders.length,
        subtotal,
        taxLow: btwPercentage === 6 ? tax : 0,
        taxMid: btwPercentage === 12 ? tax : 0,
        taxHigh: btwPercentage === 21 ? tax : 0,
        total,
        cashPayments,
        onlinePayments,
        cardPayments,
        orderIds, // KRITIEK: Audit trail
      })
    }

    setLoading(false)
  }

  const loadSavedReports = async () => {
    const { data } = await supabase
      .from('z_reports')
      .select('id, report_date, order_count, total, generated_at, order_ids, report_hash')
      .eq('tenant_slug', params.tenant)
      .order('report_date', { ascending: false })
      .limit(100)

    if (data) {
      setSavedReports(data)
    }
  }

  // Refresh data
  const refreshData = () => {
    loadData()
    loadSavedReports()
  }

  // Synchroniseer rapport met database (voor als automatische update niet heeft gewerkt)
  const syncReport = async () => {
    if (!stats || stats.orderCount === 0) return
    
    setSyncing(true)
    
    // Genereer hash
    const hashInput = JSON.stringify({
      tenant: params.tenant,
      date: selectedDate,
      orderCount: stats.orderCount,
      total: Math.round(stats.total * 100),
      orderIds: stats.orderIds.sort(),
      version: 'v1'
    })
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(hashInput)
    const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const reportHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    
    const { error } = await supabase
      .from('z_reports')
      .upsert({
        tenant_slug: params.tenant,
        report_date: selectedDate,
        order_count: stats.orderCount,
        subtotal: stats.subtotal,
        tax_low: stats.taxLow,
        tax_mid: stats.taxMid,
        tax_high: stats.taxHigh,
        total: stats.total,
        cash_payments: stats.cashPayments,
        card_payments: stats.cardPayments,
        online_payments: stats.onlinePayments,
        btw_percentage: btwPercentage,
        business_name: businessInfo?.business_name,
        business_address: businessInfo?.address,
        btw_number: businessInfo?.btw_number,
        order_ids: stats.orderIds,
        report_hash: reportHash,
        generated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_slug,report_date',
        ignoreDuplicates: false
      })
    
    if (!error) {
      loadSavedReports()
    } else {
      console.error('Sync error:', error)
      alert('Fout bij synchroniseren: ' + error.message)
    }
    
    setSyncing(false)
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('nl-BE', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('nl-BE', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    })
  }

  const formatCurrency = (amount: number) => `€${amount.toFixed(2)}`

  const printZRapport = () => window.print()

  // Genereer HTML voor PDF/email
  const generateReportHTML = () => {
    if (!stats) return ''
    
    const taxRate = btwPercentage / 100
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Z-Rapport ${formatShortDate(selectedDate)}</title>
        <style>
          body { font-family: 'Courier New', monospace; max-width: 400px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 15px; margin-bottom: 15px; }
          .header h1 { margin: 0; font-size: 18px; }
          .header p { margin: 5px 0; font-size: 12px; color: #666; }
          .section { margin: 15px 0; }
          .section-title { font-weight: bold; border-bottom: 1px solid #ccc; margin-bottom: 10px; }
          .row { display: flex; justify-content: space-between; font-size: 14px; margin: 5px 0; }
          .total-row { font-weight: bold; font-size: 16px; border-top: 2px solid #000; padding-top: 10px; margin-top: 10px; }
          .footer { text-align: center; font-size: 10px; color: #666; border-top: 2px dashed #000; margin-top: 20px; padding-top: 15px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>${businessInfo?.business_name || 'Z-Rapport'}</h1>
          <p>${businessInfo?.address || ''}</p>
          ${businessInfo?.btw_number ? `<p>BTW: ${businessInfo.btw_number}</p>` : ''}
          <p style="margin-top: 10px; font-weight: bold;">Z-RAPPORT</p>
          <p>${formatDate(selectedDate)}</p>
        </div>
        
        <div class="section">
          <div class="section-title">OMZET</div>
          <div class="row"><span>Aantal transacties:</span><span>${stats.orderCount}</span></div>
          <div class="row"><span>Subtotaal (excl. BTW):</span><span>${formatCurrency(stats.subtotal)}</span></div>
          <div class="row"><span>BTW ${btwPercentage}%:</span><span>${formatCurrency(stats.total - stats.subtotal)}</span></div>
          <div class="row total-row"><span>TOTAAL:</span><span>${formatCurrency(stats.total)}</span></div>
        </div>
        
        <div class="section">
          <div class="section-title">BETALINGEN</div>
          <div class="row"><span>Contant:</span><span>${formatCurrency(stats.cashPayments)}</span></div>
          <div class="row"><span>PIN/Kaart:</span><span>${formatCurrency(stats.cardPayments)}</span></div>
          <div class="row"><span>Online:</span><span>${formatCurrency(stats.onlinePayments)}</span></div>
        </div>
        
        <div class="footer">
          <p>Gegenereerd: ${new Date().toLocaleString('nl-NL')}</p>
          <p>Dit is een officieel kassarapport</p>
        </div>
      </body>
      </html>
    `
  }

  // Download als PDF (via print dialog met Save as PDF)
  const downloadPDF = () => {
    const html = generateReportHTML()
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(html)
      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }

  // Verstuur per e-mail
  const sendEmailReport = async () => {
    if (!emailAddress || !stats) return
    
    setSendingEmail(true)
    
    try {
      const response = await fetch('/api/send-z-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: emailAddress,
          subject: `Z-Rapport ${formatShortDate(selectedDate)} - ${businessInfo?.business_name || params.tenant}`,
          businessName: businessInfo?.business_name || params.tenant,
          businessAddress: businessInfo?.address || '',
          btwNumber: businessInfo?.btw_number || '',
          date: selectedDate,
          formattedDate: formatDate(selectedDate),
          orderCount: stats.orderCount,
          subtotal: stats.subtotal,
          tax: stats.total - stats.subtotal,
          btwPercentage,
          total: stats.total,
          cashPayments: stats.cashPayments,
          cardPayments: stats.cardPayments,
          onlinePayments: stats.onlinePayments,
        })
      })
      
      if (response.ok) {
        alert('Z-Rapport verzonden naar ' + emailAddress)
        setShowEmailModal(false)
        setEmailAddress('')
      } else {
        const error = await response.json()
        alert('Fout bij verzenden: ' + (error.message || 'Onbekende fout'))
      }
    } catch (error) {
      alert('Fout bij verzenden. Probeer opnieuw.')
    }
    
    setSendingEmail(false)
  }

  const goToPreviousDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const date = new Date(y, m - 1, d - 1)
    setSelectedDate(getLocalDateString(date))
  }

  const goToNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number)
    const date = new Date(y, m - 1, d + 1)
    const today = getLocalDateString()
    const newDate = getLocalDateString(date)
    if (newDate <= today) {
      setSelectedDate(newDate)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">{t('adminPages.common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🧾 {t('zReport.title')}</h1>
          <p className="text-gray-500">{t('zReport.subtitle')}</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-4 py-2 rounded-xl font-medium flex items-center gap-2 ${
              showHistory ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📚 {t('zReport.history')}
          </button>
          <button
            onClick={printZRapport}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium flex items-center gap-2"
          >
            🖨️ {t('zReport.print')}
          </button>
          <button
            onClick={downloadPDF}
            disabled={!stats || stats.orderCount === 0}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
          >
            📄 PDF
          </button>
          <button
            onClick={() => {
              setEmailAddress(businessInfo?.email || '')
              setShowEmailModal(true)
            }}
            disabled={!stats || stats.orderCount === 0}
            className="px-4 py-2 bg-purple-100 hover:bg-purple-200 text-purple-600 rounded-xl font-medium flex items-center gap-2 disabled:opacity-50"
          >
            📧 E-mail
          </button>
          <button
            onClick={refreshData}
            disabled={loading}
            className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-600 rounded-xl font-medium flex items-center gap-2"
          >
            🔄 {t('zReport.refresh')}
          </button>
          <button
            onClick={syncReport}
            disabled={syncing || !stats || stats.orderCount === 0}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-xl font-medium flex items-center gap-2 disabled:bg-gray-300"
          >
            {syncing ? '⏳' : '💾'} {t('zReport.sync')}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Report */}
        <div className="lg:col-span-2">
          {/* Date Selector */}
          <div className="flex items-center justify-center gap-4 mb-6 print:hidden">
            <button onClick={goToPreviousDay} className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl">←</button>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={getLocalDateString()}
              className="px-4 py-3 border border-gray-200 rounded-xl text-center font-medium"
            />
            <button
              onClick={goToNextDay}
              disabled={selectedDate === getLocalDateString()}
              className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-50"
            >→</button>
          </div>

          {/* Z-Rapport */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none"
          >
            {/* Header */}
            <div className="bg-gray-900 text-white p-6 text-center">
              <h2 className="text-xl font-bold mb-1">{businessInfo?.business_name || 'Zaak'}</h2>
              <p className="text-gray-400 text-sm">{businessInfo?.address}</p>
              {businessInfo?.btw_number && (
                <p className="text-gray-400 text-sm">{t('zReport.vatNumber')}: {businessInfo.btw_number}</p>
              )}
            </div>

            {/* Title */}
            <div className="border-b-2 border-dashed border-gray-300 p-6 text-center">
              <h3 className="text-2xl font-bold text-gray-900">{t('zReport.reportTitle')}</h3>
              <p className="text-lg text-gray-600">{t('zReport.onlineSales')}</p>
              <p className="text-gray-500 mt-2">{formatDate(selectedDate)}</p>
              <span className="inline-block mt-2 px-3 py-1 bg-blue-100 text-blue-600 text-sm rounded-full">
                🔄 {t('zReport.autoUpdated')}
              </span>
            </div>

            {/* Stats */}
            {stats && stats.orderCount > 0 ? (
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-gray-600">{t('zReport.orderCount')}</span>
                  <span className="font-bold text-lg">{stats.orderCount}</span>
                </div>

                <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">{t('zReport.subtotal')}</span>
                  <span className="font-medium">{formatCurrency(stats.subtotal)}</span>
                </div>

                {stats.taxLow > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">{t('zReport.vat')} 6%</span>
                    <span className="font-medium">{formatCurrency(stats.taxLow)}</span>
                  </div>
                )}
                {stats.taxMid > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">{t('zReport.vat')} 12%</span>
                    <span className="font-medium">{formatCurrency(stats.taxMid)}</span>
                  </div>
                )}
                {stats.taxHigh > 0 && (
                  <div className="flex justify-between items-center py-2">
                    <span className="text-gray-600">{t('zReport.vat')} 21%</span>
                    <span className="font-medium">{formatCurrency(stats.taxHigh)}</span>
                  </div>
                )}

                <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

                <div className="flex justify-between items-center py-4 bg-gray-100 -mx-6 px-6">
                  <span className="text-xl font-bold text-gray-900">{t('zReport.total')}</span>
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(stats.total)}</span>
                </div>

                <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-900 mb-3">{t('zReport.paymentMethods')}</h4>
                  
                  {stats.onlinePayments > 0 && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">💳 {t('zReport.onlinePaid')}</span>
                      <span className="font-medium">{formatCurrency(stats.onlinePayments)}</span>
                    </div>
                  )}
                  {stats.cardPayments > 0 && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">💳 {t('zReport.cardPaid')}</span>
                      <span className="font-medium">{formatCurrency(stats.cardPayments)}</span>
                    </div>
                  )}
                  {stats.cashPayments > 0 && (
                    <div className="flex justify-between items-center py-2">
                      <span className="text-gray-600">💵 {t('zReport.cashPaid')}</span>
                      <span className="font-medium">{formatCurrency(stats.cashPayments)}</span>
                    </div>
                  )}
                </div>

                <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

                <div className="text-center text-gray-500 text-sm pt-4">
                  <p>{t('zReport.generatedOn')} {new Date().toLocaleString('nl-BE')}</p>
                  <p className="mt-1">Vysion Horeca - ordervysion.com</p>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center">
                <span className="text-6xl mb-4 block">📭</span>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('zReport.noOrders')}</h3>
                <p className="text-gray-500">{t('zReport.noOrdersDesc')}</p>
              </div>
            )}
          </motion.div>

          {/* Instructions */}
          <div className="mt-6 p-6 bg-blue-50 border border-blue-200 rounded-2xl print:hidden">
            <h3 className="font-semibold text-blue-900 mb-3">💡 {t('zReport.howToUse')}</h3>
            <ol className="text-blue-800 space-y-2 text-sm">
              <li>1. {t('zReport.step1')}</li>
              <li>2. {t('zReport.step2')}</li>
              <li>3. {t('zReport.step3')} <strong>{stats ? formatCurrency(stats.total) : '€0.00'}</strong></li>
              <li>4. {t('zReport.step4')} ({btwPercentage}%)</li>
            </ol>
            <p className="text-blue-600 text-xs mt-4">
              ⚠️ {t('zReport.retention')}
            </p>
          </div>
        </div>

        {/* Sidebar - History */}
        <div className={`lg:block ${showHistory ? 'block' : 'hidden'} print:hidden`}>
          <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              📚 {t('zReport.savedReports')}
            </h3>
            
            {savedReports.length === 0 ? (
              <p className="text-gray-500 text-sm">{t('zReport.noSavedReports')}</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {savedReports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedDate(report.report_date)}
                    className={`w-full text-left p-3 rounded-xl transition-colors ${
                      report.report_date === selectedDate 
                        ? 'bg-blue-100 border-2 border-blue-500' 
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium flex items-center gap-1">
                        {formatShortDate(report.report_date)}
                        {report.report_hash && <span title="Geverifieerd" className="text-green-500">🔒</span>}
                      </span>
                      <span className="text-green-600 font-bold">{formatCurrency(report.total)}</span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {report.order_count} {t('zReport.orders')}
                      {report.order_ids && report.order_ids.length > 0 && (
                        <span className="ml-1 text-green-600">• {report.order_ids.length} IDs</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400">
                {t('zReport.totalSaved')}: {savedReports.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          .lg\\:col-span-2, .lg\\:col-span-2 * { visibility: visible; }
          .lg\\:col-span-2 { position: absolute; left: 0; top: 0; width: 80mm; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>

      {/* Email Modal */}
      <AnimatePresence>
        {showEmailModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowEmailModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-xl font-bold mb-2">📧 Z-Rapport versturen</h2>
              <p className="text-gray-500 text-sm mb-6">
                Verstuur het Z-Rapport van {formatShortDate(selectedDate)} per e-mail
              </p>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mailadres
                </label>
                <input
                  type="email"
                  value={emailAddress}
                  onChange={(e) => setEmailAddress(e.target.value)}
                  placeholder="email@voorbeeld.nl"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {stats && (
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Datum:</span>
                    <span className="font-medium">{formatShortDate(selectedDate)}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Transacties:</span>
                    <span className="font-medium">{stats.orderCount}</span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-gray-600">Totaal:</span>
                    <span className="font-bold text-green-600">{formatCurrency(stats.total)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEmailModal(false)}
                  className="flex-1 px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium"
                >
                  Annuleren
                </button>
                <button
                  onClick={sendEmailReport}
                  disabled={!emailAddress || sendingEmail}
                  className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium disabled:bg-gray-300 flex items-center justify-center gap-2"
                >
                  {sendingEmail ? (
                    <>
                      <span className="animate-spin">⏳</span> Verzenden...
                    </>
                  ) : (
                    <>📧 Versturen</>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
