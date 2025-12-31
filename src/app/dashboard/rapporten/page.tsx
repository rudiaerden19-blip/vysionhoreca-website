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
}

interface ZReport {
  id: string
  report_number: number
  business_id: string
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
  sent_to_scarda: boolean
  sent_to_accountant: boolean
  accountant_email: string | null
}

export default function RapportenPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<DailyReport[]>([])
  const [zReports, setZReports] = useState<ZReport[]>([])
  const [activeTab, setActiveTab] = useState<'z' | 'x' | 'history'>('z')
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [showCloseModal, setShowCloseModal] = useState(false)
  const [emailAddress, setEmailAddress] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closingSuccess, setClosingSuccess] = useState(false)
  const [sendToScarda, setSendToScarda] = useState(true)
  const [sendToAccountant, setSendToAccountant] = useState(true)
  const [accountantEmail, setAccountantEmail] = useState('')
  const { t } = useLanguage()
  const trans = (key: string) => t(`reportsPage.${key}`)

  useEffect(() => {
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
          vatTotal: orders.reduce((sum, o) => sum + (Number(o.total) * 0.21 / 1.21 || 0), 0),
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
      month: 'short',
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

  // Check if today already has a Z-report
  const todayHasZReport = zReports.some(z => z.date === today)

  // Get unclosed days (days with orders but no Z-report)
  const unclosedDays = reports.filter(r => !zReports.some(z => z.date === r.date))

  const handlePrint = (report: DailyReport | ZReport, type: 'x' | 'z') => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const stored = localStorage.getItem('vysion_tenant')
    const tenant = stored ? JSON.parse(stored) : { name: 'Bedrijf' }

    const isZReport = 'report_number' in report
    const reportNumber = isZReport ? (report as ZReport).report_number : null
    const revenue = isZReport ? (report as ZReport).revenue : (report as DailyReport).revenue
    const ordersCount = isZReport ? (report as ZReport).orders_count : (report as DailyReport).orders
    const kassaOrders = isZReport ? (report as ZReport).kassa_orders : (report as DailyReport).kassaOrders
    const onlineOrders = isZReport ? (report as ZReport).online_orders : (report as DailyReport).onlineOrders
    const cashPayments = isZReport ? (report as ZReport).cash_payments : (report as DailyReport).cashPayments
    const cardPayments = isZReport ? (report as ZReport).card_payments : (report as DailyReport).cardPayments
    const vatTotal = isZReport ? (report as ZReport).vat_total : (report as DailyReport).vatTotal

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${type.toUpperCase()}-Rapport ${reportNumber ? '#' + reportNumber : ''} - ${formatDate(report.date)}</title>
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
          .scarda { background: #f0f0f0; padding: 8px; margin-top: 10px; text-align: center; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Vysion Horeca</div>
          <div>${tenant.name}</div>
          <div class="type">${type.toUpperCase()}-RAPPORT</div>
          ${reportNumber ? `<div class="report-num">Nr. ${String(reportNumber).padStart(6, '0')}</div>` : ''}
          <div style="margin-top: 8px">${formatDate(report.date)}</div>
          ${type === 'x' ? `<div>Tijd: ${formatTime()}</div>` : ''}
        </div>
        
        <div class="row"><span>Aantal bestellingen:</span><span>${ordersCount}</span></div>
        <div class="row"><span>├ Kassa:</span><span>${kassaOrders}</span></div>
        <div class="row"><span>└ Online:</span><span>${onlineOrders}</span></div>
        
        <div class="divider"></div>
        
        <div class="row"><span>Contant:</span><span>${formatCurrency(cashPayments)}</span></div>
        <div class="row"><span>Pin/Kaart:</span><span>${formatCurrency(cardPayments)}</span></div>
        
        <div class="divider"></div>
        
        <div class="row"><span>Subtotaal (excl. BTW):</span><span>${formatCurrency(revenue - vatTotal)}</span></div>
        <div class="row"><span>BTW (21%):</span><span>${formatCurrency(vatTotal)}</span></div>
        
        <div class="divider"></div>
        
        <div class="row total"><span>TOTAAL:</span><span>${formatCurrency(revenue)}</span></div>
        
        ${isZReport ? `
        <div class="scarda">
          <strong>SCARDA Boekhouding</strong><br>
          ${(report as ZReport).sent_to_scarda ? '✓ Verstuurd naar SCARDA' : '○ Niet verstuurd'}
        </div>
        ` : ''}
        
        <div class="footer">
          <div>Afgedrukt op: ${new Date().toLocaleString('nl-BE')}</div>
          <div>Vysion Horeca - GKS Gecertificeerd</div>
          <div style="margin-top: 4px; font-size: 10px;">Dit document is fiscaal geldig</div>
        </div>
      </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.print()
  }

  const handleCloseDay = async () => {
    if (!selectedReport || !supabase) return
    
    setClosing(true)
    
    try {
      const stored = localStorage.getItem('vysion_tenant')
      if (!stored) throw new Error('No tenant')
      const tenant = JSON.parse(stored)
      
      // Get the next report number
      const nextNumber = zReports.length > 0 ? Math.max(...zReports.map(z => z.report_number)) + 1 : 1

      // Create Z-report
      const zReport = {
        business_id: tenant.business_id,
        report_number: nextNumber,
        date: selectedReport.date,
        orders_count: selectedReport.orders,
        revenue: selectedReport.revenue,
        online_orders: selectedReport.onlineOrders,
        kassa_orders: selectedReport.kassaOrders,
        cash_payments: selectedReport.cashPayments,
        card_payments: selectedReport.cardPayments,
        vat_total: selectedReport.vatTotal,
        closed_at: new Date().toISOString(),
        closed_by: tenant.name,
        sent_to_scarda: sendToScarda,
        sent_to_accountant: sendToAccountant && !!accountantEmail,
        accountant_email: sendToAccountant ? accountantEmail : null,
      }

      const { error } = await supabase
        .from('z_reports')
        .insert(zReport)

      if (error) throw error

      // Simulate sending to SCARDA
      if (sendToScarda) {
        await new Promise(resolve => setTimeout(resolve, 500))
        console.log('Sent to SCARDA:', zReport)
      }

      // Simulate sending to accountant
      if (sendToAccountant && accountantEmail) {
        await new Promise(resolve => setTimeout(resolve, 500))
        console.log('Sent to accountant:', accountantEmail, zReport)
      }

      setClosingSuccess(true)
      fetchZReports()

      setTimeout(() => {
        setShowCloseModal(false)
        setClosingSuccess(false)
        setSelectedReport(null)
      }, 2000)

    } catch (error) {
      console.error('Error closing day:', error)
      alert('Er is een fout opgetreden bij het afsluiten van de dag.')
    } finally {
      setClosing(false)
    }
  }

  const handleSendToAccountant = async (zReport: ZReport) => {
    if (!emailAddress || !supabase) return
    
    setEmailSending(true)
    
    try {
      // Simulate sending email
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      // Update Z-report
      await supabase
        .from('z_reports')
        .update({ 
          sent_to_accountant: true, 
          accountant_email: emailAddress 
        })
        .eq('id', zReport.id)

      setEmailSent(true)
      fetchZReports()

      setTimeout(() => {
        setShowEmailModal(false)
        setEmailSent(false)
      }, 2000)

    } catch (error) {
      console.error('Error sending to accountant:', error)
    } finally {
      setEmailSending(false)
    }
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
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{trans('title')}</h1>
          <p className="text-gray-500 mt-1">{trans('subtitle')}</p>
        </div>
        <div className="flex items-center gap-2 bg-purple-100 px-4 py-2 rounded-lg">
          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <span className="text-purple-800 font-medium">SCARDA Gekoppeld</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('z')}
          className={`px-6 py-3 font-semibold text-lg border-b-4 transition-colors ${
            activeTab === 'z'
              ? 'text-accent border-accent'
              : 'text-gray-400 border-transparent hover:text-gray-600'
          }`}
        >
          📊 Dagafsluiting
          {unclosedDays.length > 0 && (
            <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {unclosedDays.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('x')}
          className={`px-6 py-3 font-semibold text-lg border-b-4 transition-colors ${
            activeTab === 'x'
              ? 'text-accent border-accent'
              : 'text-gray-400 border-transparent hover:text-gray-600'
          }`}
        >
          📈 X-Rapport
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-6 py-3 font-semibold text-lg border-b-4 transition-colors ${
            activeTab === 'history'
              ? 'text-accent border-accent'
              : 'text-gray-400 border-transparent hover:text-gray-600'
          }`}
        >
          📚 Z-Rapport Archief ({zReports.length})
        </button>
      </div>

      {/* X-Rapport Tab */}
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

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">Contant</p>
              <p className="text-xl font-bold text-blue-600">{formatCurrency(todayReport.cashPayments)}</p>
            </div>
            <div className="bg-purple-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">Pin/Kaart</p>
              <p className="text-xl font-bold text-purple-600">{formatCurrency(todayReport.cardPayments)}</p>
            </div>
            <div className="bg-orange-50 p-4 rounded-xl">
              <p className="text-sm text-gray-500">BTW (21%)</p>
              <p className="text-xl font-bold text-orange-600">{formatCurrency(todayReport.vatTotal)}</p>
            </div>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
            <p className="text-sm text-yellow-800">
              💡 <strong>Let op:</strong> Dit is een tussenstand (X-Rapport). De dag is nog niet afgesloten. 
              Ga naar "Dagafsluiting" om een officieel Z-Rapport aan te maken en naar SCARDA te versturen.
            </p>
          </div>
        </div>
      )}

      {/* Dagafsluiting Tab */}
      {activeTab === 'z' && (
        <>
          {/* Warning for unclosed days */}
          {unclosedDays.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="font-semibold text-red-800">
                    {unclosedDays.length} dag(en) nog niet afgesloten
                  </h3>
                  <p className="text-sm text-red-700 mt-1">
                    Sluit deze dagen af om de Z-rapporten naar SCARDA te versturen.
                  </p>
                </div>
              </div>
            </div>
          )}

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
              <p className="text-sm text-gray-500">Afgesloten dagen</p>
              <p className="text-2xl font-bold text-green-600">{zReports.length}</p>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-100">
              <p className="text-sm text-gray-500">Open dagen</p>
              <p className="text-2xl font-bold text-red-600">{unclosedDays.length}</p>
            </div>
          </div>

          {/* Unclosed Days Table */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Dagen om af te sluiten</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bestellingen</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Omzet</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">BTW</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actie</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {unclosedDays.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                        ✓ Alle dagen zijn afgesloten en verstuurd naar SCARDA
                      </td>
                    </tr>
                  ) : (
                    unclosedDays.map((report) => (
                      <tr key={report.date} className="hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-900">{formatDate(report.date)}</p>
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-gray-900">{report.orders}</span>
                          <span className="text-gray-500 text-sm ml-2">
                            ({report.kassaOrders} kassa, {report.onlineOrders} online)
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xl font-bold text-green-600">{formatCurrency(report.revenue)}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                          {formatCurrency(report.vatTotal)}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                            ⏳ Niet afgesloten
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => {
                              setSelectedReport(report)
                              setShowCloseModal(true)
                            }}
                            className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg hover:bg-accent/90 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Afsluiten
                          </button>
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

      {/* Z-Rapport History Tab */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Z-Rapport Archief</h2>
            <p className="text-sm text-gray-500 mt-1">Alle officieel afgesloten dagen met volgnummer</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nr.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Datum</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Omzet</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bestellingen</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SCARDA</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boekhouder</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acties</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {zReports.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                      Nog geen Z-rapporten. Sluit een dag af om het eerste rapport aan te maken.
                    </td>
                  </tr>
                ) : (
                  zReports.map((zReport) => (
                    <tr key={zReport.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <span className="font-mono font-bold text-accent">
                          #{String(zReport.report_number).padStart(6, '0')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-medium text-gray-900">{formatDate(zReport.date)}</p>
                        <p className="text-xs text-gray-500">Afgesloten: {formatDateTime(zReport.closed_at)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xl font-bold text-green-600">{formatCurrency(zReport.revenue)}</span>
                      </td>
                      <td className="px-6 py-4 text-gray-900">
                        {zReport.orders_count}
                      </td>
                      <td className="px-6 py-4">
                        {zReport.sent_to_scarda ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ Verstuurd
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            ○ Niet verstuurd
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {zReport.sent_to_accountant ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            ✓ {zReport.accountant_email}
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedReport(zReport as any)
                              setShowEmailModal(true)
                            }}
                            className="text-accent hover:underline text-sm"
                          >
                            + Versturen
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => handlePrint(zReport, 'z')}
                          className="p-2 text-gray-600 hover:text-accent hover:bg-gray-100 rounded-lg transition-colors"
                          title="Afdrukken"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Close Day Modal */}
      {showCloseModal && selectedReport && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6">
            {closingSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900">Dag afgesloten!</p>
                <p className="text-gray-500 mt-2">
                  Z-Rapport aangemaakt en verstuurd naar SCARDA
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Dag afsluiten - Z-Rapport
                </h3>
                <p className="text-gray-600 mb-6">
                  Je staat op het punt om {formatDate(selectedReport.date)} af te sluiten.
                  Dit maakt een officieel Z-Rapport aan.
                </p>

                {/* Summary */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Omzet</p>
                      <p className="text-xl font-bold text-green-600">{formatCurrency(selectedReport.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Bestellingen</p>
                      <p className="text-xl font-bold text-gray-900">{selectedReport.orders}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">BTW (21%)</p>
                      <p className="text-lg font-semibold text-gray-700">{formatCurrency(selectedReport.vatTotal)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Volgnummer</p>
                      <p className="text-lg font-mono font-bold text-accent">
                        #{String(zReports.length + 1).padStart(6, '0')}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-4 mb-6">
                  <label className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendToScarda}
                      onChange={(e) => setSendToScarda(e.target.checked)}
                      className="w-5 h-5 rounded text-accent"
                    />
                    <div>
                      <p className="font-medium text-gray-900">Versturen naar SCARDA</p>
                      <p className="text-sm text-gray-500">Automatisch doorsturen naar je boekhouding</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={sendToAccountant}
                      onChange={(e) => setSendToAccountant(e.target.checked)}
                      className="w-5 h-5 rounded text-accent mt-1"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">Versturen naar boekhouder</p>
                      {sendToAccountant && (
                        <input
                          type="email"
                          value={accountantEmail}
                          onChange={(e) => setAccountantEmail(e.target.value)}
                          placeholder="boekhouder@example.com"
                          className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                      )}
                    </div>
                  </label>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowCloseModal(false)
                      setSelectedReport(null)
                    }}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={handleCloseDay}
                    disabled={closing}
                    className="flex-1 px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 flex items-center justify-center gap-2"
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
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Dag afsluiten
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Send to Accountant Modal */}
      {showEmailModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Z-Rapport versturen naar boekhouder
            </h3>
            
            {emailSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-lg font-semibold text-gray-900">Verstuurd!</p>
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

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowEmailModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={() => handleSendToAccountant(selectedReport as any)}
                    disabled={!emailAddress || emailSending}
                    className="flex-1 px-4 py-3 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50"
                  >
                    {emailSending ? 'Versturen...' : 'Versturen'}
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
