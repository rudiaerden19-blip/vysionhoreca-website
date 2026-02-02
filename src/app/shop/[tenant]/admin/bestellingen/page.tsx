'use client'

import { useLanguage } from '@/i18n'
import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getOrders, updateOrderStatus, confirmOrder, rejectOrder, Order, getTenantSettings, TenantSettings, addLoyaltyPoints } from '@/lib/admin-api'
import { supabase } from '@/lib/supabase'
import { 
  isAudioActivatedThisSession, 
  activateAudio, 
  playOrderNotificationSound,
  setupAutoActivation,
  isAudioReady
} from '@/lib/audio-system'

// Parse items from JSONB
interface OrderItemJson {
  name?: string
  product_name?: string
  quantity: number
  price?: number
  unit_price?: number
  total_price?: number
  options?: { name: string; price: number }[]
  notes?: string  // Voice order modifications like "zonder tomaat"
}

// Status config builder function (uses translations)
const getStatusConfig = (t: (key: string) => string): Record<string, { bg: string; text: string; label: string; next?: string; prev?: string }> => ({
  new: { bg: 'bg-blue-100', text: 'text-blue-700', label: `🆕 ${t('ordersPage.status.new')}`, next: 'confirmed' },
  NEW: { bg: 'bg-blue-100', text: 'text-blue-700', label: `🆕 ${t('ordersPage.status.new')}`, next: 'confirmed' },
  confirmed: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: `✓ ${t('ordersPage.status.confirmed')}`, next: 'preparing', prev: 'new' },
  CONFIRMED: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: `✓ ${t('ordersPage.status.confirmed')}`, next: 'preparing', prev: 'new' },
  preparing: { bg: 'bg-blue-100', text: 'text-blue-700', label: `👨‍🍳 ${t('ordersPage.status.preparing')}`, next: 'ready', prev: 'confirmed' },
  PREPARING: { bg: 'bg-blue-100', text: 'text-blue-700', label: `👨‍🍳 ${t('ordersPage.status.preparing')}`, next: 'ready', prev: 'confirmed' },
  ready: { bg: 'bg-green-100', text: 'text-green-700', label: `✅ ${t('ordersPage.status.ready')}`, next: 'completed', prev: 'preparing' },
  READY: { bg: 'bg-green-100', text: 'text-green-700', label: `✅ ${t('ordersPage.status.ready')}`, next: 'completed', prev: 'preparing' },
  delivered: { bg: 'bg-purple-100', text: 'text-purple-700', label: `🚗 ${t('ordersPage.status.delivered')}`, next: 'completed' },
  DELIVERED: { bg: 'bg-purple-100', text: 'text-purple-700', label: `🚗 ${t('ordersPage.status.delivered')}`, next: 'completed' },
  completed: { bg: 'bg-gray-100', text: 'text-gray-700', label: `✔️ ${t('ordersPage.status.completed')}` },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-700', label: `✔️ ${t('ordersPage.status.completed')}` },
  cancelled: { bg: 'bg-red-100', text: 'text-red-700', label: `❌ ${t('ordersPage.status.cancelled')}` },
  CANCELLED: { bg: 'bg-red-100', text: 'text-red-700', label: `❌ ${t('ordersPage.status.cancelled')}` },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: `🚫 ${t('ordersPage.status.rejected')}` },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: `🚫 ${t('ordersPage.status.rejected')}` },
})

const getPaymentStatusConfig = (t: (key: string) => string): Record<string, { bg: string; text: string; label: string }> => ({
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: `⏳ ${t('ordersPage.paymentStatus.pending')}` },
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: `⏳ ${t('ordersPage.paymentStatus.pending')}` },
  paid: { bg: 'bg-green-100', text: 'text-green-700', label: `✅ ${t('ordersPage.paymentStatus.paid')}` },
  PAID: { bg: 'bg-green-100', text: 'text-green-700', label: `✅ ${t('ordersPage.paymentStatus.paid')}` },
  failed: { bg: 'bg-red-100', text: 'text-red-700', label: `❌ ${t('ordersPage.paymentStatus.failed')}` },
  FAILED: { bg: 'bg-red-100', text: 'text-red-700', label: `❌ ${t('ordersPage.paymentStatus.failed')}` },
})

const getPaymentMethodLabels = (t: (key: string) => string): Record<string, string> => ({
  cash: `💵 ${t('ordersPage.paymentMethod.cash')}`,
  CASH: `💵 ${t('ordersPage.paymentMethod.cash')}`,
  card: `💳 ${t('ordersPage.paymentMethod.card')}`,
  CARD: `💳 ${t('ordersPage.paymentMethod.card')}`,
  online: `🌐 ${t('ordersPage.paymentMethod.online')}`,
  ONLINE: `🌐 ${t('ordersPage.paymentMethod.online')}`,
  ideal: `🏦 ${t('ordersPage.paymentMethod.ideal')}`,
  IDEAL: `🏦 ${t('ordersPage.paymentMethod.ideal')}`,
  bancontact: `💳 ${t('ordersPage.paymentMethod.bancontact')}`,
  BANCONTACT: `💳 ${t('ordersPage.paymentMethod.bancontact')}`,
})

