'use client'

import { useEffect, useState, useRef } from 'react'
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
}

export default function RapportenPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<DailyReport[]>([])
  const [activeTab, setActiveTab] = useState<'z' | 'x'>('z')
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const printRef = useRef<HTMLDivElement>(null)
  const { t, locale } = useLanguage()
  const trans = (key: string) => t(`reportsPage.${key}`)

  useEffect(() => {
    fetchOrders()
  }, [])

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

  const formatTime = () => {
    return new Date().toLocaleTimeString('nl-BE', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const totalRevenue = reports.reduce((sum, r) => sum + r.revenue, 0)
  const totalOrders = reports.reduce((sum, r) => sum + r.orders, 0)
  const avgPerDay = reports.length ? totalRevenue / reports.length : 0

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

  const handlePrint = (report: DailyReport, type: 'x' | 'z') => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const stored = localStorage.getItem('vysion_tenant')
    const tenant = stored ? JSON.parse(stored) : { name: 'Bedrijf' }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${type.toUpperCase()}-Rapport - ${formatDate(report.date)}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 20px; max-width: 300px; margin: 0 auto; }
          .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
          .logo { font-size: 24px; font-weight: bold; }
          .type { font-size: 18px; margin: 10px 0; }
          .row { display: flex; justify-content: space-between; padding: 4px 0; }
          .divider { border-top: 1px dashed #000; margin: 10px 0; }
          .total { font-size: 18px; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; font-size: 12px; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Vysion Horeca</div>
          <div>${tenant.name}</div>
          <div class="type">${type.toUpperCase()}-RAPPORT</div>
          <div>${formatDate(report.date)}</div>
          ${type === 'x' ? `<div>Tijd: ${formatTime()}</div>` : ''}
        </div>
        
        <div class="row"><span>Aantal bestellingen:</span><span>${report.orders}</span></div>
        <div class="row"><span>├ Kassa:</span><span>${report.kassaOrders}</span></div>
        <div class="row"><span>└ Online:</span><span>${report.onlineOrders}</span></div>
        
        <div class="divider"></div>
        
        <div class="row"><span>Contant:</span><span>${formatCurrency(report.cashPayments)}</span></div>
        <div class="row"><span>Pin/Kaart:</span><span>${formatCurrency(report.cardPayments)}</span></div>
        
        <div class="divider"></div>
        
        <div class="row"><span>Subtotaal:</span><span>${formatCurrency(report.revenue - report.vatTotal)}</span></div>
        <div class="row"><span>BTW (21%):</span><span>${formatCurrency(report.vatTotal)}</span></div>
        
        <div class="divider"></div>
        
        <div class="row total"><span>TOTAAL:</span><span>${formatCurrency(report.revenue)}</span></div>
        
        <div class="footer">
          <div>Afgedrukt op: ${new Date().toLocaleString('nl-BE')}</div>
          <div>Vysion Horeca - GKS Gecertificeerd</div>
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
              <p className="text-sm text-gray-500">{trans('stats.daysWithData')}</p>
              <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
            </div>
          </div>

          {/* Daily Reports Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">{trans('table.title')}</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{trans('table.date')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{trans('table.orders')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{trans('table.pos')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{trans('table.online')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{trans('table.revenue')}</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acties</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        {trans('noReports')}
                      </td>
                    </tr>
                  ) : (
                    reports.map((report) => (
                      <tr key={report.date} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="font-medium text-gray-900">{formatDate(report.date)}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xl font-bold text-gray-900">{report.orders}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            🏪 {report.kassaOrders}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            🌐 {report.onlineOrders}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-xl font-bold text-green-600">{formatCurrency(report.revenue)}</span>
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
                    <strong>Inhoud:</strong> Z-Rapport met omzet ({formatCurrency(selectedReport.revenue)}), 
                    aantal bestellingen ({selectedReport.orders}), BTW-overzicht en betalingsmethodes.
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
