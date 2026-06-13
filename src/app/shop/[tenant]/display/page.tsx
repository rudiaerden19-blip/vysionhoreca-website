'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getTenantSettings, updateOrderStatus, TenantSettings, approveWebshopOrder, completeWebshopOrder, isWebshopOrder } from '@/lib/admin-api'
import { formatOrderScheduleDetail } from '@/lib/format-order-schedule'
import { useLanguage } from '@/i18n'
import Link from 'next/link'
import { LocaleFlagEmoji } from '@/components/LocaleFlagEmoji'
import { useTenantModuleFlags } from '@/lib/use-tenant-modules'
import { getAdminKassaEntryHref } from '@/lib/tenant-modules'
import { shopDisplayOrderTypeKey, nlBrowserPrintOrderTypeBanner } from '@/lib/shop-display-order-type'
import { 
  activateAudioForIOS,
  prewarmAudio,
  playOrderNotification,
  isAudioActivatedThisSession,
  markAudioActivated
} from '@/lib/sounds'
import { sendToVysionPrintAgent } from '@/lib/vysion-print-agent-client'
import { getAuthHeaders } from '@/lib/auth-headers'
import { adminDineInSeatAuditLine, dineInSeatLineNl } from '@/lib/admin-order-display'
import {
  orderItemDisplayName,
  orderItemDisplayOptionLines,
  orderItemLineTotalEur,
} from '@/lib/order-items-display'
import {
  KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
  kassaPosButtonClass,
} from '@/lib/kassa-pos-surface'
import { KitchenStyleOrderCard } from '@/components/shop-display/KitchenStyleOrderCard'
import { KassaIconClose } from '@/lib/kassa-ui-icons'

interface Order {
  id: string
  order_number: string
  customer_name: string
  customer_phone?: string
  customer_email?: string
  delivery_address?: string
  order_type: string
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
  scheduled_date?: string
  scheduled_time?: string
  rejection_reason?: string
  rejection_notes?: string
  table_number?: string | number | null
  floor_plan_zone?: string | null
}

interface BusinessSettings {
  business_name: string
  primary_color: string
  address?: string
  phone?: string
  email?: string
  postal_code?: string
  city?: string
  btw_number?: string
  btw_percentage?: number
}

interface Reservation {
  id: string
  customer_name: string
  customer_email?: string
  customer_phone?: string
  reservation_date: string
  reservation_time: string
  party_size: number
  notes?: string
  status: 'pending' |  'confirmed' |  'cancelled' |  'completed'
  created_at: string
}

