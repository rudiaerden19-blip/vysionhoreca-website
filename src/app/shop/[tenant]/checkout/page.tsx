'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getTenantSettings, getDeliverySettings, TenantSettings, DeliverySettings, addLoyaltyPoints, getCustomer, getShopStatus, ShopStatus } from '@/lib/admin-api'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  options?: { name: string; price: number }[]
  totalPrice: number
  image_url?: string
  notes?: string  // Voice order modifications like "zonder tomaat"
}

interface CustomerInfo {
  name: string
  email: string
  phone: string
  address: string
  postal_code: string
  city: string
  notes: string
}

export default function CheckoutPage({ params }: { params: { tenant: string } }) {
  const router = useRouter()
  const { t } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [tenantSettings, setTenantSettings] = useState<TenantSettings | null>(null)
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettings | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<'pickup' | 'delivery'>('pickup')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'online'>('cash')
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo>({
    name: '',
    email: '',
    phone: '',
    address: '',
    postal_code: '',
    city: '',
    notes: '',
  })
  const [promoCode, setPromoCode] = useState('')
  const [promoDiscount, setPromoDiscount] = useState(0)
  const [promoError, setPromoError] = useState('')
  const [orderSuccess, setOrderSuccess] = useState(false)
  const [orderNumber, setOrderNumber] = useState<number | null>(null)
  const [earnedPoints, setEarnedPoints] = useState(0)
  const [loggedInCustomerId, setLoggedInCustomerId] = useState<string | null>(null)
  const [shopStatus, setShopStatus] = useState<ShopStatus | null>(null)
  const [enabledPaymentMethods, setEnabledPaymentMethods] = useState<string[]>(['cash'])

  const primaryColor = tenantSettings?.primary_color || '#FF6B35'

  useEffect(() => {
    loadData()
    loadCart()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.tenant])

  async function loadData() {
    const [tenant, delivery, status] = await Promise.all([
      getTenantSettings(params.tenant),
      getDeliverySettings(params.tenant),
      getShopStatus(params.tenant),
    ])
    
    // Check of tenant bestaat - redirect naar niet gevonden als tenant null is
    if (!tenant) {
      window.location.href = `/shop/${params.tenant}`
      return
    }
    
    setTenantSettings(tenant)
    setDeliverySettings(delivery)
    setShopStatus(status)
    
    // Load enabled payment methods
    if (tenant?.payment_methods && Array.isArray(tenant.payment_methods) && tenant.payment_methods.length > 0) {
      setEnabledPaymentMethods(tenant.payment_methods)
      // Set default payment method to first enabled one
      if (tenant.payment_methods.includes('cash')) {
        setPaymentMethod('cash')
      } else {
        setPaymentMethod('online')
      }
    }
    
    // Default to pickup if delivery is not enabled
    if (!delivery?.delivery_enabled) {
      setOrderType('pickup')
    }
    
    // Check if customer is logged in
    const customerId = localStorage.getItem(`customer_${params.tenant}`)
    if (customerId) {
      const customer = await getCustomer(customerId)
      if (customer) {
        setLoggedInCustomerId(customerId)
        // Pre-fill customer info
        setCustomerInfo({
          name: customer.name,
          email: customer.email,
          phone: customer.phone || '',
          address: customer.address || '',
          postal_code: customer.postal_code || '',
          city: customer.city || '',
          notes: '',
        })
      }
    }
    
    setLoading(false)
  }

  function loadCart() {
    // Load cart from localStorage
    const savedCart = localStorage.getItem(`cart_${params.tenant}`)
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart))
      } catch (e) {
        console.error('Error loading cart:', e)
      }
    }
  }

  // Helper function to capitalize first letter of each word
  const capitalizeWords = (str: string) => {
    return str.replace(/\b\w/g, (char) => char.toUpperCase())
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    
    // Apply capitalization to text fields (not email)
    let processedValue = value
    if (name !== 'email' && name !== 'phone' && name !== 'postal_code') {
      processedValue = capitalizeWords(value)
    } else if (name === 'email') {
      processedValue = value.toLowerCase()
    }
    
    setCustomerInfo(prev => ({
      ...prev,
      [name]: processedValue
    }))
  }

  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice * item.quantity, 0)
  const deliveryFee = orderType === 'delivery' ? (deliverySettings?.delivery_fee || 0) : 0
  const discount = promoDiscount
  const total = subtotal + deliveryFee - discount

  const canSubmit = () => {
    if (!customerInfo.name || !customerInfo.phone) return false
    if (orderType === 'delivery' && (!customerInfo.address || !customerInfo.postal_code || !customerInfo.city)) return false
    if (cart.length === 0) return false
    // Block ordering when shop is closed or order cutoff time has passed
    if (shopStatus && (!shopStatus.isOpen || !shopStatus.canOrder)) return false
    return true
  }

  const getSubmitError = () => {
    if (cart.length === 0) return t('checkoutPage.cartEmpty')
    // Shop closed check FIRST - most important
    if (shopStatus && (!shopStatus.isOpen || !shopStatus.canOrder)) {
      return shopStatus.orderCutoffMessage || t('checkoutPage.shopClosed')
    }
    if (!customerInfo.name) return t('checkoutPage.fillName')
    if (!customerInfo.phone) return t('checkoutPage.fillPhone')
    if (orderType === 'delivery') {
      if (!customerInfo.address) return t('checkoutPage.fillAddress')
      if (!customerInfo.postal_code) return t('checkoutPage.fillPostalCode')
      if (!customerInfo.city) return t('checkoutPage.fillCity')
    }
    return null
  }

  const applyPromoCode = async () => {
    if (!promoCode.trim()) return
    setPromoError('')
    
    // Check promo code in database
    const { data, error } = await supabase
      .from('promotions')
      .select('*')
      .eq('tenant_slug', params.tenant)
      .eq('code', promoCode.toUpperCase())
      .eq('is_active', true)
      .single()
    
    if (error || !data) {
      setPromoError(t('checkoutPage.invalidCode'))
      setPromoDiscount(0)
      return
    }
    
    // Check min order
    if (data.min_order_amount && subtotal < data.min_order_amount) {
      setPromoError(t('checkoutPage.minOrderNotReached').replace('{amount}', data.min_order_amount.toFixed(2)))
      setPromoDiscount(0)
      return
    }
    
    // Check expiry
    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      setPromoError(t('checkoutPage.codeExpired'))
      setPromoDiscount(0)
      return
    }
    
    // Calculate discount
    let discountAmount = 0
    if (data.type === 'percentage') {
      discountAmount = subtotal * (data.value / 100)
      if (data.max_discount) {
        discountAmount = Math.min(discountAmount, data.max_discount)
      }
    } else if (data.type === 'fixed') {
      discountAmount = data.value
    }
    
    setPromoDiscount(discountAmount)
    setPromoError('')
  }

  const handleSubmit = async () => {
    if (!canSubmit()) return
    setSubmitting(true)
    
    try {
      // Get next order number for this tenant
      // We need the HIGHEST valid order number, not just the most recent
      const { data: orders } = await supabase
        .from('orders')
        .select('order_number')
        .eq('tenant_slug', params.tenant)
        .order('order_number', { ascending: false })
        .limit(10)
      
      // Find the highest VALID order number (must be a reasonable integer)
      let highestValidNum = 1000
      if (orders && orders.length > 0) {
        for (const order of orders) {
          // Parse as integer, handle strings and numbers
          const num = typeof order.order_number === 'string' 
            ? parseInt(order.order_number, 10) 
            : Number(order.order_number)
          
          // Only accept reasonable order numbers (1001-9999)
          if (!isNaN(num) && num >= 1001 && num <= 9999 && num > highestValidNum) {
            highestValidNum = num
          }
        }
      }
      
      // Next order number (max 9999, then wrap to 1001)
      let nextOrderNumber = highestValidNum + 1
      if (nextOrderNumber > 9999) {
        nextOrderNumber = 1001
      }
      
      console.log(`📦 Nieuw bestelnummer: ${nextOrderNumber} (hoogste gevonden: ${highestValidNum})`)

      // Create order (business_id is optional - we use tenant_slug for identification)
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          tenant_slug: params.tenant,
          order_number: nextOrderNumber,
          customer_name: customerInfo.name,
          customer_email: customerInfo.email || null,
          customer_phone: customerInfo.phone,
          customer_address: orderType === 'delivery' ? `${customerInfo.address}, ${customerInfo.postal_code} ${customerInfo.city}` : null,
          customer_notes: customerInfo.notes || null,
          order_type: orderType,
          status: 'new',
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            options: item.options,
            notes: item.notes,  // Voice order modifications
            total_price: item.totalPrice * item.quantity,
          })),
          subtotal: subtotal,
          tax: 0,
          total: total,
          payment_method: paymentMethod === 'cash' ? 'cash' : 'online',
          payment_status: 'pending',
        })
        .select()
        .single()
      
      if (orderError) {
        console.error('Order error:', orderError)
        throw orderError
      }
      
      // Update promo usage if used
      if (promoDiscount > 0 && promoCode) {
        await supabase
          .from('promotions')
          .update({ usage_count: supabase.rpc('increment_usage') })
          .eq('tenant_slug', params.tenant)
          .eq('code', promoCode.toUpperCase())
      }
      
      // NOTE: Spaarpunten worden pas toegekend na goedkeuring door de zaak!
      // Dit gebeurt in de admin bestellingen pagina bij handleConfirmOrder
      if (loggedInCustomerId) {
        // Toon hoeveel punten ze KUNNEN verdienen (nog niet toegekend)
        const points = Math.floor(total)
        setEarnedPoints(points)
      }
      
      // IMPORTANT: Set success state FIRST before anything else
      setOrderNumber(order.order_number)
      setOrderSuccess(true)
      
      // Then clear cart from localStorage (state blijft zodat we geen "empty cart" zien)
      localStorage.removeItem(`cart_${params.tenant}`)
      
      // Scroll to top for mobile
      setTimeout(() => {
        window.scrollTo(0, 0)
      }, 50)
      
    } catch (error) {
      console.error('Error submitting order:', error)
      alert(t('checkoutPage.somethingWentWrong'))
    }
    
    setSubmitting(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          style={{ borderColor: primaryColor, borderTopColor: 'transparent' }}
          className="w-12 h-12 border-4 rounded-full"
        />
      </div>
    )
  }

  // Success screen - Wacht op bevestiging (MOET VOOR empty cart check!)
  if (orderSuccess) {
    return (
      <div style={{ minHeight: '100dvh' }} className="bg-gray-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-xl"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-5xl bg-blue-100"
          >
            ⏳
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('checkoutPage.orderReceived')}</h1>
          <p className="text-gray-600 mb-6">
            {t('checkoutPage.orderReceivedDesc').replace('{orderNumber}', String(orderNumber))}
          </p>
          
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
            <p className="text-blue-800 font-medium mb-2">📱 {t('checkoutPage.waitForConfirmation')}</p>
            <p className="text-blue-600 text-sm">{t('checkoutPage.waitForConfirmationDesc')}</p>
          </div>
          
          <div className="bg-gray-50 rounded-2xl p-4 mb-6">
            <p className="text-gray-500 text-sm mb-1">{t('checkoutPage.orderNumber')}</p>
            <p className="text-3xl font-bold" style={{ color: primaryColor }}>#{orderNumber}</p>
          </div>
          
          {earnedPoints > 0 && loggedInCustomerId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6">
              <p className="text-yellow-800 font-medium">🎁 {t('checkoutPage.canEarnPoints').replace('{points}', String(earnedPoints))}</p>
              <p className="text-yellow-600 text-sm">{t('checkoutPage.pointsAfterApproval')}</p>
            </div>
          )}
          
          <div className="space-y-3">
            <Link
              href={`/shop/${params.tenant}/menu`}
              style={{ backgroundColor: primaryColor }}
              className="block w-full text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-colors"
            >
              {t('checkoutPage.backToMenu')}
            </Link>
            <Link
              href={`/shop/${params.tenant}`}
              className="block w-full bg-gray-100 text-gray-700 font-medium py-4 rounded-2xl hover:bg-gray-200 transition-colors"
            >
              {t('checkoutPage.toHomepage')}
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  // Empty cart
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <span className="text-6xl mb-4 block">🛒</span>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('checkoutPage.emptyCart')}</h1>
          <p className="text-gray-500 mb-6">{t('checkoutPage.emptyCartDesc')}</p>
          <Link
            href={`/shop/${params.tenant}/menu`}
            style={{ backgroundColor: primaryColor }}
            className="inline-block text-white font-bold py-4 px-8 rounded-2xl hover:opacity-90 transition-colors"
          >
            {t('checkoutPage.viewMenu')}
          </Link>
        </div>
      </div>
    )
  }

  // Shop closed - BLOCK ordering completely
  if (shopStatus && (!shopStatus.isOpen || !shopStatus.canOrder)) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white rounded-3xl p-8 max-w-lg w-full text-center shadow-2xl border-4 border-red-500"
        >
          <div className="w-24 h-24 bg-red-100 rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="text-5xl">🚫</span>
          </div>
          <h1 className="text-3xl font-bold text-red-600 mb-4">
            {!shopStatus.isOpen ? t('checkoutPage.shopClosedTitle') : t('checkoutPage.ordersClosedTitle')}
          </h1>
          <p className="text-gray-600 text-lg mb-6">
            {shopStatus.orderCutoffMessage || shopStatus.message || t('checkoutPage.shopClosedDesc')}
          </p>
          {shopStatus.opensAt && (
            <div className="bg-gray-100 rounded-2xl p-4 mb-6">
              <p className="text-gray-500 text-sm">{t('checkoutPage.opensAgainAt')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {shopStatus.opensAt}
                {shopStatus.nextOpenDay && <span className="text-lg font-normal text-gray-500"> ({shopStatus.nextOpenDay})</span>}
              </p>
            </div>
          )}
          <div className="space-y-3">
            <Link
              href={`/shop/${params.tenant}`}
              style={{ backgroundColor: primaryColor }}
              className="block w-full text-white font-bold py-4 rounded-2xl hover:opacity-90 transition-colors"
            >
              {t('checkoutPage.backToShop')}
            </Link>
            <Link
              href={`/shop/${params.tenant}/menu`}
              className="block w-full bg-gray-100 text-gray-700 font-medium py-4 rounded-2xl hover:bg-gray-200 transition-colors"
            >
              {t('checkoutPage.viewMenuForTomorrow')}
            </Link>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', maxWidth: '100vw', overflowX: 'clip' }} className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between max-w-2xl mx-auto">
          <Link 
            href={`/shop/${params.tenant}/menu`} 
            className="flex items-center gap-2 text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>{t('checkoutPage.back')}</span>
          </Link>
          <h1 className="font-bold text-lg text-gray-900">{t('checkoutPage.checkout')}</h1>
          <div className="w-16"></div>
        </div>
      </header>

      <main className="px-3 sm:px-4 py-4 sm:py-6 max-w-2xl mx-auto pb-6">
        <div className="space-y-4 sm:space-y-6">
          {/* Left Column - Forms */}
          <div className="space-y-4 sm:space-y-6">
            {/* Order Type */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t('checkoutPage.howReceiveOrder')}</h2>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                <button
                  onClick={() => setOrderType('pickup')}
                  style={orderType === 'pickup' ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    orderType === 'pickup' ? '' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-3xl block mb-2">🛍️</span>
                  <span className="font-bold text-gray-900">{t('checkoutPage.pickup')}</span>
                  <span className="block text-sm text-gray-500">
                    {deliverySettings?.pickup_time_minutes ? `~${deliverySettings.pickup_time_minutes} min` : t('checkoutPage.readyDirect')}
                  </span>
                </button>
                
                {deliverySettings?.delivery_enabled && (
                  <button
                    onClick={() => setOrderType('delivery')}
                    style={orderType === 'delivery' ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      orderType === 'delivery' ? '' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl block mb-2">🚗</span>
                    <span className="font-bold text-gray-900">{t('checkoutPage.delivery')}</span>
                    <span className="block text-sm text-gray-500">
                      +€{deliverySettings?.delivery_fee?.toFixed(2) || '0.00'}
                    </span>
                  </button>
                )}
              </div>
              
              {orderType === 'delivery' && deliverySettings?.min_order_amount && subtotal < deliverySettings.min_order_amount && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm">
                  ⚠️ {t('checkoutPage.minDelivery')} €{deliverySettings.min_order_amount.toFixed(2)}
                </div>
              )}
            </motion.div>

            {/* Customer Info */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm"
            >
              <div className="mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-2">{t('checkoutPage.yourDetails')}</h2>
              
              {!loggedInCustomerId && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <p className="text-blue-800 font-medium mb-3">💡 {t('checkoutPage.loginForPoints')}</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Link
                      href={`/shop/${params.tenant}/account/login?redirect=checkout`}
                      style={{ backgroundColor: primaryColor }}
                      className="flex-1 text-center text-white font-medium py-2 px-4 rounded-lg hover:opacity-90 transition-opacity"
                    >
                      {t('checkoutPage.login')}
                    </Link>
                    <Link
                      href={`/shop/${params.tenant}/account/register?redirect=checkout`}
                      className="flex-1 text-center bg-white border border-gray-200 text-gray-700 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      {t('checkoutPage.createAccount')}
                    </Link>
                  </div>
                  <p className="text-blue-600 text-sm mt-3 text-center">{t('checkoutPage.orOrderAsGuest')}</p>
                </div>
              )}
              
              {loggedInCustomerId && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
                  <p className="text-green-700 font-medium">✓ {t('checkoutPage.loggedInPoints')}</p>
                </div>
              )}
            </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkoutPage.name')} <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="name"
                    value={customerInfo.name}
                    onChange={handleInputChange}
                    placeholder={t('checkoutPage.name')}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                    style={{ '--tw-ring-color': primaryColor } as React.CSSProperties}
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkoutPage.phone')} <span className="text-red-500">*</span></label>
                    <input
                      type="tel"
                      name="phone"
                      value={customerInfo.phone}
                      onChange={handleInputChange}
                      placeholder="+32 ..."
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkoutPage.email')}</label>
                    <input
                      type="email"
                      name="email"
                      value={customerInfo.email}
                      onChange={handleInputChange}
                      placeholder={t('checkoutPage.optional')}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                    />
                  </div>
                </div>

                {orderType === 'delivery' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkoutPage.address')} <span className="text-red-500">*</span></label>
                      <input
                        type="text"
                        name="address"
                        value={customerInfo.address}
                        onChange={handleInputChange}
                        placeholder={t('checkoutPage.streetNumber')}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkoutPage.postalCode')} <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="postal_code"
                          value={customerInfo.postal_code}
                          onChange={handleInputChange}
                          placeholder="1234"
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkoutPage.city')} <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          name="city"
                          value={customerInfo.city}
                          onChange={handleInputChange}
                          placeholder={t('checkoutPage.city')}
                          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('checkoutPage.notes')}</label>
                  <textarea
                    name="notes"
                    value={customerInfo.notes}
                    onChange={handleInputChange}
                    placeholder={t('checkoutPage.notesPlaceholder')}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all resize-none"
                  />
                </div>
              </div>
            </motion.div>

            {/* Payment Method */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t('checkoutPage.paymentMethod')}</h2>
              <div className="grid grid-cols-2 gap-2 sm:gap-4">
                {/* Cash optie - alleen tonen als ingeschakeld */}
                {enabledPaymentMethods.includes('cash') && (
                  <button
                    onClick={() => setPaymentMethod('cash')}
                    style={paymentMethod === 'cash' ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'cash' ? '' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl block mb-2">💵</span>
                    <span className="font-bold text-gray-900">{t('checkoutPage.cash')}</span>
                    <span className="block text-sm text-gray-500">{orderType === 'pickup' ? t('checkoutPage.payAtPickup') : t('checkoutPage.payAtDelivery')}</span>
                  </button>
                )}
                
                {/* Online betaling opties */}
                {enabledPaymentMethods.includes('bancontact') && (
                  <button
                    onClick={() => setPaymentMethod('online')}
                    style={paymentMethod === 'online' ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'online' ? '' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl block mb-2">💳</span>
                    <span className="font-bold text-gray-900">Bancontact</span>
                    <span className="block text-sm text-gray-500">{t('checkoutPage.securePayment')}</span>
                  </button>
                )}
                
                {enabledPaymentMethods.includes('visa') && (
                  <button
                    onClick={() => setPaymentMethod('online')}
                    style={paymentMethod === 'online' ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'online' ? '' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl block mb-2">💳</span>
                    <span className="font-bold text-gray-900">Visa</span>
                    <span className="block text-sm text-gray-500">{t('checkoutPage.securePayment')}</span>
                  </button>
                )}
                
                {enabledPaymentMethods.includes('mastercard') && (
                  <button
                    onClick={() => setPaymentMethod('online')}
                    style={paymentMethod === 'online' ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'online' ? '' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl block mb-2">💳</span>
                    <span className="font-bold text-gray-900">Mastercard</span>
                    <span className="block text-sm text-gray-500">{t('checkoutPage.securePayment')}</span>
                  </button>
                )}
                
                {enabledPaymentMethods.includes('paypal') && (
                  <button
                    onClick={() => setPaymentMethod('online')}
                    style={paymentMethod === 'online' ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'online' ? '' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl block mb-2">🅿️</span>
                    <span className="font-bold text-gray-900">PayPal</span>
                    <span className="block text-sm text-gray-500">{t('checkoutPage.securePayment')}</span>
                  </button>
                )}
                
                {enabledPaymentMethods.includes('ideal') && (
                  <button
                    onClick={() => setPaymentMethod('online')}
                    style={paymentMethod === 'online' ? { borderColor: primaryColor, backgroundColor: `${primaryColor}10` } : {}}
                    className={`p-4 rounded-xl border-2 transition-all ${
                      paymentMethod === 'online' ? '' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl block mb-2">🏦</span>
                    <span className="font-bold text-gray-900">iDEAL</span>
                    <span className="block text-sm text-gray-500">{t('checkoutPage.securePayment')}</span>
                  </button>
                )}
              </div>
              
              {paymentMethod === 'online' && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
                  ℹ️ {t('checkoutPage.onlineComingSoon')}
                </div>
              )}
            </motion.div>
          </div>

          {/* Right Column - Order Summary */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-white rounded-2xl p-6 shadow-sm sticky top-24"
            >
              <h2 className="text-lg font-bold text-gray-900 mb-4">{t('checkoutPage.yourOrder')}</h2>
              
              <div className="space-y-3 sm:space-y-4 max-h-80 overflow-y-auto mb-6">
                {cart.map((item, index) => (
                  <div key={index} className="flex gap-3 sm:gap-4">
                    {item.image_url ? (
                      <img src={item.image_url} alt={item.name} className="w-12 h-12 sm:w-16 sm:h-16 object-cover rounded-lg" />
                    ) : (
                      <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-lg flex items-center justify-center text-xl sm:text-2xl">🍟</div>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <span className="font-medium text-gray-900">{item.quantity}x {item.name}</span>
                        <span className="font-bold" style={{ color: primaryColor }}>€{(item.totalPrice * item.quantity).toFixed(2)}</span>
                      </div>
                      {item.options && item.options.length > 0 && (
                        <p className="text-sm text-gray-500">{item.options.map(o => o.name).join(', ')}</p>
                      )}
                      {item.notes && (
                        <p className="text-sm text-orange-500 font-medium">⚠️ {item.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Promo Code */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">{t('checkoutPage.promoCode')}</label>
                <div className="flex gap-2 w-full">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="CODE"
                    className="flex-1 min-w-0 px-3 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:border-transparent transition-all uppercase text-sm"
                  />
                  <button
                    onClick={applyPromoCode}
                    className="px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-xl font-medium transition-colors text-sm whitespace-nowrap shrink-0"
                  >
                    {t('checkoutPage.apply')}
                  </button>
                </div>
                {promoError && <p className="text-red-500 text-sm mt-2">{promoError}</p>}
                {promoDiscount > 0 && <p className="text-green-600 text-sm mt-2">✓ {t('checkoutPage.discountApplied')}</p>}
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-gray-600">
                  <span>{t('checkoutPage.subtotal')}</span>
                  <span>€{subtotal.toFixed(2)}</span>
                </div>
                {deliveryFee > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>{t('checkoutPage.deliveryFee')}</span>
                    <span>€{deliveryFee.toFixed(2)}</span>
                  </div>
                )}
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>{t('checkoutPage.discount')}</span>
                    <span>-€{discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t">
                  <span>{t('checkoutPage.total')}</span>
                  <span style={{ color: primaryColor }}>€{total.toFixed(2)}</span>
                </div>
              </div>

              {/* Submit Error Message */}
              {getSubmitError() && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm text-center">
                  ⚠️ {getSubmitError()}
                </div>
              )}

              {/* Shop Closed Warning */}
              {shopStatus && !shopStatus.isOpen && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm text-center">
                  ⏰ {shopStatus.message || t('checkoutPage.currentlyClosed')} - {t('checkoutPage.canStillOrder')}
                </div>
              )}

              {/* Order Cutoff Warning - Shop is open but can't order anymore */}
              {shopStatus && shopStatus.isOpen && shopStatus.canOrder === false && (
                <div className="mt-4 p-4 bg-orange-50 border border-orange-300 rounded-xl text-orange-800 text-center">
                  <div className="text-lg font-semibold mb-1">🛒 Bestellen niet meer mogelijk</div>
                  <p>{shopStatus.orderCutoffMessage || 'U kunt vandaag niet meer bestellen.'}</p>
                </div>
              )}

              {/* Submit Button */}
              <motion.button
                whileHover={{ scale: canSubmit() ? 1.02 : 1 }}
                whileTap={{ scale: canSubmit() ? 0.98 : 1 }}
                onClick={handleSubmit}
                disabled={!canSubmit() || submitting}
                style={{ backgroundColor: canSubmit() ? primaryColor : undefined }}
                className="w-full mt-4 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-2xl transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                    />
                    <span>{t('checkoutPage.placingOrder')}</span>
                  </>
                ) : (
                  <>
                    <span>{t('checkoutPage.placeOrder')}</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full">€{total.toFixed(2)}</span>
                  </>
                )}
              </motion.button>

              <p className="text-center text-sm text-gray-500 mt-4">
                {t('checkoutPage.agreeTerms')}
              </p>
            </motion.div>
          </div>
        </div>
      </main>
    </div>
  )
}
