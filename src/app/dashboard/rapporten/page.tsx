'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

interface DailyReport {
  date: string
  orders: number
  revenue: number
  onlineOrders: number
  kassaOrders: number
}

export default function RapportenPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [reports, setReports] = useState<DailyReport[]>([])

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Group orders by date
      const groupedByDate: Record<string, any[]> = {}
      data?.forEach(order => {
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

  const totalRevenue = reports.reduce((sum, r) => sum + r.revenue, 0)
  const totalOrders = reports.reduce((sum, r) => sum + r.orders, 0)
  const avgPerDay = reports.length ? totalRevenue / reports.length : 0

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
        <h1 className="text-2xl font-bold text-gray-900">Rapporten</h1>
        <p className="text-gray-500 mt-1">Dagelijkse omzet en bestellingsrapporten</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Totale omzet</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalRevenue)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Totale bestellingen</p>
          <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Gem. per dag</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(avgPerDay)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-gray-100">
          <p className="text-sm text-gray-500">Dagen met data</p>
          <p className="text-2xl font-bold text-gray-900">{reports.length}</p>
        </div>
      </div>

      {/* Daily Reports */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Dagelijkse rapporten (Z-Rapport)</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Datum</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bestellingen</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kassa</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Online</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Omzet</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gem. per bestelling</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    Geen rapporten beschikbaar
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
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {formatCurrency(report.orders ? report.revenue / report.orders : 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
