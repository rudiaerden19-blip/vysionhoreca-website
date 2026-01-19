'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getTenantSettings, updateOrderStatus } from '@/lib/admin-api'
import Link from 'next/link'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  delivery_address?: string
  order_type: 'pickup' | 'delivery'
  status: string
  total: number
  subtotal?: number
  delivery_fee?: number
  discount_amount?: number
  payment_status: string
  payment_method?: string
  items: any[]
  customer_notes?: string
  created_at: string
  rejection_reason?: string
  rejection_notes?: string
}

interface BusinessSettings {
  business_name: string
  primary_color: string
  address?: string
  phone?: string
}

const REJECTION_REASONS = [
  { id: 'busy', label: 'Te druk', icon: '🔥' },
  { id: 'closed', label: 'Gesloten', icon: '🚫' },
  { id: 'no_stock', label: 'Niet op voorraad', icon: '📦' },
  { id: 'technical', label: 'Technisch probleem', icon: '⚠️' },
  { id: 'address', label: 'Adres niet bezorgbaar', icon: '📍' },
  { id: 'other', label: 'Andere reden', icon: '💬' },
]

export default function ShopDisplayPage({ params }: { params: { tenant: string } }) {
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNotes, setRejectNotes] = useState('')
  const [business, setBusiness] = useState<BusinessSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')
  const audioContextRef = useRef<AudioContext | null>(null)
  const alertIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Load initial data
  useEffect(() => {
    loadData()
    const savedSound = localStorage.getItem(`shop_display_sound_${params.tenant}`)
    if (savedSound === 'true') {
      setSoundEnabled(true)
      initAudio()
    }
  }, [params.tenant])

  // Continuous alert for new orders
  useEffect(() => {
    if (newOrderIds.size > 0 && soundEnabled) {
      alertIntervalRef.current = setInterval(() => {
        playAlertSound()
      }, 3000)
    } else {
      if (alertIntervalRef.current) {
        clearInterval(alertIntervalRef.current)
        alertIntervalRef.current = null
      }
    }

    return () => {
      if (alertIntervalRef.current) {
        clearInterval(alertIntervalRef.current)
      }
    }
  }, [newOrderIds.size, soundEnabled])

  // Polling fallback - check for new orders every 5 seconds
  // (Realtime often fails, this is more reliable)
  const knownOrderIdsRef = useRef<Set<string>>(new Set())
  
  useEffect(() => {
    if (!supabase) return

    const pollOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_slug', params.tenant)
        .order('created_at', { ascending: false })
        .limit(100)

      if (data) {
        const parsed = data.map(order => ({
          ...order,
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items || []
        }))
        
        // Check for NEW orders that we haven't seen before
        const currentIds = new Set(parsed.map(o => o.id))
        const newOrders = parsed.filter(o => 
          !knownOrderIdsRef.current.has(o.id) && 
          o.status.toLowerCase() === 'new'
        )
        
        // Update known IDs
        knownOrderIdsRef.current = currentIds
        
        // If there are new orders, alert!
        if (newOrders.length > 0 && knownOrderIdsRef.current.size > 0) {
          newOrders.forEach(order => {
            setNewOrderIds(prev => new Set([...prev, order.id]))
          })
          if (soundEnabled) playAlertSound()
        }
        
        setOrders(parsed)
      }
    }

    // Initial load of known IDs
    orders.forEach(o => knownOrderIdsRef.current.add(o.id))

    // Poll every 5 seconds
    const pollInterval = setInterval(pollOrders, 5000)

    return () => {
      clearInterval(pollInterval)
    }
  }, [params.tenant, soundEnabled, orders.length])

  async function loadData() {
    const settings = await getTenantSettings(params.tenant)
    if (settings) {
      setBusiness({
        business_name: settings.business_name,
        primary_color: settings.primary_color || '#FF6B35',
        address: settings.address,
        phone: settings.phone,
      })
    }

    if (!supabase) {
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .order('created_at', { ascending: false })
      .limit(100)

    if (data) {
      const parsed = data.map(order => ({
        ...order,
        items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items || []
      }))
      setOrders(parsed)
    }

    setLoading(false)
  }

  function initAudio() {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
    }
  }

  function playAlertSound() {
    if (!audioContextRef.current) initAudio()
    const ctx = audioContextRef.current
    if (!ctx) return

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.4, ctx.currentTime + start)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + start + duration)
      osc.start(ctx.currentTime + start)
      osc.stop(ctx.currentTime + start + duration)
    }

    playTone(880, 0, 0.15)
    playTone(1100, 0.15, 0.15)
    playTone(1320, 0.3, 0.3)
  }

  function enableSound() {
    initAudio()
    playAlertSound()
    setSoundEnabled(true)
    localStorage.setItem(`shop_display_sound_${params.tenant}`, 'true')
  }

  async function sendOrderStatusEmail(order: Order, status: string, rejectionReason?: string, rejectionNotes?: string) {
    if (!order.customer_email) return
    
    try {
      await fetch('/api/send-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerEmail: order.customer_email,
          customerName: order.customer_name,
          orderNumber: order.order_number,
          status,
          businessName: business?.business_name,
          businessEmail: business?.phone, // or email if available
          rejectionReason,
          rejectionNotes,
          total: order.total,
        }),
      })
    } catch (error) {
      console.error('Failed to send status email:', error)
    }
  }

  async function handleApprove(order: Order) {
    await updateOrderStatus(order.id, 'confirmed')
    await sendOrderStatusEmail(order, 'confirmed')
    setNewOrderIds(prev => {
      const next = new Set(prev)
      next.delete(order.id)
      return next
    })
    setSelectedOrder(null)
    // Force refresh orders
    loadData()
  }

  async function handleReject(order: Order) {
    await updateOrderStatus(order.id, 'rejected', rejectReason, rejectNotes)
    await sendOrderStatusEmail(order, 'rejected', rejectReason, rejectNotes)
    setNewOrderIds(prev => {
      const next = new Set(prev)
      next.delete(order.id)
      return next
    })
    setShowRejectModal(false)
    setSelectedOrder(null)
    setRejectReason('')
    setRejectNotes('')
    // Force refresh orders
    loadData()
  }

  async function handleComplete(order: Order) {
    await updateOrderStatus(order.id, 'completed')
    setSelectedOrder(null)
  }

  async function handleReady(order: Order) {
    await updateOrderStatus(order.id, 'ready')
    setSelectedOrder(null)
  }

  function printOrder(order: Order, type: 'customer' | 'kitchen' = 'customer') {
    const printWindow = window.open('', '_blank', 'width=320,height=700')
    if (!printWindow) return

    const itemsHtml = order.items?.map((item: any) => `
      <tr>
        <td style="padding: 5px 0; font-size: ${type === 'kitchen' ? '16px' : '14px'};">
          <strong>${item.quantity}x</strong> ${item.product_name || item.name}
          ${item.options?.map((opt: any) => `<br><span style="color: #666; padding-left: 15px; font-size: 12px;">+ ${opt.name}</span>`).join('') || ''}
          ${item.notes ? `<br><span style="color: #666; font-style: italic; padding-left: 15px; font-size: 12px;">📝 ${item.notes}</span>` : ''}
        </td>
        <td style="text-align: right; padding: 5px 0; font-size: ${type === 'kitchen' ? '16px' : '14px'}; vertical-align: top;">
          €${(item.total_price || item.price * item.quantity)?.toFixed(2)}
        </td>
      </tr>
    `).join('') || ''

    const customerBon = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Bon #${order.order_number}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              padding: 15px; 
              max-width: 300px;
              margin: 0 auto;
              font-size: 14px;
            }
            .header { text-align: center; margin-bottom: 15px; }
            .business-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .order-info { margin-bottom: 10px; }
            .order-number { font-size: 24px; font-weight: bold; text-align: center; margin: 10px 0; }
            .order-type { text-align: center; padding: 5px; background: #000; color: #fff; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; }
            .total-row { font-size: 18px; font-weight: bold; }
            .notes { margin-top: 10px; padding: 8px; background: #f5f5f5; font-size: 12px; }
            .footer { text-align: center; margin-top: 15px; font-size: 12px; color: #666; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="business-name">${business?.business_name || ''}</div>
            ${business?.address ? `<div style="font-size: 11px;">${business.address}</div>` : ''}
            ${business?.phone ? `<div style="font-size: 11px;">Tel: ${business.phone}</div>` : ''}
          </div>
          
          <div class="divider"></div>
          
          <div class="order-number">#${order.order_number}</div>
          <div class="order-type">${order.order_type === 'delivery' ? '🚗 LEVERING' : '🛍️ AFHALEN'}</div>
          
          <div class="order-info">
            <strong>${order.customer_name}</strong><br>
            ${order.customer_phone ? `Tel: ${order.customer_phone}<br>` : ''}
            ${order.delivery_address ? `Adres: ${order.delivery_address}<br>` : ''}
            <span style="color: #666;">
              ${new Date(order.created_at).toLocaleString('nl-BE', { 
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit' 
              })}
            </span>
          </div>

          <div class="divider"></div>

          <table>
            ${itemsHtml}
          </table>

          <div class="divider"></div>

          <table>
            ${order.subtotal ? `<tr><td>Subtotaal</td><td style="text-align: right;">€${order.subtotal.toFixed(2)}</td></tr>` : ''}
            ${order.delivery_fee ? `<tr><td>Bezorgkosten</td><td style="text-align: right;">€${order.delivery_fee.toFixed(2)}</td></tr>` : ''}
            ${order.discount_amount ? `<tr><td>Korting</td><td style="text-align: right;">-€${order.discount_amount.toFixed(2)}</td></tr>` : ''}
            <tr class="total-row">
              <td style="padding-top: 5px;">TOTAAL</td>
              <td style="text-align: right; padding-top: 5px;">€${order.total?.toFixed(2)}</td>
            </tr>
          </table>

          <div class="divider"></div>

          <div style="text-align: center; margin: 10px 0;">
            ${order.payment_status === 'paid' ? '✅ BETAALD' : '⏳ NOG TE BETALEN'}
            ${order.payment_method ? ` (${order.payment_method})` : ''}
          </div>

          ${order.customer_notes ? `
            <div class="notes">
              <strong>Opmerkingen:</strong><br>
              ${order.customer_notes}
            </div>
          ` : ''}

          <div class="footer">
            Bedankt voor uw bestelling!<br>
            ${new Date().toLocaleDateString('nl-BE')}
          </div>
        </body>
      </html>
    `

    const kitchenBon = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>KEUKEN #${order.order_number}</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              padding: 10px; 
              max-width: 280px;
              margin: 0 auto;
            }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 10px; }
            .order-number { font-size: 36px; font-weight: bold; }
            .order-type { font-size: 20px; margin: 10px 0; padding: 8px; background: #000; color: #fff; }
            .time { font-size: 18px; margin-top: 5px; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 8px 0; border-bottom: 1px dashed #ccc; font-size: 16px; }
            .notes { margin-top: 10px; padding: 10px; background: #f0f0f0; border: 2px solid #000; font-size: 14px; }
            @media print { body { -webkit-print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          <div class="header">
            <div style="font-size: 14px; font-weight: bold;">KEUKEN BON</div>
            <div class="order-number">#${order.order_number}</div>
            <div class="order-type">${order.order_type === 'delivery' ? '🚗 LEVERING' : '🛍️ AFHALEN'}</div>
            <div class="time">
              ${new Date(order.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div style="margin-top: 5px;"><strong>${order.customer_name}</strong></div>
          </div>

          <table>
            ${order.items?.map((item: any) => `
              <tr>
                <td>
                  <strong style="font-size: 20px;">${item.quantity}x</strong> 
                  <span style="font-size: 18px;">${item.product_name || item.name}</span>
                  ${item.options?.map((opt: any) => `<br><span style="padding-left: 20px;">+ ${opt.name}</span>`).join('') || ''}
                  ${item.notes ? `<br><span style="font-style: italic; padding-left: 20px;">📝 ${item.notes}</span>` : ''}
                </td>
              </tr>
            `).join('') || ''}
          </table>

          ${order.customer_notes ? `
            <div class="notes">
              <strong>⚠️ OPMERKINGEN:</strong><br>
              ${order.customer_notes}
            </div>
          ` : ''}

          <div style="text-align: center; margin-top: 15px; font-size: 12px;">
            ${business?.business_name || ''} - ${new Date().toLocaleDateString('nl-BE')}
          </div>
        </body>
      </html>
    `

    printWindow.document.write(type === 'kitchen' ? kitchenBon : customerBon)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'bg-orange-500'
      case 'confirmed': return 'bg-blue-500'
      case 'preparing': return 'bg-yellow-500'
      case 'ready': return 'bg-green-500'
      case 'completed': return 'bg-gray-500'
      case 'rejected': return 'bg-red-500'
      default: return 'bg-gray-500'
    }
  }

  const getStatusBgColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'bg-orange-500/10 border-orange-500'
      case 'confirmed': return 'bg-blue-500/10 border-blue-500'
      case 'preparing': return 'bg-yellow-500/10 border-yellow-500'
      case 'ready': return 'bg-green-500/20 border-green-500 ring-2 ring-green-500'
      case 'completed': return 'bg-gray-500/10 border-gray-500'
      case 'rejected': return 'bg-red-500/10 border-red-500'
      default: return 'bg-gray-500/10 border-gray-500'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return 'NIEUW'
      case 'confirmed': return 'IN KEUKEN'
      case 'preparing': return 'IN BEREIDING'
      case 'ready': return '✓ KLAAR'
      case 'completed': return 'AFGEROND'
      case 'rejected': return 'GEWEIGERD'
      default: return status.toUpperCase()
    }
  }

  const getTimeSince = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Zojuist'
    if (mins < 60) return `${mins} min`
    return `${Math.floor(mins / 60)}u ${mins % 60}m`
  }

  const activeOrders = orders.filter(o => !['completed', 'rejected'].includes(o.status.toLowerCase()))
  const completedOrders = orders.filter(o => ['completed', 'rejected'].includes(o.status.toLowerCase()))
  
  // Sort: New first, then Ready (green), then others
  const sortedActiveOrders = [...activeOrders].sort((a, b) => {
    const priority = { 'new': 0, 'ready': 1, 'confirmed': 2, 'preparing': 2 }
    const aPriority = priority[a.status.toLowerCase() as keyof typeof priority] ?? 3
    const bPriority = priority[b.status.toLowerCase() as keyof typeof priority] ?? 3
    if (aPriority !== bPriority) return aPriority - bPriority
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }

  return (
    <div style={{ maxWidth: '100vw', overflowX: 'hidden', width: '100%' }} className="min-h-screen bg-gray-900 text-white">
      {/* FULLSCREEN NEW ORDER ALERT */}
      <AnimatePresence>
        {newOrderIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] pointer-events-none"
          >
            {/* Pulsing orange border around entire screen */}
            <motion.div
              animate={{ 
                boxShadow: [
                  'inset 0 0 60px 30px rgba(249, 115, 22, 0.8)',
                  'inset 0 0 100px 50px rgba(249, 115, 22, 0.4)',
                  'inset 0 0 60px 30px rgba(249, 115, 22, 0.8)',
                ]
              }}
              transition={{ duration: 1, repeat: Infinity }}
              className="absolute inset-0"
            />
            
            {/* Top banner */}
            <motion.div
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-orange-500 px-12 py-8 rounded-3xl shadow-2xl pointer-events-auto"
              onClick={() => {
                // Click to dismiss and view orders
                const firstNewOrderId = Array.from(newOrderIds)[0]
                const order = orders.find(o => o.id === firstNewOrderId)
                if (order) {
                  setSelectedOrder(order)
                  setNewOrderIds(prev => {
                    const next = new Set(prev)
                    next.delete(firstNewOrderId)
                    return next
                  })
                }
              }}
            >
              <p className="text-6xl font-black text-white text-center mb-2">🔔 NIEUWE BESTELLING!</p>
              <p className="text-3xl font-bold text-white/90 text-center">
                {newOrderIds.size === 1 ? 'Klik om te bekijken' : `${newOrderIds.size} nieuwe bestellingen`}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: business?.primary_color }}
            >
              🖥️
            </div>
            <div>
              <h1 className="text-xl font-bold">SHOP DISPLAY</h1>
              <p className="text-gray-400 text-sm">{business?.business_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Sound Toggle */}
            {!soundEnabled ? (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={enableSound}
                className="px-4 py-2 bg-orange-500 hover:bg-orange-600 rounded-xl font-bold flex items-center gap-2 text-sm"
              >
                🔔 Geluid Aan
              </motion.button>
            ) : (
              <span className="px-3 py-2 bg-green-500/20 text-green-400 rounded-xl flex items-center gap-2 text-sm">
                🔊 Aan
              </span>
            )}

            {/* New order indicator */}
            {newOrderIds.size > 0 && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="px-4 py-2 bg-red-500 rounded-xl font-bold"
              >
                🚨 {newOrderIds.size} NIEUW
              </motion.div>
            )}

            {/* Stats */}
            <div className="flex gap-2">
              <span className="px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg text-sm font-bold">
                {activeOrders.filter(o => o.status.toLowerCase() === 'new').length} Nieuw
              </span>
              <span className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-bold">
                {activeOrders.filter(o => o.status.toLowerCase() === 'confirmed').length} Keuken
              </span>
              <span className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-bold">
                {activeOrders.filter(o => o.status.toLowerCase() === 'ready').length} Klaar
              </span>
            </div>

            {/* Clock */}
            <div className="text-right">
              <p className="text-2xl font-mono font-bold">
                {currentTime.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Links */}
            <Link
              href={`/keuken/${params.tenant}`}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold"
            >
              👨‍🍳 Keuken
            </Link>
            <Link
              href={`/shop/${params.tenant}/admin`}
              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-xl text-sm"
            >
              ✕
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-gray-800/50 px-4 py-2 flex gap-2">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
            activeTab === 'active' 
              ? 'bg-orange-500 text-white' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          Actief ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
            activeTab === 'completed' 
              ? 'bg-gray-500 text-white' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          Afgerond ({completedOrders.length})
        </button>
      </div>

      {/* Orders Grid */}
      <div className="p-4 h-[calc(100vh-120px)] overflow-y-auto">
        {activeTab === 'active' ? (
          sortedActiveOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <span className="text-8xl mb-6">📭</span>
              <p className="text-2xl font-bold">Geen actieve bestellingen</p>
              <p className="text-lg mt-2">Nieuwe bestellingen verschijnen hier automatisch</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3">
              {sortedActiveOrders.map((order) => (
                <motion.div
                  key={order.id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`rounded-2xl overflow-hidden cursor-pointer transition-all border-2 ${getStatusBgColor(order.status)} ${
                    newOrderIds.has(order.id)
                      ? 'ring-4 ring-orange-500 shadow-[0_0_40px_rgba(249,115,22,0.6)]'
                      : ''
                  }`}
                  onClick={() => {
                    setSelectedOrder(order)
                    setNewOrderIds(prev => {
                      const next = new Set(prev)
                      next.delete(order.id)
                      return next
                    })
                  }}
                >
                  {/* Order Header */}
                  <div className={`${getStatusColor(order.status)} px-4 py-2 flex items-center justify-between`}>
                    <span className="font-bold text-lg">#{order.order_number}</span>
                    <span className="text-xs font-bold bg-white/20 px-2 py-1 rounded">
                      {getStatusLabel(order.status)}
                    </span>
                  </div>

                  {/* Order Content */}
                  <div className="p-3 bg-gray-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold truncate">{order.customer_name}</span>
                      <span className="text-gray-400 text-xs shrink-0 ml-2">{getTimeSince(order.created_at)}</span>
                    </div>

                    <div className="flex items-center gap-1 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        order.order_type === 'delivery' ? 'bg-purple-500/20 text-purple-400' : 'bg-green-500/20 text-green-400'
                      }`}>
                        {order.order_type === 'delivery' ? '🚗 Levering' : '🛍️ Afhalen'}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        order.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {order.payment_status === 'paid' ? '✓ Betaald' : '⏳'}
                      </span>
                    </div>

                    {/* Items preview */}
                    <div className="text-sm text-gray-400 mb-2">
                      {order.items?.slice(0, 2).map((item: any, i: number) => (
                        <p key={i} className="truncate">{item.quantity}x {item.product_name || item.name}</p>
                      ))}
                      {(order.items?.length || 0) > 2 && (
                        <p className="text-gray-500">+{order.items.length - 2} meer...</p>
                      )}
                    </div>

                    {/* Total */}
                    <div className="text-xl font-bold" style={{ color: business?.primary_color }}>
                      €{order.total?.toFixed(2)}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {completedOrders.slice(0, 50).map((order) => (
              <div
                key={order.id}
                className="bg-gray-800/50 rounded-xl p-3 cursor-pointer hover:bg-gray-700/50 transition-colors"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold">#{order.order_number}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    order.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {order.status === 'completed' ? '✓ Afgerond' : '✗ Geweigerd'}
                  </span>
                </div>
                <p className="text-sm text-gray-400">{order.customer_name}</p>
                <p className="text-sm text-gray-500">€{order.total?.toFixed(2)}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      <AnimatePresence>
        {selectedOrder && !showRejectModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`${getStatusColor(selectedOrder.status)} p-6`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-4xl font-bold">#{selectedOrder.order_number}</h2>
                    <p className="text-white/80 text-lg">{getStatusLabel(selectedOrder.status)}</p>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-3xl hover:bg-white/30"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Customer Info */}
                <div className="bg-gray-700/50 rounded-2xl p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 text-sm">Klant</p>
                      <p className="font-bold text-xl">{selectedOrder.customer_name}</p>
                    </div>
                    {selectedOrder.customer_phone && (
                      <div>
                        <p className="text-gray-400 text-sm">Telefoon</p>
                        <p className="font-bold text-xl">{selectedOrder.customer_phone}</p>
                      </div>
                    )}
                  </div>
                  {selectedOrder.delivery_address && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <p className="text-gray-400 text-sm">Bezorgadres</p>
                      <p className="font-medium">{selectedOrder.delivery_address}</p>
                    </div>
                  )}
                </div>

                {/* Type & Payment */}
                <div className="flex gap-3 mb-4">
                  <div className={`flex-1 rounded-xl p-3 text-center ${
                    selectedOrder.order_type === 'delivery' ? 'bg-purple-500/20' : 'bg-green-500/20'
                  }`}>
                    <p className="text-3xl">{selectedOrder.order_type === 'delivery' ? '🚗' : '🛍️'}</p>
                    <p className="font-bold">{selectedOrder.order_type === 'delivery' ? 'Levering' : 'Afhalen'}</p>
                  </div>
                  <div className={`flex-1 rounded-xl p-3 text-center ${
                    selectedOrder.payment_status === 'paid' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                  }`}>
                    <p className="text-3xl">{selectedOrder.payment_status === 'paid' ? '✓' : '⏳'}</p>
                    <p className="font-bold">{selectedOrder.payment_status === 'paid' ? 'Betaald' : 'Niet betaald'}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-gray-700/50 rounded-2xl p-4 mb-4">
                  <h3 className="font-bold text-lg mb-3">Bestelling</h3>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item: any, i: number) => (
                      <div key={i} className="flex items-start justify-between py-2 border-b border-gray-600 last:border-0">
                        <div className="flex items-start gap-3">
                          <span className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center font-bold text-lg shrink-0">
                            {item.quantity}
                          </span>
                          <div>
                            <span className="font-medium text-lg">{item.product_name || item.name}</span>
                            {item.options?.map((opt: any, j: number) => (
                              <p key={j} className="text-sm text-gray-400">+ {opt.name}</p>
                            ))}
                            {item.notes && (
                              <p className="text-sm text-yellow-400">📝 {item.notes}</p>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-lg shrink-0">€{(item.total_price || item.price * item.quantity)?.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-600 space-y-1">
                    {selectedOrder.subtotal && (
                      <div className="flex justify-between text-gray-400">
                        <span>Subtotaal</span>
                        <span>€{selectedOrder.subtotal.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.delivery_fee && (
                      <div className="flex justify-between text-gray-400">
                        <span>Bezorgkosten</span>
                        <span>€{selectedOrder.delivery_fee.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.discount_amount && (
                      <div className="flex justify-between text-green-400">
                        <span>Korting</span>
                        <span>-€{selectedOrder.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-3xl font-bold pt-2">
                      <span>Totaal</span>
                      <span style={{ color: business?.primary_color }}>€{selectedOrder.total?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.customer_notes && (
                  <div className="bg-yellow-500/20 rounded-2xl p-4 mb-4">
                    <p className="font-bold">📝 {selectedOrder.customer_notes}</p>
                  </div>
                )}

                {/* Rejection info */}
                {selectedOrder.status === 'rejected' && selectedOrder.rejection_reason && (
                  <div className="bg-red-500/20 rounded-2xl p-4 mb-4">
                    <p className="font-bold text-red-400">❌ Geweigerd: {
                      REJECTION_REASONS.find(r => r.id === selectedOrder.rejection_reason)?.label || selectedOrder.rejection_reason
                    }</p>
                    {selectedOrder.rejection_notes && (
                      <p className="text-gray-400 mt-1">{selectedOrder.rejection_notes}</p>
                    )}
                  </div>
                )}

                {/* Print Buttons */}
                <div className="flex gap-3 mb-4">
                  <button
                    onClick={() => printOrder(selectedOrder, 'customer')}
                    className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    🖨️ Klantbon
                  </button>
                  <button
                    onClick={() => printOrder(selectedOrder, 'kitchen')}
                    className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    🖨️ Keukenbon
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedOrder.status.toLowerCase() === 'new' && (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setShowRejectModal(true)}
                        className="py-6 bg-red-500 hover:bg-red-600 rounded-2xl font-bold text-2xl"
                      >
                        ✗ AFWIJZEN
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleApprove(selectedOrder)}
                        className="py-6 bg-green-500 hover:bg-green-600 rounded-2xl font-bold text-2xl"
                      >
                        ✓ GOEDKEUREN
                      </motion.button>
                    </>
                  )}
                  {selectedOrder.status.toLowerCase() === 'confirmed' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleReady(selectedOrder)}
                      className="col-span-2 py-6 bg-green-500 hover:bg-green-600 rounded-2xl font-bold text-2xl"
                    >
                      ✓ KLAAR
                    </motion.button>
                  )}
                  {selectedOrder.status.toLowerCase() === 'ready' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleComplete(selectedOrder)}
                      className="col-span-2 py-6 bg-blue-500 hover:bg-blue-600 rounded-2xl font-bold text-2xl"
                    >
                      ✓ AFGEROND
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject Modal */}
      <AnimatePresence>
        {showRejectModal && selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRejectModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-3xl max-w-lg w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-2 text-center">Bestelling Afwijzen</h2>
              <p className="text-gray-400 text-center mb-6">#{selectedOrder.order_number} - {selectedOrder.customer_name}</p>

              <p className="text-sm text-gray-400 mb-3">Selecteer een reden:</p>
              <div className="grid grid-cols-2 gap-3 mb-6">
                {REJECTION_REASONS.map((reason) => (
                  <button
                    key={reason.id}
                    onClick={() => setRejectReason(reason.id)}
                    className={`p-4 rounded-2xl text-left transition-all ${
                      rejectReason === reason.id
                        ? 'bg-red-500 ring-2 ring-red-400'
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    <span className="text-2xl mb-1 block">{reason.icon}</span>
                    <span className="font-medium">{reason.label}</span>
                  </button>
                ))}
              </div>

              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="Extra notities voor de klant (optioneel)..."
                className="w-full px-4 py-3 bg-gray-700 rounded-xl border-none resize-none h-24 mb-6 text-white placeholder-gray-400"
              />

              <div className="flex gap-4">
                <button
                  onClick={() => {
                    setShowRejectModal(false)
                    setRejectReason('')
                    setRejectNotes('')
                  }}
                  className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-2xl font-bold text-lg"
                >
                  Annuleren
                </button>
                <button
                  onClick={() => handleReject(selectedOrder)}
                  disabled={!rejectReason}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Afwijzen
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
