'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { getTenantSettings, updateOrderStatus, TenantSettings } from '@/lib/admin-api'
import { useLanguage } from '@/i18n'
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
  email?: string
  postal_code?: string
  city?: string
  btw_number?: string
  btw_percentage?: number
}

export default function ShopDisplayPage({ params }: { params: { tenant: string } }) {
  const { t, locale } = useLanguage()
  
  // Translation helper for shopDisplay keys
  const tx = (key: string) => t(`shopDisplay.${key}`)
  
  // Rejection reasons with translated labels
  const REJECTION_REASONS = [
    { id: 'busy', label: tx('reasonBusy'), icon: '🔥' },
    { id: 'closed', label: tx('reasonClosed'), icon: '🚫' },
    { id: 'no_stock', label: tx('reasonNoStock'), icon: '📦' },
    { id: 'technical', label: tx('reasonTechnical'), icon: '⚠️' },
    { id: 'address', label: tx('reasonAddress'), icon: '📍' },
    { id: 'other', label: tx('reasonOther'), icon: '💬' },
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
  const [soundEnabled, setSoundEnabled] = useState(false)
  const [audioReady, setAudioReady] = useState(false)
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active')
  const [printerIP, setPrinterIP] = useState<string | null>(null)
  const [showPrinterSettings, setShowPrinterSettings] = useState(false)
  const [printerStatus, setPrinterStatus] = useState<'unknown' | 'online' | 'offline'>('unknown')
  const audioContextRef = useRef<AudioContext | null>(null)
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

  // Load printer IP from localStorage and check status
  useEffect(() => {
    const savedIP = localStorage.getItem(`printer_ip_${params.tenant}`)
    if (savedIP) {
      setPrinterIP(savedIP)
      checkPrinterStatus(savedIP)
    }
  }, [params.tenant])

  // Check printer status via server proxy (avoids mixed content)
  async function checkPrinterStatus(ip: string) {
    try {
      const response = await fetch(`/api/print-proxy?printerIP=${encodeURIComponent(ip)}`)
      const data = await response.json()
      
      if (data.status === 'online') {
        setPrinterStatus('online')
        console.log('🖨️ Printer online:', ip)
      } else {
        setPrinterStatus('offline')
        console.log('🖨️ Printer offline:', ip)
      }
    } catch (error) {
      setPrinterStatus('offline')
      console.log('🖨️ Printer check failed:', error)
    }
  }

  // Save printer IP
  function savePrinterIP(ip: string) {
    localStorage.setItem(`printer_ip_${params.tenant}`, ip)
    setPrinterIP(ip)
    checkPrinterStatus(ip)
    setShowPrinterSettings(false)
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

  // Mark audio ready after any user interaction
  useEffect(() => {
    const markReady = () => {
      setAudioReady(true)
      document.removeEventListener('click', markReady)
    }
    document.addEventListener('click', markReady)
    return () => document.removeEventListener('click', markReady)
  }, [])

  // Continuous alert sound for new orders - plays every 3 seconds
  useEffect(() => {
    if (newOrderIds.size > 0 && soundEnabled && audioReady) {
      // Play immediately
      playAlertSound()
      
      // Then repeat every 3 seconds
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
  }, [newOrderIds.size, soundEnabled, audioReady])

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
            items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items || []
          }))
          
          // Find TRULY new orders (not in known set AND status is 'new')
          const trulyNewOrders = parsed.filter(o => 
            !knownOrderIdsRef.current.has(o.id) && 
            o.status.toLowerCase() === 'new'
          )
          
          // Add ALL current order IDs to known set
          parsed.forEach(o => knownOrderIdsRef.current.add(o.id))
          
          // Alert for truly new orders
          if (trulyNewOrders.length > 0) {
            console.log(`🔔 ${trulyNewOrders.length} NIEUWE bestelling(en) gedetecteerd!`)
            trulyNewOrders.forEach(order => {
              setNewOrderIds(prev => new Set([...prev, order.id]))
            })
            if (soundEnabled && audioReady) {
              playAlertSound()
            }
          }
          
          setOrders(parsed)
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
  }, [params.tenant, soundEnabled, audioReady, initialLoadDone])

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
          items: typeof order.items === 'string' ? JSON.parse(order.items) : order.items || []
        }))
        setOrders(parsed)
        
        // CRITICAL: Initialize known IDs with ALL current orders
        // This prevents false "new order" alerts on page load
        parsed.forEach(o => knownOrderIdsRef.current.add(o.id))
        console.log(`📋 Initial load: ${parsed.length} orders, ${knownOrderIdsRef.current.size} known IDs`)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }

    setLoading(false)
    setInitialLoadDone(true)
  }

  // =========================================
  // NOTIFICATION SOUND
  // =========================================
  
  function playAlertSound() {
    console.log('🔊 Playing sound...')
    
    // Method 1: Web Audio API - create beep directly
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext
      if (AudioContext) {
        const ctx = new AudioContext()
        
        // Create oscillator
        const osc = ctx.createOscillator()
        const gainNode = ctx.createGain()
        
        osc.connect(gainNode)
        gainNode.connect(ctx.destination)
        
        // Loud beep
        osc.frequency.value = 880
        osc.type = 'square'
        gainNode.gain.value = 0.8
        
        // Start immediately
        osc.start(0)
        osc.stop(ctx.currentTime + 0.3)
        
        // Second beep
        setTimeout(() => {
          try {
            const osc2 = ctx.createOscillator()
            const gain2 = ctx.createGain()
            osc2.connect(gain2)
            gain2.connect(ctx.destination)
            osc2.frequency.value = 1100
            osc2.type = 'square'
            gain2.gain.value = 0.8
            osc2.start(0)
            osc2.stop(ctx.currentTime + 0.3)
          } catch {
            // Audio oscillator cleanup - non-critical, safe to ignore
          }
        }, 200)
        
        console.log('✅ Sound played via Web Audio')
        return
      }
    } catch (e) {
      console.error('Web Audio failed:', e)
    }
    
    // Method 2: HTML Audio fallback
    try {
      const audio = new Audio('https://cdn.freesound.org/previews/352/352661_5121236-lq.mp3')
      audio.volume = 1.0
      audio.play()
      console.log('✅ Sound played via HTML Audio')
    } catch (e) {
      console.error('HTML Audio failed:', e)
    }
  }

  function enableSound() {
    console.log('🔊 Enabling sound...')
    setAudioReady(true)
    setSoundEnabled(true)
    localStorage.setItem(`shop_display_sound_${params.tenant}`, 'true')
    
    // Play test sound
    playAlertSound()
  }

  // EMAIL FUNCTION - BULLETPROOF with all required business info
  async function sendOrderStatusEmail(order: Order, status: string, rejectionReason?: string, rejectionNotes?: string) {
    // Skip if no email
    if (!order.customer_email) {
      console.log('⚠️ No customer email - skipping notification')
      return
    }
    
    // Prevent duplicate emails using sessionStorage
    const emailKey = `${order.id}-${status}`
    if (sentEmailsRef.current.has(emailKey)) {
      console.log('📧 Email already sent:', emailKey)
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
    
    console.log(`📧 Sending ${status} email to ${order.customer_email}...`)
    
    try {
      const response = await fetch('/api/send-order-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        console.log(`✅ Email sent successfully to ${order.customer_email}`)
      } else {
        const errorText = await response.text()
        console.error(`❌ Email API error: ${response.status} - ${errorText}`)
      }
    } catch (error) {
      console.error('❌ Failed to send email:', error)
      // Don't remove from sentEmailsRef - we don't want to spam on retry
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

  // Print to thermal printer via server proxy (avoids HTTPS/HTTP mixed content)
  async function printToThermal(order: Order, type: 'customer' | 'kitchen') {
    // Check if running inside Vysion Print iPad app
    const isInVysionApp = typeof window !== 'undefined' && (window as any)._vysionPrintApp === true
    
    // In Vysion app, we don't need printerIP - the WebView handles it
    if (!printerIP && !isInVysionApp) {
      console.log('🖨️ No printer IP configured')
      return false
    }

    console.log(`🖨️ Sending ${type} receipt to printer...${isInVysionApp ? ' (via Vysion app)' : ''}`)

    try {
      // Calculate tax amount based on BTW percentage
      const btwPercentage = business?.btw_percentage || 6
      const totalAmount = order.total || 0
      const taxAmount = totalAmount - (totalAmount / (1 + btwPercentage / 100))
      
      const response = await fetch('/api/print-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          printerIP,
          order: {
            order_number: order.order_number,
            customer_name: order.customer_name,
            customer_phone: order.customer_phone,
            customer_email: order.customer_email,
            customer_address: order.delivery_address,
            order_type: order.order_type,
            payment_status: order.payment_status,
            payment_method: order.payment_method,
            items: order.items,
            subtotal: order.subtotal,
            delivery_fee: order.delivery_fee,
            discount: order.discount_amount,
            total: order.total,
            tax: taxAmount,
            notes: order.customer_notes,
            created_at: order.created_at,
          },
          businessInfo: {
            name: business?.business_name,
            address: business?.address,
            city: business?.city,
            postalCode: business?.postal_code,
            phone: business?.phone,
            email: business?.email,
            btw_number: business?.btw_number,
            btw_percentage: business?.btw_percentage || 6,
          },
          printType: type,
        }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        console.log(`✅ ${type} bon geprint via iPad`)
        return true
      } else {
        console.error('❌ Print failed:', data.error || 'Unknown error')
        alert(`Print mislukt: ${data.error || 'Controleer of de iPad app draait'}`)
        return false
      }
    } catch (error: any) {
      console.error('❌ Print error:', error)
      alert(`Print error: ${error.message}`)
      return false
    }
  }

  // Fallback browser print
  function browserPrint(order: Order, type: 'customer' | 'kitchen') {
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

  // Main print function - tries thermal first, falls back to browser
  async function printOrder(order: Order, type: 'customer' | 'kitchen' = 'customer') {
    // Check if running inside Vysion Print iPad app
    const isInVysionApp = typeof window !== 'undefined' && (window as any)._vysionPrintApp === true
    
    // If in Vysion Print app, always use thermal (WebView intercepts the request)
    if (isInVysionApp) {
      console.log('🖨️ Running in Vysion Print app, sending to native...')
      const success = await printToThermal(order, type)
      if (success) return
      // Don't fallback to browser print in the app - it won't work
      console.log('❌ Native print failed')
      return
    }
    
    // If printer is configured and online, use thermal printer
    if (printerIP && printerStatus === 'online') {
      const success = await printToThermal(order, type)
      if (success) return
    }
    
    // Fallback to browser print (only works in regular browser)
    browserPrint(order, type)
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
      case 'new': return tx('statusNew')
      case 'confirmed': return tx('statusKitchen')
      case 'preparing': return tx('statusPreparing')
      case 'ready': return `✓ ${tx('statusReady')}`
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
              <p className="text-6xl font-black text-white text-center mb-2">🔔 {tx('newOrder')}</p>
              <p className="text-3xl font-bold text-white/90 text-center">
                {newOrderIds.size === 1 ? tx('clickToView') : `${newOrderIds.size} ${tx('newOrders')}`}
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
              <h1 className="text-xl font-bold">{tx('title')}</h1>
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
                🔔 {tx('soundOn')}
              </motion.button>
            ) : (
              <span className="px-3 py-2 bg-green-500/20 text-green-400 rounded-xl flex items-center gap-2 text-sm">
                🔊 {tx('soundEnabled')}
              </span>
            )}

            {/* New order indicator */}
            {newOrderIds.size > 0 && (
              <motion.div
                animate={{ scale: [1, 1.1, 1] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
                className="px-4 py-2 bg-red-500 rounded-xl font-bold"
              >
                🚨 {newOrderIds.size} {tx('new').toUpperCase()}
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
                {currentTime.toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            {/* Printer Status */}
            <button
              onClick={() => setShowPrinterSettings(true)}
              className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-2 ${
                printerStatus === 'online' 
                  ? 'bg-green-500/20 text-green-400' 
                  : printerStatus === 'offline'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-gray-700 text-gray-400'
              }`}
            >
              🖨️ {printerStatus === 'online' ? 'Online' : printerStatus === 'offline' ? 'Offline' : 'Instellen'}
            </button>

            {/* Links */}
            <Link
              href={`/keuken/${params.tenant}`}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-bold"
            >
              👨‍🍳 {tx('kitchen')}
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
          {tx('active')} ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
            activeTab === 'completed' 
              ? 'bg-gray-500 text-white' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          {tx('completed')} ({completedOrders.length})
        </button>
      </div>

      {/* Orders Grid */}
      <div className="p-4 h-[calc(100vh-120px)] overflow-y-auto">
        {activeTab === 'active' ? (
          sortedActiveOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <span className="text-8xl mb-6">📭</span>
              <p className="text-2xl font-bold">{tx('noActiveOrders')}</p>
              <p className="text-lg mt-2">{tx('ordersAppearHere')}</p>
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
                        {order.order_type === 'delivery' ? `🚗 ${tx('delivery')}` : `🛍️ ${tx('pickup')}`}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        order.payment_status === 'paid' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {order.payment_status === 'paid' ? `✓ ${tx('paid')}` : '⏳'}
                      </span>
                    </div>

                    {/* Items preview */}
                    <div className="text-sm text-gray-400 mb-2">
                      {order.items?.slice(0, 2).map((item: any, i: number) => (
                        <p key={i} className="truncate">{item.quantity}x {item.product_name || item.name}</p>
                      ))}
                      {(order.items?.length || 0) > 2 && (
                        <p className="text-gray-500">+{order.items.length - 2} {tx('more')}</p>
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
                    {order.status === 'completed' ? `✓ ${tx('completed')}` : `✗ ${tx('rejected')}`}
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
                      <p className="text-gray-400 text-sm">{tx('customer')}</p>
                      <p className="font-bold text-xl">{selectedOrder.customer_name}</p>
                    </div>
                    {selectedOrder.customer_phone && (
                      <div>
                        <p className="text-gray-400 text-sm">{tx('phone')}</p>
                        <p className="font-bold text-xl">{selectedOrder.customer_phone}</p>
                      </div>
                    )}
                  </div>
                  {selectedOrder.delivery_address && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <p className="text-gray-400 text-sm">{tx('deliveryAddress')}</p>
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
                    <p className="font-bold">{selectedOrder.order_type === 'delivery' ? tx('delivery') : tx('pickup')}</p>
                  </div>
                  <div className={`flex-1 rounded-xl p-3 text-center ${
                    selectedOrder.payment_status === 'paid' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                  }`}>
                    <p className="text-3xl">{selectedOrder.payment_status === 'paid' ? '✓' : '⏳'}</p>
                    <p className="font-bold">{selectedOrder.payment_status === 'paid' ? tx('paid') : tx('notPaid')}</p>
                  </div>
                </div>

                {/* Items */}
                <div className="bg-gray-700/50 rounded-2xl p-4 mb-4">
                  <h3 className="font-bold text-lg mb-3">{tx('order')}</h3>
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
                        <span>{tx('subtotal')}</span>
                        <span>€{selectedOrder.subtotal.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.delivery_fee && (
                      <div className="flex justify-between text-gray-400">
                        <span>{tx('deliveryFee')}</span>
                        <span>€{selectedOrder.delivery_fee.toFixed(2)}</span>
                      </div>
                    )}
                    {selectedOrder.discount_amount && (
                      <div className="flex justify-between text-green-400">
                        <span>{tx('discount')}</span>
                        <span>-€{selectedOrder.discount_amount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-3xl font-bold pt-2">
                      <span>{tx('total')}</span>
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
                    <p className="font-bold text-red-400">❌ {tx('rejected')}: {
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
                    🖨️ {tx('customerReceipt')}
                  </button>
                  <button
                    onClick={() => printOrder(selectedOrder, 'kitchen')}
                    className="flex-1 py-3 bg-gray-600 hover:bg-gray-500 rounded-xl font-bold flex items-center justify-center gap-2"
                  >
                    🖨️ {tx('kitchenReceipt')}
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
                        ✗ {tx('reject')}
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleApprove(selectedOrder)}
                        className="py-6 bg-green-500 hover:bg-green-600 rounded-2xl font-bold text-2xl"
                      >
                        ✓ {tx('approve')}
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
                      ✓ {tx('markReady')}
                    </motion.button>
                  )}
                  {selectedOrder.status.toLowerCase() === 'ready' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleComplete(selectedOrder)}
                      className="col-span-2 py-6 bg-blue-500 hover:bg-blue-600 rounded-2xl font-bold text-2xl"
                    >
                      ✓ {tx('markCompleted')}
                    </motion.button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Printer Settings Modal */}
      <AnimatePresence>
        {showPrinterSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowPrinterSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-gray-800 rounded-3xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-2xl font-bold mb-2 text-center">🖨️ Printer Instellingen</h2>
              <p className="text-gray-400 text-center mb-6">Verbind met de Vysion Print iPad app</p>

              <div className="mb-6">
                <label className="block text-sm text-gray-400 mb-2">iPad IP Adres</label>
                <input
                  type="text"
                  defaultValue={printerIP || ''}
                  placeholder="bijv. 192.168.1.100"
                  className="w-full px-4 py-3 bg-gray-700 rounded-xl border-none text-white placeholder-gray-500"
                  id="printer-ip-input"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Je vindt dit IP adres in de Vysion Print app op de iPad
                </p>
              </div>

              {/* Status indicator */}
              <div className={`mb-6 p-4 rounded-xl ${
                printerStatus === 'online' 
                  ? 'bg-green-500/20 text-green-400' 
                  : printerStatus === 'offline'
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-gray-700 text-gray-400'
              }`}>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {printerStatus === 'online' ? '✅' : printerStatus === 'offline' ? '❌' : '❓'}
                  </span>
                  <div>
                    <p className="font-bold">
                      {printerStatus === 'online' 
                        ? 'Printer Verbonden' 
                        : printerStatus === 'offline'
                        ? 'Printer Niet Bereikbaar'
                        : 'Nog Niet Geconfigureerd'}
                    </p>
                    {printerIP && (
                      <p className="text-sm opacity-80">{printerIP}:3001</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => setShowPrinterSettings(false)}
                  className="flex-1 py-4 bg-gray-700 hover:bg-gray-600 rounded-2xl font-bold text-lg"
                >
                  Annuleren
                </button>
                <button
                  onClick={() => {
                    const input = document.getElementById('printer-ip-input') as HTMLInputElement
                    if (input?.value) {
                      savePrinterIP(input.value.trim())
                    }
                  }}
                  className="flex-1 py-4 bg-orange-500 hover:bg-orange-600 rounded-2xl font-bold text-lg"
                >
                  Opslaan
                </button>
              </div>

              {printerIP && (
                <button
                  onClick={() => checkPrinterStatus(printerIP)}
                  className="w-full mt-4 py-3 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-xl font-bold"
                >
                  🔄 Verbinding Testen
                </button>
              )}
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
      </AnimatePresence>
    </div>
  )
}