export default function ShopDisplayPage({ params }: { params: { tenant: string } }) {
  const { t, locale, setLocale, locales, localeNames } = useLanguage()
  const { moduleAccess, enabledModulesJson, loading: modulesLoading } = useTenantModuleFlags(params.tenant)
  const adminBase = `/shop/${params.tenant}/admin`
  const kassaEntryHref =
    !modulesLoading && moduleAccess.kassa
      ? getAdminKassaEntryHref(params.tenant, moduleAccess, enabledModulesJson) ?? `${adminBase}/kassa`
      : null
  
  // Translation helper for shopDisplay keys
  const tx = (key: string) => t(`shopDisplay.${key}`)
  const orderTypeLabel = (orderType: string) => tx(shopDisplayOrderTypeKey(orderType))
  
  // Rejection reasons with translated labels
  const REJECTION_REASONS = [
    { id: 'busy', label: tx('reasonBusy'), icon: ''},
    { id: 'closed', label: tx('reasonClosed'), icon: ''},
    { id: 'no_stock', label: tx('reasonNoStock'), icon: ''},
    { id: 'technical', label: tx('reasonTechnical'), icon: ''},
    { id: 'address', label: tx('reasonAddress'), icon: ''},
    { id: 'other', label: tx('reasonOther'), icon: ''},
  ]
  
  const [orders, setOrders] = useState<Order[]>([])
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [showRejectModal, setShowRejectModal] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [rejectNotes, setRejectNotes] = useState('')
  const [business, setBusiness] = useState<BusinessSettings | null>(null)
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoadDone, setInitialLoadDone] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [soundEnabled, setSoundEnabled] = useState(true)
  // Check if already activated this session - skip activation screen if so
  const [audioActivated, setAudioActivated] = useState(() => isAudioActivatedThisSession(params.tenant))
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'active' |  'completed'>('active')
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [showReservationsModal, setShowReservationsModal] = useState(false)
  const [displayLangOpen, setDisplayLangOpen] = useState(false)
  const displayLangRef = useRef<HTMLDivElement>(null)
  const alertIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // CRITICAL: Track ALL known order IDs to prevent false alerts
  const knownOrderIdsRef = useRef<Set<string>>(new Set())
  // Track which emails have been sent (persisted in sessionStorage)
  const sentEmailsRef = useRef<Set<string>>(new Set())

  // Initialize sent emails from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(`sent_emails_${params.tenant}`)
    if (stored) {
      try {
        sentEmailsRef.current = new Set(JSON.parse(stored))
      } catch (e) {
        sentEmailsRef.current = new Set()
      }
    }
  }, [params.tenant])

  useEffect(() => {
    function handlePointerOutside(e: PointerEvent) {
      if (displayLangRef.current && !displayLangRef.current.contains(e.target as Node)) {
        setDisplayLangOpen(false)
      }
    }
    document.addEventListener('pointerdown', handlePointerOutside, true)
    return () => document.removeEventListener('pointerdown', handlePointerOutside, true)
  }, [])

  // GELUID ALTIJD AAN bij laden + prewarm audio
  useEffect(() => {
    setSoundEnabled(true)
    
    // Prewarm audio system bij laden (nieuwe robuuste methode)
    if (audioActivated) {
      prewarmAudio()
    }
  }, [params.tenant, audioActivated])

  // Load pending reservations
  useEffect(() => {
    async function loadReservations() {
      const { data } = await supabase
        .from('reservations')
        .select('*')
        .eq('tenant_slug', params.tenant)
        .eq('status', 'pending')
        .order('reservation_date', { ascending: true })
        .order('reservation_time', { ascending: true })
      
      if (data) {
        setReservations(data)
      }
    }
    loadReservations()
    
    // Poll every 30 seconds
    const interval = setInterval(loadReservations, 30000)
    return () => clearInterval(interval)
  }, [params.tenant])

  // Update reservation status
  async function updateReservationStatus(id: string, status: 'confirmed' |  'cancelled') {
    const { error } = await supabase
      .from('reservations')
      .update({ status })
      .eq('id', id)
      .eq('tenant_slug', params.tenant)
    
    if (!error) {
      setReservations(prev => prev.filter(r => r.id !== id))
    }
  }

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  // Load initial data - CRITICAL: Initialize known IDs BEFORE polling starts
  useEffect(() => {
    loadData()
    const savedSound = localStorage.getItem(`shop_display_sound_${params.tenant}`)
    if (savedSound === 'true') {
      setSoundEnabled(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant])


  // Continuous alert sound for new orders - plays every 3 seconds
  useEffect(() => {
    // ALTIJD geluid bij nieuwe bestellingen
    // KRITIEK: Altijd proberen geluid te spelen
    if (newOrderIds.size > 0) {
      // Play immediately
      playOrderNotification()
      
      // Then repeat every 3 seconds
      alertIntervalRef.current = setInterval(() => {
        playOrderNotification()
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
  }, [newOrderIds.size])

  // MAIN POLLING - Check for new orders every 3 seconds
  // Only starts AFTER initial load is complete
  useEffect(() => {
    if (!supabase || !initialLoadDone) return

    const pollOrders = async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('*')
          .eq('tenant_slug', params.tenant)
          .order('created_at', { ascending: false })
          .limit(100)

        if (data) {
          const parsed = data.map(order => ({
            ...order,
            items: typeof order.items === 'string'? JSON.parse(order.items) : order.items || []
          }))
          const webshopOnly = parsed.filter((o) => isWebshopOrder(o))
          
          // Find TRULY new orders (not in known set AND status is 'new')
          const trulyNewOrders = webshopOnly.filter(o => 
            !knownOrderIdsRef.current.has(o.id) && 
            o.status.toLowerCase() === 'new'
          )
          
          // Add ALL current order IDs to known set
          parsed.forEach(o => knownOrderIdsRef.current.add(o.id))
          
          // Alert for truly new orders
          if (trulyNewOrders.length > 0) {
            console.log(` ${trulyNewOrders.length} NIEUWE bestelling(en) gedetecteerd!`)
            trulyNewOrders.forEach(order => {
              setNewOrderIds(prev => new Set([...prev, order.id]))
            })
            // ALTIJD geluid spelen bij nieuwe bestelling
            playOrderNotification()
          }
          
          setOrders(webshopOnly)
        }
      } catch (error) {
        console.error('Polling error:', error)
      }
    }

    // Poll every 3 seconds
    pollingIntervalRef.current = setInterval(pollOrders, 3000)

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [params.tenant, initialLoadDone])

  async function loadData() {
    try {
      const settings = await getTenantSettings(params.tenant)
      if (settings) {
        setTenantSettings(settings)
        setBusiness({
          business_name: settings.business_name,
          primary_color: settings.primary_color || '#FF6B35',
          address: settings.address,
          phone: settings.phone,
          email: settings.email,
          postal_code: settings.postal_code,
          city: settings.city,
          btw_number: settings.btw_number,
          btw_percentage: settings.btw_percentage,
        })
      }

      if (!supabase) {
        setLoading(false)
        setInitialLoadDone(true)
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
          items: typeof order.items === 'string'? JSON.parse(order.items) : order.items || []
        }))
        const webshopOnly = parsed.filter((o) => isWebshopOrder(o))
        setOrders(webshopOnly)
        
        // CRITICAL: Initialize known IDs with ALL current orders
        // This prevents false "new order" alerts on page load
        parsed.forEach(o => knownOrderIdsRef.current.add(o.id))
        console.log(`Initial load: ${webshopOnly.length} webshop orders (${parsed.length} totaal), ${knownOrderIdsRef.current.size} known IDs`)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }

    setLoading(false)
    setInitialLoadDone(true)
  }

  function enableSound() {
    activateAudioForIOS()
    setSoundEnabled(true)
    playOrderNotification()
  }

  // EMAIL FUNCTION - BULLETPROOF with all required business info
  async function sendOrderStatusEmail(order: Order, status: string, rejectionReason?: string, rejectionNotes?: string) {
    // Skip if no email
    if (!order.customer_email) {
      console.log('No customer email - skipping notification')
      return
    }
    
    // Prevent duplicate emails using sessionStorage
    const emailKey = `${order.id}-${status}`
    if (sentEmailsRef.current.has(emailKey)) {
      console.log('Email already sent:', emailKey)
      return
    }
    
    // Mark as sent BEFORE trying (prevents duplicates on retry)
    sentEmailsRef.current.add(emailKey)
    
    // Persist to sessionStorage
    try {
      sessionStorage.setItem(
        `sent_emails_${params.tenant}`, 
        JSON.stringify([...sentEmailsRef.current])
      )
    } catch (e) {
      // SessionStorage might be full or disabled
    }
    
    console.log(`Sending ${status} email to ${order.customer_email}...`)
    
    try {
      const response = await fetch('/api/send-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({
          tenantSlug: params.tenant,
          // Customer info
          customerEmail: order.customer_email,
          customerName: order.customer_name,
          customerPhone: order.customer_phone,
          customerAddress: order.delivery_address,
          // Order info
          orderNumber: order.order_number,
          orderType: order.order_type,
          status,
          // Business info (REQUIRED for Belgian law)
          businessName: tenantSettings?.business_name || business?.business_name || 'Restaurant',
          businessEmail: tenantSettings?.email || business?.email,
          businessPhone: tenantSettings?.phone || business?.phone,
          businessAddress: tenantSettings?.address || business?.address,
          businessPostalCode: tenantSettings?.postal_code || business?.postal_code,
          businessCity: tenantSettings?.city || business?.city,
          businessBtwNumber: tenantSettings?.btw_number || business?.btw_number,
          // Order details
          items: order.items,
          subtotal: order.subtotal,
          deliveryFee: order.delivery_fee,
          discount: order.discount_amount,
          total: order.total,
          btwPercentage: tenantSettings?.btw_percentage || 6,
          // Rejection info
          rejectionReason,
          rejectionNotes,
        }),
      })
      
      if (response.ok) {
        console.log(`Email sent successfully to ${order.customer_email}`)
      } else {
        const errorText = await response.text()
        console.error(`Email API error: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('Failed to send email:', error)
      // Don't remove from sentEmailsRef - we don't want to spam on retry
    }
  }

  async function handleApprove(order: Order) {
    const web = isWebshopOrder(order)
    if (web) {
      const ok = await approveWebshopOrder(params.tenant, order.id)
      if (!ok) return
    } else {
      await updateOrderStatus(params.tenant, order.id, 'confirmed')
    }
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
    await updateOrderStatus(params.tenant, order.id, 'rejected', rejectReason, rejectNotes)
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
    if (isWebshopOrder(order)) {
      await completeWebshopOrder(params.tenant, order.id)
    } else {
      await updateOrderStatus(params.tenant, order.id, 'completed')
    }
    setSelectedOrder(null)
    loadData()
  }

  async function handleCompleteAll() {
    await Promise.all(
      activeOrders.map(async (o) =>
        isWebshopOrder(o)
          ? completeWebshopOrder(params.tenant, o.id)
          : updateOrderStatus(params.tenant, o.id, 'completed')
      )
    )
    loadData()
  }

  async function handleReady(order: Order) {
    await updateOrderStatus(params.tenant, order.id, 'ready')
    setSelectedOrder(null)
  }

  // Browser print (thermal/USB bridge verwijderd)
  function browserPrint(order: Order, type: 'customer' |  'kitchen') {
    const printWindow = window.open('', '_blank', 'width=320,height=700')
    if (!printWindow) return

    const itemsHtml = order.items?.map((item: unknown) => {
      const qty = Number((item as { quantity?: unknown }).quantity) || 1
      const label = orderItemDisplayName(item)
      const lineTotal = orderItemLineTotalEur(item)
      const optLines = orderItemDisplayOptionLines(item)
      return `
      <tr>
        <td style="padding: 5px 0; font-size: ${type === 'kitchen'? '16px': '14px'};">
          <strong>${qty}x</strong> ${label}
          ${optLines.map((line) => `<br><span style="color: #666; padding-left: 15px; font-size: 12px;">+ ${line}</span>`).join('')}
          ${(item as { notes?: unknown }).notes ? `<br><span style="color: #666; font-style: italic; padding-left: 15px; font-size: 12px;"> ${String((item as { notes?: unknown }).notes)}</span>`: ''}
        </td>
        <td style="text-align: right; padding: 5px 0; font-size: ${type === 'kitchen'? '16px': '14px'}; vertical-align: top;">
          €${lineTotal.toFixed(2)}
        </td>
      </tr>
    `
    }).join('') || ''

    const nlDineInSeat = dineInSeatLineNl(order.order_type, order.table_number, order.floor_plan_zone)

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
            ${business?.address ? `<div style="font-size: 11px;">${business.address}</div>`: ''}
            ${business?.phone ? `<div style="font-size: 11px;">Tel: ${business.phone}</div>`: ''}
          </div>
          
          <div class="divider"></div>
          
          <div class="order-number">#${order.order_number}</div>
          <div class="order-type">${nlBrowserPrintOrderTypeBanner(order.order_type)}</div>
          ${nlDineInSeat ? `<div style="text-align:center;font-weight:bold;font-size:13px;margin:6px 0;">${nlDineInSeat}</div>`: ''}
          ${(order.scheduled_date || order.scheduled_time) ? `
          <div style="margin: 8px 0; padding: 6px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; text-align: center; font-weight: bold; font-size: 13px;">
             ${order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit', year: 'numeric'}) : ''}${order.scheduled_time ? 'om '+ order.scheduled_time : ''}
          </div>`: ''}
          
          <div class="order-info">
            <strong>${order.customer_name}</strong><br>
            ${order.customer_phone ? `Tel: ${order.customer_phone}<br>`: ''}
            ${order.delivery_address ? `Adres: ${order.delivery_address}<br>`: ''}
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
            ${order.subtotal ? `<tr><td>Subtotaal</td><td style="text-align: right;">€${order.subtotal.toFixed(2)}</td></tr>`: ''}
            ${order.delivery_fee ? `<tr><td>Bezorgkosten</td><td style="text-align: right;">€${order.delivery_fee.toFixed(2)}</td></tr>`: ''}
            ${order.discount_amount ? `<tr><td>Korting</td><td style="text-align: right;">-€${order.discount_amount.toFixed(2)}</td></tr>`: ''}
            <tr class="total-row">
              <td style="padding-top: 5px;">TOTAAL</td>
              <td style="text-align: right; padding-top: 5px;">€${order.total?.toFixed(2)}</td>
            </tr>
          </table>

          <div class="divider"></div>

          <div style="text-align: center; margin: 10px 0;">
            ${order.payment_status === 'paid'? 'BETAALD': 'NOG TE BETALEN'}
            ${order.payment_method ? `(${order.payment_method})`: ''}
          </div>

          ${order.customer_notes ? `
            <div class="notes">
              <strong>Opmerkingen:</strong><br>
              ${order.customer_notes}
            </div>
          `: ''}

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
            <div class="order-type">${nlBrowserPrintOrderTypeBanner(order.order_type)}</div>
            ${nlDineInSeat ? `<div style="margin: 8px 0; padding: 6px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 4px; text-align: center; font-weight: bold; font-size: 15px;">${nlDineInSeat}</div>`: ''}
            ${(order.scheduled_date || order.scheduled_time) ? `
            <div style="margin: 6px 0; padding: 5px; background: #000; color: #fff; font-size: 16px; font-weight: bold;">
               ${order.scheduled_date ? new Date(order.scheduled_date).toLocaleDateString('nl-BE', { day: '2-digit', month: '2-digit'}) : ''}${order.scheduled_time ? 'om '+ order.scheduled_time : ''}
            </div>`: ''}
            <div class="time">
              ${new Date(order.created_at).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit'})}
            </div>
            <div style="margin-top: 5px;"><strong>${order.customer_name}</strong></div>
          </div>

          <table>
            ${order.items?.map((item: unknown) => {
              const qty = Number((item as { quantity?: unknown }).quantity) || 1
              const label = orderItemDisplayName(item)
              const optLines = orderItemDisplayOptionLines(item)
              return `
              <tr>
                <td>
                  <strong style="font-size: 20px;">${qty}x</strong> 
                  <span style="font-size: 18px;">${label}</span>
                  ${optLines.map((line) => `<br><span style="padding-left: 20px;">+ ${line}</span>`).join('')}
                  ${(item as { notes?: unknown }).notes ? `<br><span style="font-style: italic; padding-left: 20px;"> ${String((item as { notes?: unknown }).notes)}</span>`: ''}
                </td>
              </tr>
            `
            }).join('') || ''}
          </table>

          ${order.customer_notes ? `
            <div class="notes">
              <strong> OPMERKINGEN:</strong><br>
              ${order.customer_notes}
            </div>
          `: ''}

          <div style="text-align: center; margin-top: 15px; font-size: 12px;">
            ${business?.business_name || ''} - ${new Date().toLocaleDateString('nl-BE')}
          </div>
        </body>
      </html>
    `

    printWindow.document.write(type === 'kitchen'? kitchenBon : customerBon)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
  }

  /** Probeer eerst de lokale Vysion Print Agent (ESC/POS bonprinter).
   *  Lukt niet (agent niet bereikbaar) → val terug op het browser-print venster. */
  async function printOrder(order: Order, type: 'customer' |  'kitchen'= 'customer') {
    const items = (order.items || []).map((it: unknown) => ({
      quantity: Number((it as { quantity?: unknown }).quantity) || 1,
      name: orderItemDisplayName(it) || 'Item',
      price: orderItemLineTotalEur(it),
      choices: orderItemDisplayOptionLines(it).map((name) => ({ name, price: 0 })),
      notes: (it as { notes?: unknown }).notes ? String((it as { notes?: unknown }).notes) : undefined,
    }))

    const requestedDateTime = (order as any).scheduled_date
      ? `${new Date((order as any).scheduled_date).toLocaleDateString('nl-BE')}${(order as any).scheduled_time ? ' '+ (order as any).scheduled_time : ''}`
      : ''

    const subtotal = items.reduce((s, it: any) => s + (Number(it.price) || 0), 0)
    const total = Number((order as any).total) || subtotal
    const vatRate = (business as any)?.btw_percentage ?? 6
    const tax = total > 0 ? total - total / (1 + vatRate / 100) : 0

    const printResult = await sendToVysionPrintAgent({
      winkelnaam: business?.business_name || '',
      bonInhoud: '',
      copies: 1,
      receiptMode: type === 'kitchen'? 'keuken': 'kassa',
      orderData: {
        orderNumber: order.order_number,
        orderType: order.order_type,
        tableNumber: null,
        items,
        subtotal: total - tax,
        tax,
        total,
        paymentMethod: (order as any).payment_method,
        ...(order.customer_name ? { customerName: order.customer_name } : {}),
        ...((order as any).customer_phone ? { customerPhone: (order as any).customer_phone } : {}),
        ...((order as any).customer_address || (order as any).delivery_address
          ? { customerAddress: (order as any).customer_address || (order as any).delivery_address }
          : {}),
        ...((order as any).customer_notes ? { customerNotes: (order as any).customer_notes } : {}),
        ...(requestedDateTime ? { requestedDateTime } : {}),
        isOnlineOrder: true,
      } as any,
      businessInfo: {
        name: business?.business_name,
        address: (business as any)?.address ?? undefined,
        postalCode: (business as any)?.postal_code ?? undefined,
        city: (business as any)?.city ?? undefined,
        phone: (business as any)?.phone ?? undefined,
        vatNumber: (business as any)?.btw_number ?? undefined,
        website: (business as any)?.website ?? undefined,
        vatRate,
      },
    })
    if (printResult.ok) return

    window.alert(
      `${t('kassaApp.printAgentFailedDebugTitle')}\n\n${printResult.error}\n\n${t('kassaApp.printAgentFailedDebugFooter')}`,
    )
    browserPrint(order, type)
  }

  /** Kaartkop + modal header: donkerblauw, witte tekst (zelfde op alle tenants) */
  const getStatusColor = (_status: string) =>
    'bg-[#0f2744] text-white border-b border-black/20'

  const getStatusLabel = (status: string) => {
    switch (status.toLowerCase()) {
      case 'new': return tx('statusNew')
      case 'confirmed': return tx('statusKitchen')
      case 'preparing': return tx('statusPreparing')
      case 'ready': return ` ${tx('statusReady')}`
      case 'completed': return tx('statusCompleted')
      case 'rejected': return tx('statusRejected')
      default: return status.toUpperCase()
    }
  }

  const getTimeSince = (dateString: string) => {
    const diff = Date.now() - new Date(dateString).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return tx('justNow')
    if (mins < 60) return `${mins} ${tx('min')}`
    return `${Math.floor(mins / 60)}u ${mins % 60}m`
  }

  const displayHeaderStatus = (status: string) => {
    const s = status.toLowerCase()
    if (s === 'new') return tx('statusNew')
    if (s === 'ready') return tx('statusReady')
    if (s === 'preparing') return tx('statusPreparing')
    if (s === 'open') return tx('statusNew')
    return tx('statusKitchen')
  }

  const orderTypeLabelShort = (order: Pick<Order, 'order_type'>) => {
    const key = shopDisplayOrderTypeKey(order.order_type)
    if (key === 'delivery') return ` ${tx('delivery')}`
    if (key === 'dineIn') return ` ${tx('dineIn')}`
    return ` ${tx('pickup')}`
  }

  const DISPLAY_POS_BTN = `${kassaPosButtonClass(false)} touch-manipulation font-semibold text-[#f0f0f0]`

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

  const selectedScheduleDetail = useMemo(
    () =>
      selectedOrder
        ? formatOrderScheduleDetail(
            { scheduled_date: selectedOrder.scheduled_date, scheduled_time: selectedOrder.scheduled_time },
            locale
          )
        : null,
    [selectedOrder, locale]
  )

  if (loading) {
    return (
      <div
        className={`min-h-[100dvh] w-full min-w-0 max-w-full ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} flex items-center justify-center text-white`}
        style={{
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full"
        />
      </div>
    )
  }


  return (
    <div
      className={`flex min-h-0 h-[100dvh] max-h-[100dvh] w-full min-w-0 max-w-full flex-col overflow-hidden ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS} text-[#f0f0f0]`}
      style={{
        width: '100%',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
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
              <p className="text-6xl font-black text-white text-center mb-2"> {tx('newOrder')}</p>
              <p className="text-3xl font-bold text-white/90 text-center">
                {newOrderIds.size === 1 ? tx('clickToView') : `${newOrderIds.size} ${tx('newOrders')}`}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="shrink-0 bg-gray-800 border-b border-gray-700 px-4 py-3 text-white">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {kassaEntryHref && (
              <Link
                href={kassaEntryHref}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-[#58CCFF] px-3 py-2 text-sm font-bold text-[#063042] shadow-md transition-colors hover:bg-[#47c6fe]"
              >
                <span className="text-base leading-none" aria-hidden>
                  
                </span>
                {t('adminLayout.pos')}
              </Link>
            )}
            <div
              className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-xl"
              style={{ backgroundColor: business?.primary_color }}
            >
              
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold sm:text-xl text-white">{tx('title')}</h1>
              <p className="truncate text-xs text-white/95 sm:text-sm">{business?.business_name}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            {/* Sound - ALTIJD AAN */}
            <span 
              onClick={enableSound}
              className="px-3 py-2 bg-green-500/20 text-green-400 rounded-xl flex items-center gap-2 text-sm cursor-pointer"
            >
               {tx('soundEnabled')}
            </span>

            {/* New order indicator */}
            {newOrderIds.size > 0 && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="px-4 py-2 bg-red-500 rounded-xl font-bold"
              >
                 {newOrderIds.size} {tx('new').toUpperCase()}
              </motion.div>
            )}

            {/* Stats */}
            <div className="flex gap-2">
              <span className="px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg text-sm font-bold">
                {activeOrders.filter(o => o.status.toLowerCase() === 'new').length} {tx('new')}
              </span>
              <span className="px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-bold">
                {activeOrders.filter(o => o.status.toLowerCase() === 'confirmed').length} {tx('kitchen')}
              </span>
              <span className="px-3 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-bold">
                {activeOrders.filter(o => o.status.toLowerCase() === 'ready').length} {tx('ready')}
              </span>
            </div>

            {/* Clock */}
            <div className="text-right">
              <p className="text-2xl font-mono font-bold">
                {currentTime.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit'})}
              </p>
            </div>

            {/* Reserveringen knop */}
            <button
              onClick={() => setShowReservationsModal(true)}
              className="px-3 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-bold text-white relative"
            >
               Reserveringen
              {reservations.length > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center animate-pulse">
                  {reservations.length}
                </span>
              )}
            </button>

            <Link
              href={`/keuken/${params.tenant}`}
              className="px-3 py-2 bg-orange-600 hover:bg-orange-500 rounded-xl text-sm font-bold text-white"
            >
               {tx('kitchen')}
            </Link>

            <div className="relative z-[130]" ref={displayLangRef}>
              <button
                type="button"
                onClick={() => setDisplayLangOpen((o) => !o)}
                className="inline-flex touch-manipulation items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-sm font-bold text-white hover:bg-white/20"
                title={t('languageSwitcher.selectLanguage')}
              >
                <LocaleFlagEmoji locale={locale} className="text-base text-white" />
                <svg
                  className={`size-3.5 shrink-0 transition-transform ${displayLangOpen ? 'rotate-180': ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {displayLangOpen && (
                <div className="absolute right-0 top-full z-[130] mt-1 max-h-80 min-w-[180px] overflow-y-auto rounded-xl border border-gray-600 bg-gray-900 shadow-xl">
                  {locales.map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => {
                        setLocale(lang)
                        setDisplayLangOpen(false)
                      }}
                      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors hover:bg-white/10 ${
                        locale === lang ? 'bg-white/15 font-semibold text-white': 'text-gray-100'
                      }`}
                    >
                      <LocaleFlagEmoji locale={lang} />
                      <span>{localeNames[lang]}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="shrink-0 border-b border-black px-4 py-2 flex gap-2 items-center">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors touch-manipulation ${
            activeTab === 'active'
              ? `${kassaPosButtonClass(true)}`
              : DISPLAY_POS_BTN
          }`}
        >
          {tx('active')} ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors touch-manipulation ${
            activeTab === 'completed'
              ? `${kassaPosButtonClass(true)}`
              : DISPLAY_POS_BTN
          }`}
        >
          {tx('completed')} ({completedOrders.length})
        </button>
        <button
          onClick={handleCompleteAll}
          className={`ml-auto px-4 py-2 font-bold transition-colors touch-manipulation ${DISPLAY_POS_BTN}`}
        >
           Alles afronden
        </button>
      </div>

      {/* Orders Grid — flex-1 + min-h-0: correcte scroll op iPad Safari / PWA (was 100vh) */}
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4">
        {activeTab === 'active'? (
          sortedActiveOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-white/70">
              <p className="text-2xl font-bold text-white">{tx('noActiveOrders')}</p>
              <p className="text-lg mt-2">{tx('ordersAppearHere')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
              {sortedActiveOrders.map((order) => (
                <KitchenStyleOrderCard
                  key={order.id}
                  order={order}
                  locale={locale}
                  isNew={newOrderIds.has(order.id)}
                  headerStatus={displayHeaderStatus(order.status)}
                  onlineOrderLabel={tx('onlineOrder')}
                  orderTypeLabel={orderTypeLabel}
                  orderTypeLabelShort={orderTypeLabelShort}
                  timeSince={getTimeSince(order.created_at)}
                  printLabel={t('kitchenDisplay.print')}
                  readyLabel={tx('ready')}
                  t={t}
                  onOpen={() => {
                    setSelectedOrder(order)
                    setNewOrderIds((prev) => {
                      const next = new Set(prev)
                      next.delete(order.id)
                      return next
                    })
                  }}
                  onPrint={(e) => {
                    e.stopPropagation()
                    void printOrder(order, 'customer')
                  }}
                  onReady={(e) => {
                    e.stopPropagation()
                    void handleReady(order)
                  }}
                />
              ))}
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {completedOrders.slice(0, 50).map((order) => (
              <div
                key={order.id}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:bg-gray-50 transition-colors shadow-sm"
                onClick={() => setSelectedOrder(order)}
              >
                <div className="bg-[#0f2744] text-white px-3 py-2.5 flex items-center justify-between border-b border-black/20">
                  <span className="font-bold tabular-nums">#{order.order_number}</span>
                  <span className="text-xs font-semibold uppercase tracking-wide text-white bg-white/15 px-2 py-1 rounded-md border border-white/25">
                    {order.status === 'completed'? tx('statusCompleted') : tx('statusRejected')}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-sm text-gray-600">{order.customer_name}</p>
                  <p className="text-sm text-gray-700 font-medium tabular-nums">€{order.total?.toFixed(2)}</p>
                </div>
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
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedOrder(null)}
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 shadow-2xl text-gray-900"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className={`${getStatusColor(selectedOrder.status)} p-6 rounded-t-2xl`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-3xl font-semibold tracking-tight text-white tabular-nums">#{selectedOrder.order_number}</h2>
                    <p className="text-sm font-medium text-white/85 mt-1 uppercase tracking-wide">{getStatusLabel(selectedOrder.status)}</p>
                    {isWebshopOrder(selectedOrder) ? (
                      <p className="text-sm text-white/90 mt-2 font-semibold leading-snug normal-case">
                        {tx('onlineOrder')} · {orderTypeLabel(selectedOrder.order_type)}
                        {selectedScheduleDetail ? `· ${selectedScheduleDetail}`: ''}
                      </p>
                    ) : (
                      <>
                        <p className="text-sm text-white/90 mt-2 font-semibold leading-snug normal-case">
                          {orderTypeLabel(selectedOrder.order_type)}
                          {selectedScheduleDetail ? `· ${selectedScheduleDetail}`: ''}
                        </p>
                        {(() => {
                          const seat = adminDineInSeatAuditLine(selectedOrder, t)
                          return seat ? (
                            <p className="text-sm text-white font-bold mt-2 bg-white/15 px-2 py-1 rounded-md inline-block">
                              {seat}
                            </p>
                          ) : null
                        })()}
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    className="w-11 h-11 shrink-0 rounded-full bg-white/15 flex items-center justify-center text-xl text-white hover:bg-white/25"
                    aria-label={tx('cancel')}
                  >
                    <KassaIconClose className="h-6 w-6 text-white" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                {selectedScheduleDetail && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{tx('desiredTimeLabel')}</p>
                    <p className="text-lg font-semibold text-gray-900 mt-1">{selectedScheduleDetail}</p>
                  </div>
                )}

                {/* Customer Info */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 text-sm">{tx('customer')}</p>
                      <p className="font-semibold text-lg">{selectedOrder.customer_name}</p>
                    </div>
                    {selectedOrder.customer_phone && (
                      <div>
                        <p className="text-gray-500 text-sm">{tx('phone')}</p>
                        <p className="font-semibold text-lg tabular-nums">{selectedOrder.customer_phone}</p>
                      </div>
                    )}
                  </div>
                  {selectedOrder.delivery_address && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="text-gray-500 text-sm">{tx('deliveryAddress')}</p>
                      <p className="font-medium text-gray-900">{selectedOrder.delivery_address}</p>
                    </div>
                  )}
                </div>

                {/* Online bestelling + betaling */}
                <div className="flex gap-3 mb-4">
                  <div className="flex-1 rounded-lg p-3 text-center border border-gray-200 bg-white">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{tx('onlineOrder')}</p>
                    <p className="font-semibold text-gray-900 mt-1 leading-snug">
                      {orderTypeLabel(selectedOrder.order_type)}
                    </p>
                  </div>
                  <div className="flex-1 rounded-lg p-3 text-center border border-gray-200 bg-white">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{tx('paymentHeading')}</p>
                    <p className="font-semibold text-gray-900 mt-1">{selectedOrder.payment_status === 'paid'? tx('paid') : tx('notPaid')}</p>
                  </div>
                </div>


                {/* Items */}
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                  <h3 className="font-semibold text-sm uppercase tracking-wide text-gray-600 mb-3">{tx('order')}</h3>
                  <div className="max-h-[min(56vh,26rem)] overflow-y-auto overscroll-y-contain space-y-2 pr-1 rounded-lg border border-gray-200 bg-white p-3 [scrollbar-gutter:stable]">
                    {selectedOrder.items?.map((item: unknown, i: number) => {
                      const qty = Number((item as { quantity?: unknown }).quantity) || 1
                      const label = orderItemDisplayName(item)
                      const lineTotal = orderItemLineTotalEur(item)
                      const optLines = orderItemDisplayOptionLines(item)
                      const noteRaw = (item as { notes?: unknown }).notes
                      const noteStr =
                        noteRaw != null && String(noteRaw).trim() !== ''? String(noteRaw) : ''
                      return (
                      <div key={i} className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0 gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <span className="w-9 h-9 bg-[#0f2744] text-white rounded-md flex items-center justify-center font-bold text-sm shrink-0">
                            {qty}
                          </span>
                          <div>
                            <span className="font-semibold text-gray-900 text-base">{label}</span>
                            {optLines.map((line, j) => (
                              <p key={j} className="text-sm text-gray-800 font-medium mt-0.5 pl-2 border-l-2 border-gray-200">
                                + {line}
                              </p>
                            ))}
                            {noteStr ? (
                              <p className="text-sm text-gray-700 mt-1 font-medium">Opmerking: {noteStr}</p>
                            ) : null}
                          </div>
                        </div>
                        <span className="font-bold tabular-nums shrink-0 text-gray-900">
                          €{lineTotal.toFixed(2)}
                        </span>
                      </div>
                      )
                    })}
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-1">
                    {selectedOrder.subtotal && (
                      <div className="flex justify-between text-gray-600 text-sm">
                        <span>{tx('subtotal')}</span>
                        <span className="tabular-nums">€{selectedOrder.subtotal.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.delivery_fee && (
                      <div className="flex justify-between text-gray-600 text-sm">
                        <span>{tx('deliveryFee')}</span>
                        <span className="tabular-nums">€{selectedOrder.delivery_fee.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.discount_amount && (
                      <div className="flex justify-between text-gray-700 text-sm">
                        <span>{tx('discount')}</span>
                        <span className="tabular-nums">−€{selectedOrder.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xl font-semibold pt-2 text-gray-900">
                      <span>{tx('total')}</span>
                      <span className="tabular-nums">€{selectedOrder.total?.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {selectedOrder.customer_notes && (
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Opmerking klant</p>
                    <p className="font-medium text-gray-900">{selectedOrder.customer_notes}</p>
                  </div>
                )}

                {/* Rejection info */}
                {selectedOrder.status === 'rejected' && selectedOrder.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                    <p className="font-semibold text-red-800">{tx('rejected')}: {' '}
                      {REJECTION_REASONS.find(r => r.id === selectedOrder.rejection_reason)?.label || selectedOrder.rejection_reason}
                    </p>
                    {selectedOrder.rejection_notes && (
                      <p className="text-gray-700 text-sm mt-2">{selectedOrder.rejection_notes}</p>
                    )}
                  </div>
                )}

                {/* Print Buttons */}
                <div className="flex gap-3 mb-4">
                  <button
                    type="button"
                    onClick={() => printOrder(selectedOrder, 'customer')}
                    className="flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-800"
                  >
                    {tx('customerReceipt')}
                  </button>
                  <button
                    type="button"
                    onClick={() => printOrder(selectedOrder, 'kitchen')}
                    className="flex-1 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-800"
                  >
                    {tx('kitchenReceipt')}
                  </button>
                </div>

                {/* Action Buttons — webshop: geen ketting bevestigd → klaar → afronden; één stap na goedkeuren */}
                <div className="grid grid-cols-2 gap-3">
                  {selectedOrder.status.toLowerCase() === 'new' && (
                    <>
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="button"
                        onClick={() => setShowRejectModal(true)}
                        className="py-5 border-2 border-red-200 bg-white text-red-800 hover:bg-red-50 rounded-xl font-semibold text-lg"
                      >
                        {tx('reject')}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="button"
                        onClick={() => handleApprove(selectedOrder)}
                        className="py-5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-lg"
                      >
                        {tx('approve')}
                      </motion.button>
                    </>
                  )}
                  {!isWebshopOrder(selectedOrder) && selectedOrder.status.toLowerCase() === 'confirmed' && (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="button"
                      onClick={() => handleReady(selectedOrder)}
                      className="col-span-2 py-5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-lg"
                    >
                      {tx('markReady')}
                    </motion.button>
                  )}
                  {isWebshopOrder(selectedOrder) &&
                    ['confirmed', 'preparing', 'ready'].includes(selectedOrder.status.toLowerCase()) && (
                      <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        type="button"
                        onClick={() => handleComplete(selectedOrder)}
                        className="col-span-2 py-5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-lg"
                      >
                        {tx('markCompleted')}
                      </motion.button>
                    )}
                  {!isWebshopOrder(selectedOrder) && selectedOrder.status.toLowerCase() === 'ready' && (
                    <motion.button
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      type="button"
                      onClick={() => handleComplete(selectedOrder)}
                      className="col-span-2 py-5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-semibold text-lg"
                    >
                      {tx('markCompleted')}
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
              <h2 className="text-2xl font-bold mb-2 text-center">{tx('rejectOrder')}</h2>
              <p className="text-gray-400 text-center mb-6">#{selectedOrder.order_number} - {selectedOrder.customer_name}</p>

              <p className="text-sm text-gray-400 mb-3">{tx('selectReason')}</p>
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
                placeholder={tx('extraNotes')}
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
                  {tx('cancel')}
                </button>
                <button
                  onClick={() => handleReject(selectedOrder)}
                  disabled={!rejectReason}
                  className="flex-1 py-4 bg-red-500 hover:bg-red-600 rounded-2xl font-bold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {tx('reject')}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* Reserveringen Modal */}
        {showReservationsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowReservationsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-700 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold"> Reserveringen</h2>
                  <p className="text-gray-400">Wachtend op goedkeuring</p>
                </div>
                <button
                  onClick={() => setShowReservationsModal(false)}
                  className="p-2 hover:bg-gray-700 rounded-lg text-gray-400"
                >
                  
                </button>
              </div>

              <div className="p-6 overflow-y-auto max-h-[60vh]">
                {reservations.length === 0 ? (
                  <div className="text-center py-12">
                    <span className="text-6xl mb-4 block"></span>
                    <p className="text-xl text-gray-400">Geen wachtende reserveringen</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {reservations.map((reservation) => (
                      <div
                        key={reservation.id}
                        className="bg-gray-700 rounded-2xl p-4"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl"></span>
                              <div>
                                <h3 className="font-bold text-lg">{reservation.customer_name}</h3>
                                <p className="text-gray-400 text-sm">
                                  {reservation.party_size} {reservation.party_size === 1 ? 'persoon': 'personen'}
                                </p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2">
                                <span></span>
                                <span>{new Date(reservation.reservation_date).toLocaleDateString('nl-NL', { weekday: 'short', day: 'numeric', month: 'short'})}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span></span>
                                <span>{reservation.reservation_time.slice(0, 5)}</span>
                              </div>
                              {reservation.customer_phone && (
                                <div className="flex items-center gap-2">
                                  <span></span>
                                  <a href={`tel:${reservation.customer_phone}`} className="text-blue-400 hover:underline">{reservation.customer_phone}</a>
                                </div>
                              )}
                              {reservation.customer_email && (
                                <div className="flex items-center gap-2">
                                  <span></span>
                                  <span className="text-gray-400 truncate">{reservation.customer_email}</span>
                                </div>
                              )}
                            </div>
                            {reservation.notes && (
                              <div className="mt-2 p-2 bg-gray-600 rounded-lg text-sm">
                                <span className="text-gray-400">Opmerking:</span> {reservation.notes}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <button
                              onClick={() => updateReservationStatus(reservation.id, 'confirmed')}
                              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-xl font-bold flex items-center gap-2"
                            >
                               Goedkeuren
                            </button>
                            <button
                              onClick={() => updateReservationStatus(reservation.id, 'cancelled')}
                              className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl font-bold flex items-center gap-2"
                            >
                               Afwijzen
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