export default function BestellingenPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  
  // Memoized configs with translations
  const statusConfig = useMemo(() => getStatusConfig(t), [t])
  const paymentStatusConfig = useMemo(() => getPaymentStatusConfig(t), [t])
  const paymentMethodLabels = useMemo(() => getPaymentMethodLabels(t), [t])
  
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [kitchenMode, setKitchenMode] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const [notificationsEnabled, setNotificationsEnabled] = useState(true)
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null)
  // Check if already activated this session - skip activation screen if so
  const [audioActivated, setAudioActivated] = useState(() => isAudioActivatedThisSession())
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [rejectionNotes, setRejectionNotes] = useState('')
  const [showNewOrderAlert, setShowNewOrderAlert] = useState(false)
  const [alertDismissed, setAlertDismissed] = useState(false)
  
  const rejectionReasons = useMemo(() => [
    { value: 'too_busy', label: `🔥 ${t('ordersPage.rejection.reasons.tooBusy')}` },
    { value: 'closed', label: `🚪 ${t('ordersPage.rejection.reasons.closed')}` },
    { value: 'sold_out', label: `❌ ${t('ordersPage.rejection.reasons.soldOut')}` },
    { value: 'delivery_unavailable', label: `🚗 ${t('ordersPage.rejection.reasons.deliveryUnavailable')}` },
    { value: 'technical', label: `⚙️ ${t('ordersPage.rejection.reasons.technical')}` },
    { value: 'other', label: `📝 ${t('ordersPage.rejection.reasons.other')}` },
  ], [t])
  
  // Refs
  const audioIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const knownOrderIdsRef = useRef<Set<string>>(new Set())
  
  // Track which orders are "new" and need attention
  const hasNewOrders = orders.some(o => o.status === 'new' || o.status === 'NEW')
  
  // Show orange alert when new orders arrive
  useEffect(() => {
    if (hasNewOrders && !alertDismissed) {
      setShowNewOrderAlert(true)
    }
    if (!hasNewOrders) {
      setShowNewOrderAlert(false)
      setAlertDismissed(false) // Reset for next new order
    }
  }, [hasNewOrders, alertDismissed])
  
  const dismissAlert = () => {
    setShowNewOrderAlert(false)
    setAlertDismissed(true)
    // Sound keeps playing until order is confirmed/rejected
  }
  
  // Auto-initialize audio if already activated in this session
  useEffect(() => {
    setSoundEnabled(true)
    setNotificationsEnabled(true)
    
    // Request notification permission on load
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
    
    // If already activated this session, set up auto-activation on first interaction
    if (audioActivated) {
      const cleanup = setupAutoActivation()
      return cleanup
    }
  }, [params.tenant, audioActivated])

  // Helper: parse items from JSONB or array
  const parseItems = (order: Order): OrderItemJson[] => {
    if (!order.items) return []
    // Could be already parsed or could be a JSON string
    if (typeof order.items === 'string') {
      try {
        return JSON.parse(order.items)
      } catch {
        return []
      }
    }
    return order.items as OrderItemJson[]
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current)
      }
    }
  }, [])

  // Play repeating sound when there are new orders
  // KRITIEK: Altijd proberen geluid te spelen - browser blokkeert automatisch als niet geactiveerd
  useEffect(() => {
    if (hasNewOrders) {
      // Play immediately
      playOrderNotificationSound()
      
      // Repeat every 3 seconds
      audioIntervalRef.current = setInterval(playOrderNotificationSound, 3000)
      
    } else {
      // Stop sound
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current)
        audioIntervalRef.current = null
      }
    }
    
    return () => {
      if (audioIntervalRef.current) {
        clearInterval(audioIntervalRef.current)
      }
    }
  }, [hasNewOrders])

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      // We'll ask for permission when user enables notifications
    }
  }, [])

  const requestNotificationPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        setNotificationsEnabled(true)
      }
    }
  }

  const showNotification = useCallback((order: Order) => {
    if (notificationsEnabled && 'Notification' in window && Notification.permission === 'granted') {
      new Notification('🍟 Nieuwe bestelling!', {
        body: `${order.customer_name} - €${order.total?.toFixed(2)}`,
        icon: '/icon-192.png',
        tag: order.id,
        requireInteraction: true,
      })
    }
  }, [notificationsEnabled])

  // Load orders and tenant settings
  const loadOrders = useCallback(async () => {
    const [ordersData, settingsData] = await Promise.all([
      getOrders(params.tenant),
      getTenantSettings(params.tenant)
    ])
    setOrders(ordersData)
    setTenantSettings(settingsData)
    setLoading(false)
  }, [params.tenant])

  useEffect(() => {
    loadOrders()
  }, [loadOrders])

  // POLLING - Check for new orders every 3 seconds (MOST RELIABLE)
  useEffect(() => {
    const pollForNewOrders = async () => {
      try {
        const freshOrders = await getOrders(params.tenant)
        
        // Check for NEW orders we haven't seen before
        const newOrdersFound = freshOrders.filter(o => 
          o.id && 
          !knownOrderIdsRef.current.has(o.id) &&
          (o.status === 'new' || o.status === 'NEW')
        )
        
        // Update known IDs
        freshOrders.forEach(o => o.id && knownOrderIdsRef.current.add(o.id))
        
        // If we found new orders, trigger alert!
        if (newOrdersFound.length > 0) {
          setAlertDismissed(false)
          setShowNewOrderAlert(true)
        }
        
        // Update orders list
        setOrders(freshOrders)
        
      } catch (e) {
        console.error('Polling error:', e)
      }
    }
    
    // Initialize known IDs on mount
    orders.forEach(o => o.id && knownOrderIdsRef.current.add(o.id))
    
    // Poll every 3 seconds - this is the MAIN way to detect orders
    pollingIntervalRef.current = setInterval(pollForNewOrders, 3000)
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant]) // Only restart polling when tenant changes

  // Enable sound - uses shared audio system
  const enableSound = () => {
    setSoundEnabled(true)
    activateAudio()
    playOrderNotificationSound()
  }
  
  // Disable sound
  const disableSound = () => {
    setSoundEnabled(false)
    if (audioIntervalRef.current) {
      clearInterval(audioIntervalRef.current)
      audioIntervalRef.current = null
    }
  }

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setUpdatingId(orderId)
    const success = await updateOrderStatus(orderId, newStatus)
    if (success) {
      const order = orders.find(o => o.id === orderId)
      setOrders(prev => prev.map(o => 
        o.id === orderId ? { ...o, status: newStatus } : o
      ))
      
      // Send email when order is ready for pickup
      if (newStatus === 'ready' && order?.customer_email) {
        try {
          await fetch('/api/send-order-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              // Customer info
              customerEmail: order.customer_email,
              customerName: order.customer_name,
              customerPhone: order.customer_phone,
              customerAddress: order.customer_address || order.delivery_address,
              // Order info
              orderNumber: order.order_number,
              orderType: order.order_type,
              status: 'ready',
              // Business info (verplicht voor Belgische wetgeving)
              businessName: tenantSettings?.business_name || 'Restaurant',
              businessEmail: tenantSettings?.email,
              businessPhone: tenantSettings?.phone,
              businessAddress: tenantSettings?.address,
              businessPostalCode: tenantSettings?.postal_code,
              businessCity: tenantSettings?.city,
              businessBtwNumber: tenantSettings?.btw_number,
              // Order details
              items: order.items,
              subtotal: order.subtotal,
              deliveryFee: order.delivery_fee,
              discount: order.discount_amount,
              total: order.total,
              btwPercentage: tenantSettings?.btw_percentage || 6,
            }),
          })
        } catch (e) {
          console.error('Failed to send ready email:', e)
        }
      }
    }
    setUpdatingId(null)
  }
  
  // Handle confirm order (goedkeuren)
  const handleConfirmOrder = async (order: Order) => {
    if (!order.id) return
    setUpdatingId(order.id)
    const success = await confirmOrder(order.id)
    if (success) {
      setOrders(prev => prev.map(o => 
        o.id === order.id ? { ...o, status: 'confirmed', confirmed_at: new Date().toISOString() } : o
      ))
      
      // Send confirmation email to customer with full order details
      if (order.customer_email) {
        try {
          await fetch('/api/send-order-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              // Customer info
              customerEmail: order.customer_email,
              customerName: order.customer_name,
              customerPhone: order.customer_phone,
              customerAddress: order.customer_address || order.delivery_address,
              // Order info
              orderNumber: order.order_number,
              orderType: order.order_type,
              status: 'confirmed',
              // Business info (verplicht voor Belgische wetgeving)
              businessName: tenantSettings?.business_name || 'Restaurant',
              businessEmail: tenantSettings?.email,
              businessPhone: tenantSettings?.phone,
              businessAddress: tenantSettings?.address,
              businessPostalCode: tenantSettings?.postal_code,
              businessCity: tenantSettings?.city,
              businessBtwNumber: tenantSettings?.btw_number,
              // Order details
              items: order.items,
              subtotal: order.subtotal,
              deliveryFee: order.delivery_fee,
              discount: order.discount_amount,
              total: order.total,
              btwPercentage: tenantSettings?.btw_percentage || 6,
            }),
          })
        } catch (e) {
          console.error('Failed to send confirmation email:', e)
        }
      }
      
      // Add loyalty points NOW (after approval) - 1 point per euro
      // Find customer by email
      if (order.customer_email && order.total) {
        try {
          const { data: customer } = await supabase
            .from('shop_customers')
            .select('id')
            .eq('tenant_slug', params.tenant)
            .eq('email', order.customer_email.toLowerCase())
            .single()
          
          if (customer) {
            const points = Math.floor(order.total)
            await addLoyaltyPoints(customer.id, points, order.total)
            console.log(`Added ${points} loyalty points to customer ${customer.id}`)
          }
        } catch (e) {
          console.error('Failed to add loyalty points:', e)
        }
      }
    }
    setUpdatingId(null)
  }
  
  // Handle reject order (weigeren)
  const handleRejectOrder = async () => {
    if (!rejectingOrder?.id || !rejectionReason) return
    setUpdatingId(rejectingOrder.id)
    const success = await rejectOrder(rejectingOrder.id, rejectionReason, rejectionNotes)
    if (success) {
      setOrders(prev => prev.map(o => 
        o.id === rejectingOrder.id ? { 
          ...o, 
          status: 'rejected', 
          rejection_reason: rejectionReason,
          rejection_notes: rejectionNotes,
          rejected_at: new Date().toISOString() 
        } : o
      ))
      
      // Send rejection email to customer with business details
      if (rejectingOrder.customer_email) {
        try {
          await fetch('/api/send-order-status', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              // Customer info
              customerEmail: rejectingOrder.customer_email,
              customerName: rejectingOrder.customer_name,
              customerPhone: rejectingOrder.customer_phone,
              // Order info
              orderNumber: rejectingOrder.order_number,
              orderType: rejectingOrder.order_type,
              status: 'rejected',
              // Business info (verplicht voor Belgische wetgeving)
              businessName: tenantSettings?.business_name || 'Restaurant',
              businessEmail: tenantSettings?.email,
              businessPhone: tenantSettings?.phone,
              businessAddress: tenantSettings?.address,
              businessPostalCode: tenantSettings?.postal_code,
              businessCity: tenantSettings?.city,
              businessBtwNumber: tenantSettings?.btw_number,
              // Rejection details
              rejectionReason: rejectionReason,
              rejectionNotes: rejectionNotes,
              total: rejectingOrder.total,
            }),
          })
        } catch (e) {
          console.error('Failed to send rejection email:', e)
        }
      }
      
      // NOTE: Geen spaarpunten - die worden pas bij goedkeuring gegeven
      
      setRejectingOrder(null)
      setRejectionReason('')
      setRejectionNotes('')
    }
    setUpdatingId(null)
  }

  // Print receipt function - Officiële kassabon met alle verplichte gegevens
  const printReceipt = (order: Order) => {
    const items = parseItems(order)
    const printWindow = window.open('', '_blank', 'width=400,height=800')
    if (!printWindow) return

    // BTW berekening - gebruik percentage uit instellingen of standaard 21%
    const btwPercentage = tenantSettings?.btw_percentage || 6
    const totalExclBtw = order.total ? order.total / (1 + btwPercentage / 100) : 0
    const btwBedrag = order.total ? order.total - totalExclBtw : 0

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Kassabon #${order.order_number || order.id?.slice(0, 8)}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 15px; max-width: 300px; margin: 0 auto; font-size: 12px; }
          h1 { text-align: center; font-size: 16px; margin-bottom: 5px; }
          .business-name { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 3px; }
          .business-info { text-align: center; font-size: 11px; color: #333; line-height: 1.4; }
          .order-num { text-align: center; font-size: 20px; font-weight: bold; margin: 8px 0; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .divider-double { border-top: 2px solid #000; margin: 8px 0; }
          .item { display: flex; justify-content: space-between; margin: 4px 0; }
          .total { font-size: 14px; font-weight: bold; }
          .center { text-align: center; }
          .small { font-size: 10px; color: #666; }
          .badge { display: inline-block; padding: 2px 6px; background: #f0f0f0; border-radius: 3px; margin: 2px; font-size: 10px; }
          .btw-section { background: #f5f5f5; padding: 8px; margin: 8px 0; }
          .right { text-align: right; }
        </style>
      </head>
      <body>
        <!-- ZAAKGEGEVENS - VERPLICHT -->
        <div class="business-name">${tenantSettings?.business_name || 'Horecazaak'}</div>
        <div class="business-info">
          ${tenantSettings?.address || ''}<br>
          ${tenantSettings?.postal_code || ''} ${tenantSettings?.city || ''}<br>
          ${tenantSettings?.phone ? `Tel: ${tenantSettings.phone}` : ''}<br>
          ${tenantSettings?.email ? `${tenantSettings.email}` : ''}<br>
          ${tenantSettings?.btw_number ? `<strong>BTW: ${tenantSettings.btw_number}</strong>` : ''}
        </div>
        
        <div class="divider-double"></div>
        
        <!-- KASSABON INFO -->
        <div class="center">
          <strong>KASSABON</strong><br>
          <span class="order-num">#${order.order_number || order.id?.slice(0, 8)}</span>
        </div>
        <div class="center small">
          ${new Date(order.created_at || '').toLocaleString('nl-BE')}<br>
          ${order.order_type === 'pickup' || order.order_type === 'PICKUP' ? 'AFHALEN' : 'LEVERING'}
        </div>
        
        <div class="divider"></div>
        
        <!-- KLANTGEGEVENS -->
        <div style="margin: 6px 0;">
          <strong>Klant:</strong> ${order.customer_name}<br>
          ${order.customer_phone ? `Tel: ${order.customer_phone}<br>` : ''}
          ${order.customer_email ? `${order.customer_email}<br>` : ''}
          ${order.customer_address || order.delivery_address ? `Adres: ${order.customer_address || order.delivery_address}<br>` : ''}
        </div>
        
        <div class="divider"></div>
        
        <!-- PRODUCTEN -->
        <div style="margin: 6px 0;">
          <strong>ARTIKELEN:</strong>
        </div>
        ${items.map(item => `
          <div class="item">
            <span>${item.quantity}x ${item.name || item.product_name}</span>
            <span>€${((item.price || item.unit_price || 0) * item.quantity).toFixed(2)}</span>
          </div>
          ${item.options && item.options.length > 0 ? `<div style="font-size: 10px; margin-left: 10px; color: #666;">+ ${item.options.map((o: any) => o.name).join(', ')}</div>` : ''}
          ${item.notes ? `<div style="font-size: 10px; margin-left: 10px; font-weight: bold;">⚠️ ${item.notes}</div>` : ''}
        `).join('')}
        
        <div class="divider"></div>
        
        <!-- TOTALEN -->
        ${(order.delivery_fee || 0) > 0 ? `
          <div class="item">
            <span>Bezorgkosten</span>
            <span>€${order.delivery_fee?.toFixed(2)}</span>
          </div>
        ` : ''}
        ${(order.discount_amount || 0) > 0 ? `
          <div class="item" style="color: green;">
            <span>Korting ${order.discount_code ? `(${order.discount_code})` : ''}</span>
            <span>-€${order.discount_amount?.toFixed(2)}</span>
          </div>
        ` : ''}
        
        <div class="divider-double"></div>
        
        <!-- BTW SECTIE - VERPLICHT -->
        <div class="btw-section">
          <div class="item">
            <span>Totaal excl. BTW</span>
            <span>€${totalExclBtw.toFixed(2)}</span>
          </div>
          <div class="item">
            <span>BTW ${btwPercentage}%</span>
            <span>€${btwBedrag.toFixed(2)}</span>
          </div>
        </div>
        
        <div class="item total" style="font-size: 16px; margin: 10px 0;">
          <span>TOTAAL INCL. BTW</span>
          <span>€${order.total?.toFixed(2) || '0.00'}</span>
        </div>
        
        <div class="divider"></div>
        
        <!-- BETALING -->
        <div class="center">
          ${order.payment_method ? `Betaalmethode: ${paymentMethodLabels[order.payment_method] || order.payment_method}<br>` : ''}
          ${order.payment_status?.toLowerCase() === 'paid' ? '<strong>✓ BETAALD</strong>' : 'Betaling: In afwachting'}
        </div>
        
        ${order.customer_notes ? `
          <div class="divider"></div>
          <div class="small"><strong>Opmerking:</strong> ${order.customer_notes}</div>
        ` : ''}
        
        <div class="divider-double"></div>
        
        <!-- FOOTER -->
        <div class="center small">
          Bedankt voor uw bestelling!<br>
          ${tenantSettings?.website ? tenantSettings.website : ''}<br>
          <br>
          Dit is uw kassabon.<br>
          Bewaar deze bon als bewijs van aankoop.
        </div>
        
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `
    printWindow.document.write(html)
    printWindow.document.close()
  }

  const formatTime = (dateString?: string) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / (1000 * 60))
    
    if (minutes < 1) return t('ordersPage.justNow')
    if (minutes < 60) return `${minutes} ${t('ordersPage.minutesAgo')}`
    const hours = Math.floor(minutes / 60)
    if (hours < 24) return `${hours}${t('ordersPage.hoursAgo')}`
    return date.toLocaleDateString('nl-BE')
  }

  const filteredOrders = orders.filter(o => {
    const status = o.status?.toLowerCase()
    if (filter === 'active') return !['completed', 'cancelled'].includes(status)
    if (filter === 'completed') return status === 'completed'
    return true
  })

  const activeCount = orders.filter(o => !['completed', 'cancelled'].includes(o.status?.toLowerCase())).length
  const newCount = orders.filter(o => o.status === 'new' || o.status === 'NEW').length

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-gray-500">{t('ordersPage.loading')}</p>
        </div>
      </div>
    )
  }

  // VERPLICHT ACTIVATIESCHERM VOOR iPAD/iOS - alleen EERSTE KEER per sessie
  if (!audioActivated) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <motion.button
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            // Activeer shared audio system (VEREIST voor iOS/Safari)
            activateAudio()
            setAudioActivated(true)
            setSoundEnabled(true)
            playOrderNotificationSound()
          }}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-3xl p-12 text-center shadow-2xl max-w-lg"
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="text-7xl mb-6"
          >
            🔔
          </motion.div>
          <h1 className="text-2xl font-bold mb-4">Tik om geluid te activeren</h1>
          <p className="text-lg opacity-80 mb-6">
            Je ontvangt meldingen bij nieuwe bestellingen
          </p>
          <div className="bg-white/20 rounded-xl px-6 py-3 inline-block">
            <span className="text-lg font-bold">▶️ START</span>
          </div>
        </motion.button>
      </div>
    )
  }

  // Kitchen Mode - Fullscreen tablet view
  if (kitchenMode) {
    return (
      <div className="fixed inset-0 bg-gray-900 z-50 overflow-auto">
        {/* Header */}
        <div className="bg-gray-800 p-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-white">🍳 {t('ordersPage.kitchen.title')}</h1>
            {newCount > 0 && (
              <motion.span
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ repeat: Infinity, duration: 1 }}
                className="bg-red-500 text-white text-xl font-bold px-4 py-2 rounded-full"
              >
                {newCount} {t('ordersPage.kitchen.newAlert')}
              </motion.span>
            )}
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => soundEnabled ? disableSound() : enableSound()}
              className={`p-4 rounded-xl text-2xl ${soundEnabled && isAudioReady() ? 'bg-green-500' : 'bg-gray-600'}`}
            >
              {soundEnabled && isAudioReady() ? '🔔' : '🔕'}
            </button>
            <button
              onClick={() => setKitchenMode(false)}
              className="p-4 bg-gray-600 hover:bg-gray-500 text-white rounded-xl text-xl"
            >
              ✕ {t('ordersPage.kitchen.close')}
            </button>
          </div>
        </div>

        {/* Orders Grid */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.map((order) => {
            const items = parseItems(order)
            const status = order.status?.toLowerCase() || 'new'
            const config = statusConfig[status] || statusConfig.new
            
            return (
              <motion.div
                key={order.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-2xl p-6 ${
                  status === 'new' 
                    ? 'bg-blue-500 text-white ring-4 ring-yellow-400' 
                    : status === 'confirmed'
                    ? 'bg-yellow-500 text-gray-900'
                    : status === 'preparing'
                    ? 'bg-blue-600 text-white'
                    : status === 'ready'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-700 text-white'
                }`}
              >
                {/* Order Header */}
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-3xl font-black">#{order.order_number || order.id?.slice(0, 4)}</p>
                    <p className="text-lg opacity-80">{formatTime(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">€{order.total?.toFixed(2)}</p>
                    <p className="text-lg">
                      {order.order_type === 'pickup' || order.order_type === 'PICKUP' ? `🛍️ ${t('ordersPage.orderType.pickup')}` : `🚗 ${t('ordersPage.orderType.delivery')}`}
                    </p>
                  </div>
                </div>

                {/* Payment Status */}
                {order.payment_status && (
                  <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-3 ${
                    order.payment_status.toLowerCase() === 'paid' ? 'bg-green-600 text-white' : 'bg-yellow-600 text-white'
                  }`}>
                    {paymentStatusConfig[order.payment_status]?.label || order.payment_status}
                  </div>
                )}

                {/* Customer */}
                <div className="mb-4 p-3 bg-black/20 rounded-xl">
                  <p className="text-xl font-bold">{order.customer_name}</p>
                  {order.customer_phone && <p className="opacity-80">{order.customer_phone}</p>}
                  {(order.delivery_address || order.customer_address) && (
                    <p className="opacity-80 text-sm mt-1">📍 {order.delivery_address || order.customer_address}</p>
                  )}
                </div>

                {/* Items */}
                {items.length > 0 && (
                  <div className="mb-4 p-3 bg-black/20 rounded-xl">
                    <p className="font-bold mb-2">{t('ordersPage.kitchen.products')}:</p>
                    {items.map((item, i) => (
                      <div key={i} className="text-sm mb-1">
                        <div className="flex justify-between">
                          <span>{item.quantity}x {item.name || item.product_name}</span>
                          <span>€{((item.price || item.unit_price || 0) * item.quantity).toFixed(2)}</span>
                        </div>
                        {item.options && item.options.length > 0 && (
                          <div className="text-xs opacity-70 ml-4">+ {item.options.map(o => o.name).join(', ')}</div>
                        )}
                        {item.notes && (
                          <div className="text-xs text-orange-300 font-bold ml-4">⚠️ {item.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  {status === 'new' && (
                    <>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleConfirmOrder(order)}
                        disabled={updatingId === order.id}
                        className="p-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl font-bold"
                      >
                        ✓ {t('ordersPage.actions.approve').toUpperCase()}
                      </motion.button>
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setRejectingOrder(order)}
                        disabled={updatingId === order.id}
                        className="p-4 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xl font-bold"
                      >
                        ✕ {t('ordersPage.actions.reject').toUpperCase()}
                      </motion.button>
                    </>
                  )}
                  {status === 'confirmed' && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleUpdateStatus(order.id!, 'preparing')}
                      disabled={updatingId === order.id}
                      className="col-span-2 p-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xl font-bold"
                    >
                      👨‍🍳 {t('ordersPage.actions.startPreparation').toUpperCase()}
                    </motion.button>
                  )}
                  {status === 'preparing' && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleUpdateStatus(order.id!, 'ready')}
                      disabled={updatingId === order.id}
                      className="col-span-2 p-4 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xl font-bold"
                    >
                      ✅ {t('ordersPage.actions.ready').toUpperCase()}
                    </motion.button>
                  )}
                  {status === 'ready' && (
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleUpdateStatus(order.id!, 'completed')}
                      disabled={updatingId === order.id}
                      className="col-span-2 p-4 bg-gray-600 hover:bg-gray-700 text-white rounded-xl text-xl font-bold"
                    >
                      ✔️ {t('ordersPage.actions.complete').toUpperCase()}
                    </motion.button>
                  )}
                  {/* Print button */}
                  <button
                    onClick={() => printReceipt(order)}
                    className="col-span-2 p-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    🖨️ {t('ordersPage.actions.printReceipt').toUpperCase()}
                  </button>
                </div>
              </motion.div>
            )
          })}
        </div>

        {filteredOrders.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[60vh] text-white">
            <span className="text-8xl mb-4">✨</span>
            <h2 className="text-3xl font-bold">{t('ordersPage.noOrders')}</h2>
            <p className="text-xl text-gray-400 mt-2">{t('ordersPage.waitingForOrders')}</p>
          </div>
        )}
      </div>
    )
  }

  // Normal Mode
  return (
    <div className="max-w-5xl mx-auto">
      {/* Sound status indicator - shows green when active */}

      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('ordersPage.title')}</h1>
          <p className="text-gray-500">
            {activeCount} {t('ordersPage.active')}
            {newCount > 0 && <span className="text-red-500 font-bold ml-2">• {newCount} {t('ordersPage.new')}!</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Notification - altijd aan */}
          <button
            onClick={requestNotificationPermission}
            className="p-2 rounded-xl transition-colors bg-green-100 text-green-600"
            title="Browser notificaties (altijd aan)"
          >
            🔔
          </button>
          
          {/* Sound - altijd aan */}
          <button
            onClick={enableSound}
            className="p-2 rounded-xl transition-colors bg-green-100 text-green-600"
            title="Geluid (altijd aan)"
          >
            🔊
          </button>

          {/* Kitchen mode */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { enableSound(); setKitchenMode(true); }}
            className="px-4 py-2 bg-gray-900 text-white rounded-xl font-medium flex items-center gap-2"
          >
            🍳 {t('ordersPage.kitchenMode')}
          </motion.button>

          {/* Refresh */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadOrders}
            className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl"
            title={t('ordersPage.refresh')}
          >
            🔄
          </motion.button>

          {/* Filter */}
          <div className="flex bg-gray-100 rounded-xl p-1">
            {(['active', 'completed', 'all'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === f ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                {t(`ordersPage.filter.${f}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* New orders alert */}
      {newCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6 p-4 bg-red-500 text-white rounded-2xl flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <motion.span
              animate={{ scale: [1, 1.3, 1] }}
              transition={{ repeat: Infinity, duration: 0.8 }}
              className="text-3xl"
            >
              🔔
            </motion.span>
            <div>
              <p className="font-bold text-lg">{newCount} {newCount > 1 ? t('ordersPage.newOrdersPlural') : t('ordersPage.newOrders')}!</p>
              <p className="text-white/80">{t('ordersPage.clickToConfirm')}</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Orders */}
      <div className="space-y-4">
        <AnimatePresence>
          {filteredOrders.map((order, index) => {
            const items = parseItems(order)
            const status = order.status?.toLowerCase() || 'new'
            const config = statusConfig[status] || statusConfig.new
            
            return (
              <motion.div
                key={order.id}
                layout
                className={`bg-white rounded-2xl p-6 shadow-sm ${
                  status === 'new' ? 'ring-2 ring-red-500 animate-pulse' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xl font-bold text-gray-900">#{order.order_number || order.id?.slice(0, 8)}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
                        {config.label}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${order.order_type === 'pickup' || order.order_type === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                        {order.order_type === 'pickup' || order.order_type === 'PICKUP' ? `🛍️ ${t('ordersPage.orderType.pickup')}` : `🚗 ${t('ordersPage.orderType.delivery')}`}
                      </span>
                      {/* Payment Status Badge */}
                      {order.payment_status && (
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          paymentStatusConfig[order.payment_status]?.bg || 'bg-gray-100'
                        } ${paymentStatusConfig[order.payment_status]?.text || 'text-gray-700'}`}>
                          {paymentStatusConfig[order.payment_status]?.label || order.payment_status}
                        </span>
                      )}
                      {/* Payment Method */}
                      {order.payment_method && (
                        <span className="px-2 py-1 rounded text-xs bg-gray-100 text-gray-600">
                          {paymentMethodLabels[order.payment_method] || order.payment_method}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-500 mt-1">{formatTime(order.created_at)}</p>
                  </div>
                  <p className="text-2xl font-bold text-blue-600">€{order.total?.toFixed(2) || '0.00'}</p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">{t('ordersPage.customer')}</p>
                    <p className="font-semibold text-gray-900">{order.customer_name}</p>
                    {order.customer_phone && (
                      <p className="text-gray-600">📞 {order.customer_phone}</p>
                    )}
                    {order.customer_email && (
                      <p className="text-gray-600">
                        <a href={`mailto:${order.customer_email}`} className="hover:text-blue-600">✉️ {order.customer_email}</a>
                      </p>
                    )}
                    {(order.delivery_address || order.customer_address) && (
                      <p className="text-gray-600 text-sm mt-1">📍 {order.delivery_address || order.customer_address}</p>
                    )}
                    {order.customer_notes && (
                      <p className="text-gray-500 text-sm mt-2 italic">💬 {order.customer_notes}</p>
                    )}
                  </div>

                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-sm text-gray-500 mb-1">{t('ordersPage.order')} ({items.length} {t('ordersPage.items')})</p>
                    {items.length > 0 ? (
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {items.map((item, i) => (
                          <div key={i} className="text-sm text-gray-700">
                            <div className="flex justify-between">
                              <span>{item.quantity}x {item.name || item.product_name}</span>
                              <span>€{((item.price || item.unit_price || 0) * item.quantity).toFixed(2)}</span>
                            </div>
                            {item.options && item.options.length > 0 && (
                              <div className="text-xs text-gray-500 ml-4">+ {item.options.map(o => o.name).join(', ')}</div>
                            )}
                            {item.notes && (
                              <div className="text-xs text-orange-500 font-medium ml-4">⚠️ {item.notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic">{t('ordersPage.noItemsAvailable')}</p>
                    )}
                  </div>
                </div>

                {/* Totals summary */}
                <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-4 p-3 bg-gray-50 rounded-xl">
                  <span>{t('ordersPage.subtotal')}: €{order.subtotal?.toFixed(2) || '0.00'}</span>
                  {(order.delivery_fee || 0) > 0 && <span>{t('ordersPage.deliveryFee')}: €{order.delivery_fee?.toFixed(2)}</span>}
                  {(order.discount_amount || 0) > 0 && <span className="text-green-600">{t('ordersPage.discount')}: -€{order.discount_amount?.toFixed(2)}</span>}
                  {(order.tax || 0) > 0 && <span>{t('ordersPage.vat')}: €{order.tax?.toFixed(2)}</span>}
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-wrap">
                  {status === 'new' && (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleConfirmOrder(order)}
                        disabled={updatingId === order.id}
                        className="flex-1 min-w-[140px] bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white font-medium py-3 rounded-xl transition-colors"
                      >
                        ✓ {t('ordersPage.actions.approve')}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setRejectingOrder(order)}
                        disabled={updatingId === order.id}
                        className="px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium rounded-xl transition-colors"
                      >
                        ✕ {t('ordersPage.actions.reject')}
                      </motion.button>
                    </>
                  )}
                  {status.toLowerCase() !== 'new' && !['completed', 'cancelled'].includes(status.toLowerCase()) && config.next && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleUpdateStatus(order.id!, config.next!)}
                      disabled={updatingId === order.id}
                      className="flex-1 min-w-[200px] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                    >
                      {updatingId === order.id ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                        />
                      ) : (
                        <>
                          {status.toLowerCase() === 'confirmed' && `👨‍🍳 ${t('ordersPage.actions.startPreparation')}`}
                          {status.toLowerCase() === 'preparing' && `✅ ${t('ordersPage.actions.ready')}`}
                          {status.toLowerCase() === 'ready' && `✔️ ${t('ordersPage.actions.complete')}`}
                        </>
                      )}
                    </motion.button>
                  )}
                  <button 
                    onClick={() => setSelectedOrder(order)}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    title={t('ordersPage.actions.details')}
                  >
                    📋
                  </button>
                  <button 
                    onClick={() => printReceipt(order)}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    title={t('ordersPage.actions.printReceipt')}
                  >
                    🖨️
                  </button>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {filteredOrders.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 bg-white rounded-2xl shadow-sm"
        >
          <span className="text-6xl mb-4 block">📦</span>
          <h3 className="text-xl font-bold text-gray-900 mb-2">{t('ordersPage.noOrders')}</h3>
          <p className="text-gray-500">{t('ordersPage.waitingForOrders')}</p>
        </motion.div>
      )}

      {/* Order Detail Modal - GROOT FORMAAT */}
      <AnimatePresence>
        {selectedOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="p-6 border-b bg-gray-50 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {t('ordersPage.order')} #{selectedOrder.order_number || selectedOrder.id?.slice(0, 8)}
                  </h2>
                  <p className="text-gray-500">{new Date(selectedOrder.created_at || '').toLocaleString('nl-BE')}</p>
                </div>
                <button 
                  onClick={() => setSelectedOrder(null)}
                  className="text-gray-400 hover:text-gray-600 text-3xl w-10 h-10 flex items-center justify-center hover:bg-gray-200 rounded-full"
                >
                  ×
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status & Payment Badges */}
                <div className="flex flex-wrap gap-2">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${statusConfig[selectedOrder.status]?.bg || 'bg-gray-100'} ${statusConfig[selectedOrder.status]?.text || 'text-gray-700'}`}>
                    {statusConfig[selectedOrder.status]?.label || selectedOrder.status}
                  </span>
                  <span className={`px-4 py-2 rounded-full text-sm font-medium ${selectedOrder.order_type === 'pickup' || selectedOrder.order_type === 'PICKUP' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                    {selectedOrder.order_type === 'pickup' || selectedOrder.order_type === 'PICKUP' ? `🛍️ ${t('ordersPage.orderType.pickup')}` : `🚗 ${t('ordersPage.orderType.delivery')}`}
                  </span>
                  {selectedOrder.payment_status && (
                    <span className={`px-4 py-2 rounded-full text-sm font-bold ${paymentStatusConfig[selectedOrder.payment_status]?.bg || 'bg-gray-100'} ${paymentStatusConfig[selectedOrder.payment_status]?.text || 'text-gray-700'}`}>
                      {paymentStatusConfig[selectedOrder.payment_status]?.label || selectedOrder.payment_status}
                    </span>
                  )}
                  {selectedOrder.payment_method && (
                    <span className="px-4 py-2 rounded-full text-sm bg-gray-100 text-gray-600">
                      {paymentMethodLabels[selectedOrder.payment_method] || selectedOrder.payment_method}
                    </span>
                  )}
                </div>

                {/* Customer Info */}
                <div className="bg-blue-50 rounded-xl p-5">
                  <p className="text-sm text-blue-600 font-medium mb-2">👤 {t('ordersPage.customerDetails')}</p>
                  <p className="text-xl font-bold text-gray-900">{selectedOrder.customer_name}</p>
                  {selectedOrder.customer_phone && (
                    <p className="text-gray-600 text-lg">📞 {selectedOrder.customer_phone}</p>
                  )}
                  {selectedOrder.customer_email && <p className="text-gray-600">✉️ {selectedOrder.customer_email}</p>}
                  {(selectedOrder.delivery_address || selectedOrder.customer_address) && (
                    <p className="text-gray-600 mt-2">📍 {selectedOrder.delivery_address || selectedOrder.customer_address}</p>
                  )}
                  {(selectedOrder.delivery_notes || selectedOrder.customer_notes) && (
                    <p className="text-gray-500 text-sm mt-2 italic bg-white p-3 rounded-lg">
                      💬 "{selectedOrder.delivery_notes || selectedOrder.customer_notes}"
                    </p>
                  )}
                </div>

                {/* Items */}
                <div className="bg-blue-50 rounded-xl p-5">
                  <p className="text-sm text-blue-600 font-medium mb-3">🍟 {t('ordersPage.orderedProducts')}</p>
                  {(() => {
                    const items = parseItems(selectedOrder)
                    return items.length > 0 ? (
                      <div className="space-y-3">
                        {items.map((item, i) => (
                          <div key={i} className="bg-white p-3 rounded-lg">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-bold text-blue-600 mr-2">{item.quantity}x</span>
                                <span className="text-gray-900 font-medium">{item.name || item.product_name}</span>
                              </div>
                              <span className="font-bold text-gray-900">€{((item.price || item.unit_price || 0) * item.quantity).toFixed(2)}</span>
                            </div>
                            {item.options && item.options.length > 0 && (
                              <div className="text-sm text-gray-500 ml-8 mt-1">+ {item.options.map(o => o.name).join(', ')}</div>
                            )}
                            {item.notes && (
                              <div className="text-sm text-orange-500 font-bold ml-8 mt-1">⚠️ {item.notes}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 italic">{t('ordersPage.noItemsAvailable')}</p>
                    )
                  })()}
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-gray-600 text-lg">
                    <span>{t('ordersPage.subtotal')}</span>
                    <span>€{selectedOrder.subtotal?.toFixed(2) || '0.00'}</span>
                  </div>
                  {(selectedOrder.delivery_fee || 0) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>{t('ordersPage.deliveryFee')}</span>
                      <span>€{selectedOrder.delivery_fee?.toFixed(2)}</span>
                    </div>
                  )}
                  {(selectedOrder.tax || 0) > 0 && (
                    <div className="flex justify-between text-gray-600">
                      <span>{t('ordersPage.vat')}</span>
                      <span>€{selectedOrder.tax?.toFixed(2)}</span>
                    </div>
                  )}
                  {(selectedOrder.discount_amount || 0) > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>{t('ordersPage.discount')} {selectedOrder.discount_code && `(${selectedOrder.discount_code})`}</span>
                      <span>-€{selectedOrder.discount_amount?.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-2xl font-bold text-gray-900 pt-3 border-t">
                    <span>{t('ordersPage.total')}</span>
                    <span className="text-blue-600">€{selectedOrder.total?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="p-6 border-t bg-gray-50 flex gap-3 flex-wrap">
                <button 
                  onClick={() => setSelectedOrder(null)} 
                  className="flex-1 min-w-[120px] px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-100 font-medium"
                >
                  {t('ordersPage.actions.close')}
                </button>
                <button 
                  onClick={() => printReceipt(selectedOrder)}
                  className="px-6 py-3 bg-gray-900 hover:bg-gray-800 text-white rounded-xl font-medium flex items-center gap-2"
                >
                  🖨️ {t('ordersPage.actions.printReceipt')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Rejection Modal */}
      <AnimatePresence>
        {rejectingOrder && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setRejectingOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="p-6 border-b bg-red-50">
                <h2 className="text-2xl font-bold text-red-700">🚫 {t('ordersPage.rejection.title')}</h2>
                <p className="text-red-600 mt-1">#{rejectingOrder.order_number} - {rejectingOrder.customer_name}</p>
              </div>
              
              {/* Content */}
              <div className="p-6 space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-gray-900 mb-3">
                    {t('ordersPage.rejection.reasonLabel')} *
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {rejectionReasons.map(reason => (
                      <button
                        key={reason.value}
                        onClick={() => setRejectionReason(reason.value)}
                        className={`p-4 text-left rounded-xl border-2 transition-all ${
                          rejectionReason === reason.value
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {reason.label}
                      </button>
                    ))}
                  </div>
                </div>
                
                {rejectionReason === 'other' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('ordersPage.rejection.notesLabel')}
                    </label>
                    <textarea
                      value={rejectionNotes}
                      onChange={(e) => setRejectionNotes(e.target.value)}
                      placeholder={t('ordersPage.rejection.notesPlaceholder')}
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    />
                  </div>
                )}
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                  <p className="text-yellow-800 text-sm">
                    ⚠️ {t('ordersPage.rejection.customerNotified')}
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="p-6 border-t bg-gray-50 flex gap-3">
                <button
                  onClick={() => {
                    setRejectingOrder(null)
                    setRejectionReason('')
                    setRejectionNotes('')
                  }}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl hover:bg-gray-100 font-medium"
                >
                  {t('ordersPage.rejection.cancel')}
                </button>
                <button
                  onClick={handleRejectOrder}
                  disabled={!rejectionReason || updatingId === rejectingOrder.id}
                  className="flex-1 px-4 py-3 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white rounded-xl font-medium flex items-center justify-center gap-2"
                >
                  {updatingId === rejectingOrder.id ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                  ) : (
                    `🚫 ${t('ordersPage.rejection.confirmReject')}`
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Fullscreen Orange Alert for New Orders */}
      <AnimatePresence>
        {showNewOrderAlert && hasNewOrders && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={dismissAlert}
            className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'rgba(249, 115, 22, 0.95)' }}
          >
            <motion.div
              animate={{ 
                scale: [1, 1.05, 1],
                opacity: [1, 0.8, 1]
              }}
              transition={{ 
                repeat: Infinity, 
                duration: 0.8,
                ease: "easeInOut"
              }}
              className="text-center text-white p-8"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="text-9xl mb-8"
              >
                🔔
              </motion.div>
              <h1 className="text-6xl md:text-8xl font-black mb-4">
                {t('ordersPage.newOrderAlert.title')}
              </h1>
              <p className="text-2xl md:text-3xl opacity-90 mb-8">
                {newCount} {newCount > 1 ? t('ordersPage.newOrdersPlural') : t('ordersPage.newOrders')} {newCount === 1 ? t('ordersPage.newOrderAlert.waitingApproval') : t('ordersPage.newOrderAlert.waitingApprovalPlural')}
              </p>
              <div className="bg-white/20 rounded-2xl px-8 py-4 inline-block">
                <p className="text-xl font-medium">
                  {t('ordersPage.newOrderAlert.tapToClose')}
                </p>
                <p className="text-lg opacity-75 mt-1">
                  {t('ordersPage.newOrderAlert.soundStopsAfter')}
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
