'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getTenantSettings } from '@/lib/admin-api'
import { useLanguage } from '@/i18n'

interface DailyStats {
  date: string
  orderCount: number
  subtotal: number
  taxLow: number      // BTW 6%
  taxMid: number      // BTW 12%
  taxHigh: number     // BTW 21%
  total: number
  cashPayments: number
  onlinePayments: number
  cardPayments: number
}

export default function ZRapportPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
  const [stats, setStats] = useState<DailyStats | null>(null)
  const [businessInfo, setBusinessInfo] = useState<any>(null)
  const [btwPercentage, setBtwPercentage] = useState(6)

  useEffect(() => {
    loadData()
  }, [params.tenant, selectedDate])

  const loadData = async () => {
    setLoading(true)
    
    // Load business info
    const settings = await getTenantSettings(params.tenant)
    if (settings) {
      setBusinessInfo(settings)
      setBtwPercentage(settings.btw_percentage || 6)
    }

    // Load orders for selected date
    const startOfDay = `${selectedDate}T00:00:00`
    const endOfDay = `${selectedDate}T23:59:59`

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay)
      .in('status', ['completed', 'ready', 'preparing', 'confirmed'])

    if (!error && orders) {
      // Calculate stats
      let subtotal = 0
      let total = 0
      let cashPayments = 0
      let onlinePayments = 0
      let cardPayments = 0

      orders.forEach(order => {
        const orderTotal = order.total_amount || 0
        total += orderTotal
        
        // Payment method
        const paymentMethod = (order.payment_method || '').toLowerCase()
        if (paymentMethod === 'cash' || paymentMethod === 'contant') {
          cashPayments += orderTotal
        } else if (paymentMethod === 'card' || paymentMethod === 'pin' || paymentMethod === 'kaart') {
          cardPayments += orderTotal
        } else {
          onlinePayments += orderTotal
        }
      })

      // Calculate BTW (simplified - using single rate)
      const taxRate = btwPercentage / 100
      subtotal = total / (1 + taxRate)
      const tax = total - subtotal

      setStats({
        date: selectedDate,
        orderCount: orders.length,
        subtotal: subtotal,
        taxLow: btwPercentage === 6 ? tax : 0,
        taxMid: btwPercentage === 12 ? tax : 0,
        taxHigh: btwPercentage === 21 ? tax : 0,
        total: total,
        cashPayments,
        onlinePayments,
        cardPayments,
      })
    }

    setLoading(false)
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

  const formatCurrency = (amount: number) => {
    return `€${amount.toFixed(2)}`
  }

  const printZRapport = () => {
    window.print()
  }

  const goToPreviousDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() - 1)
    setSelectedDate(date.toISOString().split('T')[0])
  }

  const goToNextDay = () => {
    const date = new Date(selectedDate)
    date.setDate(date.getDate() + 1)
    const today = new Date().toISOString().split('T')[0]
    if (date.toISOString().split('T')[0] <= today) {
      setSelectedDate(date.toISOString().split('T')[0])
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">{t('adminPages.common.loading')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📊 Z-Rapport Online Verkopen</h1>
          <p className="text-gray-500">Dagelijks overzicht voor witte kassa</p>
        </div>
        <button
          onClick={printZRapport}
          className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-medium flex items-center gap-2"
        >
          🖨️ Afdrukken
        </button>
      </div>

      {/* Date Selector */}
      <div className="flex items-center justify-center gap-4 mb-8 print:hidden">
        <button
          onClick={goToPreviousDay}
          className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl"
        >
          ←
        </button>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          max={new Date().toISOString().split('T')[0]}
          className="px-4 py-3 border border-gray-200 rounded-xl text-center font-medium"
        />
        <button
          onClick={goToNextDay}
          disabled={selectedDate === new Date().toISOString().split('T')[0]}
          className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl disabled:opacity-50"
        >
          →
        </button>
      </div>

      {/* Z-Rapport */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-lg overflow-hidden print:shadow-none print:rounded-none"
      >
        {/* Header */}
        <div className="bg-gray-900 text-white p-6 text-center">
          <h2 className="text-xl font-bold mb-1">{businessInfo?.business_name || 'Zaak'}</h2>
          <p className="text-gray-400 text-sm">{businessInfo?.address}</p>
          {businessInfo?.btw_number && (
            <p className="text-gray-400 text-sm">BTW: {businessInfo.btw_number}</p>
          )}
        </div>

        {/* Title */}
        <div className="border-b-2 border-dashed border-gray-300 p-6 text-center">
          <h3 className="text-2xl font-bold text-gray-900">Z-RAPPORT</h3>
          <p className="text-lg text-gray-600">ONLINE VERKOPEN</p>
          <p className="text-gray-500 mt-2">{formatDate(selectedDate)}</p>
        </div>

        {/* Stats */}
        {stats && (
          <div className="p-6 space-y-4">
            {/* Order Count */}
            <div className="flex justify-between items-center py-2 border-b border-gray-100">
              <span className="text-gray-600">Aantal bestellingen</span>
              <span className="font-bold text-lg">{stats.orderCount}</span>
            </div>

            {/* Separator */}
            <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

            {/* Subtotal */}
            <div className="flex justify-between items-center py-2">
              <span className="text-gray-600">Subtotaal (excl. BTW)</span>
              <span className="font-medium">{formatCurrency(stats.subtotal)}</span>
            </div>

            {/* BTW */}
            {stats.taxLow > 0 && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">BTW 6%</span>
                <span className="font-medium">{formatCurrency(stats.taxLow)}</span>
              </div>
            )}
            {stats.taxMid > 0 && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">BTW 12%</span>
                <span className="font-medium">{formatCurrency(stats.taxMid)}</span>
              </div>
            )}
            {stats.taxHigh > 0 && (
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-600">BTW 21%</span>
                <span className="font-medium">{formatCurrency(stats.taxHigh)}</span>
              </div>
            )}

            {/* Separator */}
            <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

            {/* Total */}
            <div className="flex justify-between items-center py-4 bg-gray-100 -mx-6 px-6">
              <span className="text-xl font-bold text-gray-900">TOTAAL</span>
              <span className="text-2xl font-bold text-green-600">{formatCurrency(stats.total)}</span>
            </div>

            {/* Separator */}
            <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

            {/* Payment Methods */}
            <div className="space-y-2">
              <h4 className="font-semibold text-gray-900 mb-3">Betaalmethodes</h4>
              
              {stats.onlinePayments > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">💳 Online betaald</span>
                  <span className="font-medium">{formatCurrency(stats.onlinePayments)}</span>
                </div>
              )}
              {stats.cardPayments > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">💳 Kaart/PIN</span>
                  <span className="font-medium">{formatCurrency(stats.cardPayments)}</span>
                </div>
              )}
              {stats.cashPayments > 0 && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-gray-600">💵 Contant</span>
                  <span className="font-medium">{formatCurrency(stats.cashPayments)}</span>
                </div>
              )}
            </div>

            {/* Separator */}
            <div className="border-t-2 border-dashed border-gray-300 my-4"></div>

            {/* Footer */}
            <div className="text-center text-gray-500 text-sm pt-4">
              <p>Gegenereerd op {new Date().toLocaleString('nl-BE')}</p>
              <p className="mt-1">Vysion Horeca - ordervysion.com</p>
            </div>
          </div>
        )}

        {/* No orders */}
        {stats && stats.orderCount === 0 && (
          <div className="p-12 text-center">
            <span className="text-6xl mb-4 block">📭</span>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Geen bestellingen</h3>
            <p className="text-gray-500">Er zijn geen online bestellingen op deze dag.</p>
          </div>
        )}
      </motion.div>

      {/* Instructions */}
      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-2xl print:hidden">
        <h3 className="font-semibold text-blue-900 mb-3">💡 Hoe invoeren in witte kassa?</h3>
        <ol className="text-blue-800 space-y-2 text-sm">
          <li>1. Print dit Z-rapport af of noteer het totaalbedrag</li>
          <li>2. Open je witte kassa en maak een nieuwe verkoop aan</li>
          <li>3. Voer in: "Online verkopen" met bedrag <strong>{stats ? formatCurrency(stats.total) : '€0.00'}</strong></li>
          <li>4. Selecteer de juiste BTW-categorie ({btwPercentage}%)</li>
          <li>5. Sluit de verkoop af met betaalmethode "Online"</li>
        </ol>
        <p className="text-blue-600 text-xs mt-4">
          Tip: Doe dit elke dag aan het einde van de dienst voor een correcte administratie.
        </p>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .max-w-2xl, .max-w-2xl * {
            visibility: visible;
          }
          .max-w-2xl {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
