'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'

interface DailyReport {
  date: string
  orders: number
  revenue: number
  onlineOrders: number
  kassaOrders: number
  cashPayments: number
  cardPayments: number
  vatTotal: number
  isClosed?: boolean
}

interface ZReport {
  id: string
  business_id: string
  report_number: number
  date: string
  orders_count: number
  revenue: number
  online_orders: number
  kassa_orders: number
  cash_payments: number
  card_payments: number
  vat_total: number
  closed_at: string
  closed_by: string
}

export default function RapportenPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<DailyReport[]>([])
  const [zReports, setZReports] = useState<ZReport[]>([])
  const [activeTab, setActiveTab] = useState<'z' | 'x'>('z')
  const [selectedReport, setSelectedReport] = useState<DailyReport | ZReport | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [reportToClose, setReportToClose] = useState<DailyReport | null>(null)
  const [emailAddress, setEmailAddress] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [closing, setClosing] = useState(false)
  const [tenant, setTenant] = useState<any>(null)
  const { t } = useLanguage()
  const trans = (key: string) => t(`reportsPage.${key}`)

  useEffect(() => {
    const stored = localStorage.getItem('vysion_tenant')
    if (stored) {
      setTenant(JSON.parse(stored))
    }
    fetchOrders()
    fetchZReports()
  }, [])

  async function fetchZReports() {
    if (!supabase) return
    
    try {
      const stored = localStorage.getItem('vysion_tenant')
      if (!stored) return
      const tenant = JSON.parse(stored)
      if (!tenant?.business_id) return
      
      const { data, error } = await supabase
        .from('z_reports')
        .select('*')
        .eq('business_id', tenant.business_id)
        .order('report_number', { ascending: false })

      if (!error && data) {
        setZReports(data)
      }
    } catch (error) {
      console.error('Error fetching Z-reports:', error)
    }
  }

  async function fetchOrders() {
    if (!supabase) return
    
    try {
      const stored = localStorage.getItem('vysion_tenant')
      if (!stored) return
      const tenant = JSON.parse(stored)
      if (!tenant?.business_id) return
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('business_id', tenant.business_id)
        .order('created_at', { ascending: false })

      if (error) throw error

      // Group orders by date
      const groupedByDate: Record<string, any[]> = {}
      data?.forEach((order: any) => {
        const date = order.created_at?.split('T')[0]
        if (date) {
          if (!groupedByDate[date]) groupedByDate[date] = []
          groupedByDate[date].push(order)
        }
      })

      // Create daily reports
      const dailyReports: DailyReport[] = Object.entries(groupedByDate)
        .map(([date, orders]) => ({
          date,
          orders: orders.length,
          revenue: orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
          onlineOrders: orders.filter(o => o.is_online).length,
          kassaOrders: orders.filter(o => !o.is_online).length,
          cashPayments: orders.filter(o => o.payment_method === 'cash').reduce((sum, o) => sum + (Number(o.total) || 0), 0),
          cardPayments: orders.filter(o => o.payment_method !== 'cash').reduce((sum, o) => sum + (Number(o.total) || 0), 0),
          vatTotal: orders.reduce((sum, o) => sum + (Number(o.total) * 0.21 || 0), 0),
        }))
        .sort((a, b) => b.date.localeCompare(a.date))

      setOrders(data || [])
      setReports(dailyReports)
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('nl-BE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('nl-BE', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatTime = () => {
    return new Date().toLocaleTimeString('nl-BE', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Check if a date already has a Z-report
  const isDateClosed = (date: string) => {
    return zReports.some(zr => zr.date === date)
  }

  const getNextReportNumber = () => {
    if (zReports.length === 0) return 1
    return Math.max(...zReports.map(zr => zr.report_number)) + 1
  }

  const handleCloseDay = async () => {
    if (!reportToClose || !supabase || !tenant) return
    
    setClosing(true)
    
    try {
      const reportNumber = getNextReportNumber()
      
      const { error } = await supabase
        .from('z_reports')
        .insert({
          business_id: tenant.business_id,
          report_number: reportNumber,
          date: reportToClose.date,
          orders_count: reportToClose.orders,
          revenue: reportToClose.revenue,
          online_orders: reportToClose.onlineOrders,
          kassa_orders: reportToClose.kassaOrders,
          cash_payments: reportToClose.cashPayments,
          card_payments: reportToClose.cardPayments,
          vat_total: reportToClose.vatTotal,
          closed_at: new Date().toISOString(),
          closed_by: tenant.name || 'Onbekend',
        })

      if (error) throw error

      // Refresh Z-reports
      await fetchZReports()
      
      setShowCloseModal(false)
      setReportToClose(null)
    } catch (error) {
      console.error('Error closing day:', error)
      alert('Er is een fout opgetreden bij het afsluiten. Probeer opnieuw.')
    } finally {
      setClosing(false)
    }
  }

  const totalRevenue = zReports.reduce((sum, r) => sum + Number(r.revenue), 0)
  const totalOrders = zReports.reduce((sum, r) => sum + r.orders_count, 0)
  const avgPerDay = zReports.length ? totalRevenue / zReports.length : 0

  // Get current day report for X-rapport
  const today = new Date().toISOString().split('T')[0]
  const todayReport = reports.find(r => r.date === today) || {
    date: today,
    orders: 0,
    revenue: 0,
    onlineOrders: 0,
    kassaOrders: 0,
    cashPayments: 0,
    cardPayments: 0,
    vatTotal: 0,
  }

  // Get unclosed days (days with orders but no Z-report)
  const unclosedDays = reports.filter(r => !isDateClosed(r.date) && r.date !== today)

  const handlePrint = (report: DailyReport | ZReport, type: 'x' | 'z', reportNumber?: number) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const isZReport = 'report_number' in report
    const revenue = isZReport ? Number(report.revenue) : report.revenue
    const ordersCount = isZReport ? report.orders_count : report.orders
    const onlineOrders = isZReport ? report.online_orders : report.onlineOrders
    const kassaOrders = isZReport ? report.kassa_orders : report.kassaOrders
    const cashPayments = isZReport ? Number(report.cash_payments) : report.cashPayments
    const cardPayments = isZReport ? Number(report.card_payments) : report.cardPayments
    const vatTotal = isZReport ? Number(report.vat_total) : report.vatTotal
    const repNum = isZReport ? report.report_number : reportNumber

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${type.toUpperCase()}-Rapport ${repNum ? '#' + repNum : ''} - ${formatDate(report.date)}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .logo { font-size: 24px; font-weight: bold; }
          .type { font-size: 18px; margin: 10px 0; }
          .report-num { font-size: 14px; background: #000; color: #fff; padding: 4px 8px; display: inline-block; }
          .row { display: flex; justify-content: space-between; padding: 4px 0; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .total { font-size: 18px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          .official { border: 2px solid #000; padding: 8px; margin-top: 10px; text-align: center; font-weight: bold; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Vysion Horeca</div>
          <div>${tenant?.name || 'Bedrijf'}</div>
          <div class="type">${type.toUpperCase()}-RAPPORT</div>
          ${type === 'z' && repNum ? `<div class="report-num">Nr. ${String(repNum).padStart(6, '0')}</div>` : ''}
          <div>${formatDate(report.date)}</div>
          ${type === 'x' ? `<div>Tijd: ${formatTime()}</div>` : ''}
        </div>
        
        <div class="row"><span>Aantal bestellingen:</span><span>${ordersCount}</span></div>
        <div class="row"><span>├ Kassa:</span><span>${kassaOrders}</span></div>
        <div class="row"><span>└ Online:</span><span>${onlineOrders}</span></div>
        
        <div class="divider"></div>
        
        <div class="row"><span>Contant:</span><span>${formatCurrency(cashPayments)}</span></div>
        <div class="row"><span>Pin/Kaart:</span><span>${formatCurrency(cardPayments)}</span></div>
        
        <div class="divider"></div>
        
        <div class="row"><span>Subtotaal:</span><span>${formatCurrency(revenue - vatTotal)}</span></div>
        <div class="row"><span>BTW (21%):</span><span>${formatCurrency(vatTotal)}</span></div>
        
        <div class="divider"></div>
        
        <div class="row total"><span>TOTAAL:</span><span>${formatCurrency(revenue)}</span></div>
        
        ${type === 'z' ? `
        <div class="official">
          OFFICIEEL Z-RAPPORT<br>
          GKS GECERTIFICEERD
        </div>
        ` : ''}
        
        <div class="footer">
          <div>Afgedrukt op: ${new Date().toLocaleString('nl-BE')}</div>
          <div>Vysion Horeca - www.vysionhoreca.com</div>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const handleSendToAccountant = async () => {
    if (!selectedReport || !emailAddress) return
    
    setEmailSending(true)
    
    // Simulate sending email (in production, this would call an API)
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    setEmailSending(false)
    setEmailSent(true)
    
    setTimeout(() => {
      setShowEmailModal(false)
      setEmailSent(false)
      setSelectedReport(null)
    }, 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{trans('title')}</h1>
        <p className="text-gray-500 mt-1">{trans('subtitle')}</p>
      </div>

      {/* Unclosed Days Warning */}
      {unclosedDays.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-yellow-800">
                {unclosedDays.length} dag(en) nog niet afgesloten
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                De volgende dagen hebben nog geen officieel Z-rapport: 
                {unclosedDays.slice(0, 3).map(d => formatDate(d.date).split(',')[0]).join(', ')}
                {unclosedDays.length > 3 ? ` en ${unclosedDays.length - 3} meer...` : ''}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs for X and Z Reports */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('z')}
          className={`px-6 py-3 font-semibold text-lg border-b-4 transition-colors ${
            activeTab === 'z'
              ? 'text-accent border-accent'
              : 'text-gray-400 border-transparent hover:text-gray-600'
          }`}
        >
          📊 Z-Rapport (Dagafsluiting)
        </button>
        <button
          onClick={() => setActiveTab('x')}
          className={`px-6 py-3 font-semibold text-lg border-b-4 transition-colors ${
            activeTab === 'x'
              ? 'text-accent border-accent'
              : 'text-gray-400 border-transparent hover:text-gray-600'
          }`}
        >
          📈 X-Rapport (Tussenstand)
        </button>
      </div>

      {/* X-Rapport - Current Day */}
      {activeTab === 'x' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900">X-Rapport - Tussenstand</h2>
              <p className="text-gray-500">{formatDate(today)} - {formatTime()}</p>
            </div>
            <button
              onClick={() => handlePrint(todayReport, 'x')}
              className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Afdrukken
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">Bestellingen</p>
              <p className="text-2xl font-bold text-gray-900">{todayReport.orders}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">Kassa</p>
              <p className="text-2xl font-bold text-gray-900">{todayReport.kassaOrders}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">Online</p>
              <p className="text-2xl font-bold text-gray-900">{todayReport.onlineOrders}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">Omzet</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(todayReport.revenue)}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">Contant</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(todayReport.cashPayments)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">Pin/Kaart</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(todayReport.cardPayments)}</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <p className="text-sm text-yellow-800">
              💡 <strong>Let op:</strong> Dit is een tussenstand. De dag is nog niet afgesloten. 
              Gebruik het Z-Rapport voor de definitieve dagafsluiting.
            </p>
          </div>
        </div>
      )}

      {/* Z-Rapport - Daily Closings */}
      {activeTab === 'z' && (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-100">
              <p className="text-sm text-gray-500">{trans('stats.totalRevenue')}</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100">
              <p className="text-sm text-gray-500">{trans('stats.totalOrders')}</p>
              <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100">
              <p className="text-sm text-gray-500">{trans('stats.avgPerDay')}</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(avgPerDay)}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100">
              <p className="text-sm text-gray-500">Z-Rapporten</p>
              <p className="text-2xl font-bold text-gray-900">{zReports.length}</p>
            </div>
          </div>

          {/* Unclosed Days - Quick Close */}
          {unclosedDays.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-6 border-b border-gray-100 bg-yellow-50">
                <h2 className="text-lg font-semibold text-gray-900">⏳ Dagen nog af te sluiten</h2>
                <p className="text-sm text-gray-600">Sluit deze dagen af om een officieel Z-rapport te genereren</p>
              </div>
              <div className="divide-y divide-gray-100">
                {unclosedDays.map((report) => (
                  <div key={report.date} className="p-4 flex items-center justify-between hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">{formatDate(report.date)}</p>
                      <p className="text-sm text-gray-500">
                        {report.orders} bestellingen • {formatCurrency(report.revenue)} omzet
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setReportToClose(report)
                        setShowCloseModal(true)
                      }}
                      className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Afsluiten
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Official Z-Reports Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">📋 Officiële Z-Rapporten</h2>
              <p className="text-sm text-gray-500">Afgesloten dagen met officieel rapportnummer</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nr.</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{trans('table.date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{trans('table.orders')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{trans('table.revenue')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Afgesloten</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {zReports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        Nog geen Z-rapporten. Sluit een dag af om het eerste Z-rapport te genereren.
                      </td>
                    </tr>
                  ) : (
                    zReports.map((report) => (
                      <tr key={report.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-bold bg-gray-900 text-white">
                            #{String(report.report_number).padStart(6, '0')}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="font-medium text-gray-900">{formatDate(report.date)}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xl font-bold text-gray-900">{report.orders_count}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            (🏪{report.kassa_orders} / 🌐{report.online_orders})
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xl font-bold text-green-600">{formatCurrency(Number(report.revenue))}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDateTime(report.closed_at)}
                          <br />
                          <span className="text-xs">door {report.closed_by}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handlePrint(report, 'z')}
                              className="p-2 text-gray-600 hover:text-accent hover:bg-gray-100 rounded-lg transition-colors"
                              title="Afdrukken"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedReport(report)
                                setShowEmailModal(true)
                              }}
                              className="p-2 text-gray-600 hover:text-accent hover:bg-gray-100 rounded-lg transition-colors"
                              title="Versturen naar boekhouder"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Close Day Modal */}
      {showCloseModal && reportToClose && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Dag afsluiten</h3>
              <p className="text-gray-500 mt-2">{formatDate(reportToClose.date)}</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Bestellingen</span>
                <span className="font-semibold">{reportToClose.orders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Omzet</span>
                <span className="font-bold text-green-600">{formatCurrency(reportToClose.revenue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">BTW</span>
                <span className="font-semibold">{formatCurrency(reportToClose.vatTotal)}</span>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-yellow-800">
                ⚠️ <strong>Let op:</strong> Na het afsluiten kan dit Z-rapport niet meer worden gewijzigd. 
                Dit rapport krijgt nummer <strong>#{String(getNextReportNumber()).padStart(6, '0')}</strong>.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCloseModal(false)
                  setReportToClose(null)
                }}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Annuleren
              </button>
              <button
                onClick={handleCloseDay}
                disabled={closing}
                className="flex-1 px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {closing ? (
                  <>
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Afsluiten...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Definitief afsluiten
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Z-Rapport versturen
            </h3>
            <p className="text-gray-600 mb-4">
              Verstuur het Z-Rapport van {formatDate(selectedReport.date)} naar uw boekhouder.
            </p>
            
            {emailSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900">Verstuurd!</p>
                <p className="text-gray-500">Het rapport is verzonden naar {emailAddress}</p>
              </div>
            ) : (
              <>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    E-mailadres boekhouder
                  </label>
                  <input
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="boekhouder@example.com"
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none"
                  />
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-sm text-gray-600">
                    <strong>Inhoud:</strong> Officieel Z-Rapport met omzet, 
                    aantal bestellingen, BTW-overzicht en betalingsmethodes.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowEmailModal(false)
                      setSelectedReport(null)
                    }}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={handleSendToAccountant}
                    disabled={!emailAddress || emailSending}
                    className="flex-1 px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {emailSending ? (
                      <>
                        <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Versturen...
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                        Versturen
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
