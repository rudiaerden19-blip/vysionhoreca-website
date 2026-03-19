'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MenuProduct, MenuCategory, ProductOption, ProductOptionChoice, getMenuCategories, getMenuProducts, getProductsWithOptions, getOptionsForProduct, getTenantSettings, TenantSettings } from '@/lib/admin-api'
import KassaFloorPlan from '@/components/KassaFloorPlan'
import KassaReservationsView from '@/components/KassaReservationsView'
import { supabase } from '@/lib/supabase'
import { useLanguage } from '@/i18n'
import { getSoundsEnabled, setSoundsEnabled } from '@/lib/sounds'

interface SelectedChoice {
  optionId: string
  optionName: string
  choiceId: string
  choiceName: string
  price: number
}

interface CartItem {
  product: MenuProduct
  quantity: number
  choices?: SelectedChoice[]
  cartKey: string
}

type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'

export default function KassaAdminPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const router = useRouter()
  const baseUrl = `/shop/${tenant}/admin`
  const { locale, setLocale, locales, localeNames, localeFlags } = useLanguage()

  const [navOpen, setNavOpen] = useState(false)
  const [kassaOpen, setKassaOpen] = useState(false)
  const [flyoutOpen, setFlyoutOpen] = useState<string | null>(null)
  const [onlineSubOpen, setOnlineSubOpen] = useState<string | null>(null)
  const [personeelSubOpen, setPersoneelSubOpen] = useState<string | null>(null)
  const closeNav = () => { setNavOpen(false); setKassaOpen(false); setFlyoutOpen(null); setOnlineSubOpen(null) }
  const [cart, setCart] = useState<CartItem[]>([])
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN')
  const [tableNumber, setTableNumber] = useState('')
  const [numpadValue, setNumpadValue] = useState('')
  const [soundsOn, setSoundsOn] = useState(true)
  const [isOnline, setIsOnline] = useState<boolean | null>(null)
  const [langOpen, setLangOpen] = useState(false)
  const langRef = useRef<HTMLDivElement>(null)

  // Menu
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [products, setProducts] = useState<MenuProduct[]>([])
  const [selectedCategory, setSelectedCategory] = useState<MenuCategory | null>(null)
  const [menuLoading, setMenuLoading] = useState(true)
  const [productsWithOptions, setProductsWithOptions] = useState<string[]>([])

  const [showReservations, setShowReservations] = useState(false)
  const [showFloorPlan, setShowFloorPlan] = useState(false)
  const [showTablePicker, setShowTablePicker] = useState(false)
  const [kassaTables, setKassaTables] = useState<{ id: string; number: string; seats: number; status: string }[]>([])
  // Openstaande bestellingen per tafel: { "1": CartItem[], "2": CartItem[], ... }
  const [tableOrders, setTableOrders] = useState<Record<string, CartItem[]>>({})

  const tableOrdersKey = `vysion_table_orders_${tenant}`

  // Laad tafels + openstaande bestellingen (localStorage + Supabase sync)
  useEffect(() => {
    const raw = localStorage.getItem(`vysion_tables_${tenant}`)
    if (raw) {
      try { setKassaTables(JSON.parse(raw)) } catch { /* empty */ }
    }
    // Laad eerst uit localStorage (snel)
    const ordersRaw = localStorage.getItem(tableOrdersKey)
    if (ordersRaw) {
      try { setTableOrders(JSON.parse(ordersRaw)) } catch { /* empty */ }
    }
    // Sync met Supabase open orders (cross-device)
    supabase
      .from('orders')
      .select('table_number, items')
      .eq('tenant_slug', tenant)
      .eq('status', 'open')
      .then(({ data }) => {
        if (!data || data.length === 0) return
        const fromSupabase: Record<string, CartItem[]> = {}
        data.forEach(row => {
          if (row.table_number && row.items) {
            fromSupabase[row.table_number] = row.items as CartItem[]
          }
        })
        // Merge: Supabase wint bij conflicten (meest recent)
        setTableOrders(prev => {
          const merged = { ...prev, ...fromSupabase }
          localStorage.setItem(tableOrdersKey, JSON.stringify(merged))
          return merged
        })
      })
  }, [tenant, showTablePicker, tableOrdersKey])

  // Sla cart op voor huidige tafel
  const updateTableStatus = (tblNr: string, occupied: boolean) => {
    const tablesRaw = localStorage.getItem(`vysion_tables_${tenant}`)
    if (!tablesRaw) return
    try {
      const tbls = JSON.parse(tablesRaw)
      const updatedTbls = tbls.map((t: { number: string; status: string }) =>
        t.number === tblNr ? { ...t, status: occupied ? 'OCCUPIED' : 'FREE' } : t
      )
      localStorage.setItem(`vysion_tables_${tenant}`, JSON.stringify(updatedTbls))
      setKassaTables(updatedTbls)
    } catch { /* empty */ }
  }

  const saveCartToTable = (tblNr: string, items: CartItem[]) => {
    const updated = { ...tableOrders, [tblNr]: items }
    setTableOrders(updated)
    localStorage.setItem(tableOrdersKey, JSON.stringify(updated))
    updateTableStatus(tblNr, items.length > 0)
    // Sync open bestelling naar Supabase voor cross-device toegang
    supabase
      .from('orders')
      .delete()
      .eq('tenant_slug', tenant)
      .eq('table_number', tblNr)
      .eq('status', 'open')
      .then(() => {
        if (items.length > 0) {
          supabase.from('orders').insert({
            tenant_slug: tenant,
            order_number: 0,
            status: 'open',
            payment_status: 'pending',
            order_type: 'DINE_IN',
            table_number: tblNr,
            subtotal: 0,
            tax: 0,
            total_amount: 0,
            items: items as unknown as Record<string, unknown>[],
            created_at: new Date().toISOString(),
          })
        }
      })
  }

  // Bevestiging popup voor tafel wisselen
  const [switchConfirm, setSwitchConfirm] = useState<string | null>(null)

  const switchToTable = (newTableNr: string) => {
    if (tableNumber && cart.length > 0 && tableNumber !== newTableNr) {
      // Vraag bevestiging voordat je wisselt
      setSwitchConfirm(newTableNr)
      return
    }
    doSwitchToTable(newTableNr)
  }

  const doSwitchToTable = (newTableNr: string) => {
    if (tableNumber && cart.length > 0) {
      saveCartToTable(tableNumber, cart)
    }
    const existingOrder = tableOrders[newTableNr] || []
    setCart(existingOrder)
    setTableNumber(newTableNr)
    setOrderType('DINE_IN')
    setShowTablePicker(false)
    setSwitchConfirm(null)
  }

  // "Naar tafel" knop: sla bestelling op en leeg de kassa voor volgende tafel
  const parkOrder = () => {
    if (!tableNumber || cart.length === 0) return
    saveCartToTable(tableNumber, cart)
    setCart([])
    setTableNumber('')
  }

  // Betaling
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  type PaymentMethodType = 'CASH' | 'CARD' | 'IDEAL' | 'BANCONTACT'
  const [showSplitModal, setShowSplitModal] = useState(false)
  const [splitCash, setSplitCash] = useState(0)
  const [splitCard, setSplitCard] = useState(0)
  const [lastOrder, setLastOrder] = useState<{
    orderNumber: number
    items: CartItem[]
    total: number
    paymentMethod: PaymentMethodType
    orderType: OrderType
    tableNumber: string
    createdAt: Date
  } | null>(null)
  const [tenantInfo, setTenantInfo] = useState<TenantSettings | null>(null)

  // Opties modal
  const [optionsModal, setOptionsModal] = useState<{
    product: MenuProduct
    options: ProductOption[]
    selected: SelectedChoice[]
  } | null>(null)

  // Blokkeer body scroll (iPad Safari fix)
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
      document.documentElement.style.overflow = ''
    }
  }, [])

  // Laad categorieën, producten en welke producten opties hebben
  const loadMenu = async () => {
    setMenuLoading(true)
    const [cats, prods, withOpts] = await Promise.all([
      getMenuCategories(tenant),
      getMenuProducts(tenant),
      getProductsWithOptions(tenant),
    ])
    setCategories(cats.filter(c => c.is_active))
    setProducts(prods.filter(p => p.is_active))
    setProductsWithOptions(withOpts)
    setMenuLoading(false)
  }

  useEffect(() => {
    loadMenu()
    getTenantSettings(tenant).then(s => setTenantInfo(s))
  }, [tenant])

  // Herlaad menu wanneer pagina weer focus krijgt (na terugkeren van producten/categorieen pagina)
  useEffect(() => {
    const onFocus = () => loadMenu()
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [tenant])

  // Sound init
  useEffect(() => {
    setSoundsOn(getSoundsEnabled())
  }, [])

  // Online status check
  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch(`/api/shop/${tenant}/status`, { method: 'HEAD', cache: 'no-store' })
        setIsOnline(res.ok)
      } catch {
        setIsOnline(false)
      }
    }
    check()
    const interval = setInterval(check, 30000)
    return () => clearInterval(interval)
  }, [tenant])

  // Close language dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const toggleSound = () => {
    const next = !soundsOn
    setSoundsOn(next)
    setSoundsEnabled(next)
  }

  // ── Cart ─────────────────────────────────────────────────────────────────
  const syncTableOrder = (updatedCart: CartItem[]) => {
    if (!tableNumber) return
    const newOrders = { ...tableOrders, [tableNumber]: updatedCart }
    setTableOrders(newOrders)
    localStorage.setItem(tableOrdersKey, JSON.stringify(newOrders))
  }

  const addToCart = (product: MenuProduct, choices: SelectedChoice[] = []) => {
    const cartKey = choices.length > 0
      ? `${product.id}-${choices.map(c => c.choiceId).sort().join('-')}`
      : product.id!
    setCart(prev => {
      const existing = prev.find(i => i.cartKey === cartKey)
      const updated = existing
        ? prev.map(i => i.cartKey === cartKey ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { product, quantity: 1, choices, cartKey }]
      syncTableOrder(updated)
      return updated
    })
  }

  const handleProductClick = async (product: MenuProduct) => {
    if (productsWithOptions.includes(product.id!)) {
      const opts = await getOptionsForProduct(product.id!)
      setOptionsModal({ product, options: opts, selected: [] })
    } else {
      addToCart(product)
    }
  }

  const toggleChoice = (option: ProductOption, choice: ProductOptionChoice) => {
    setOptionsModal(prev => {
      if (!prev) return prev
      const isSingle = option.type === 'single'
      const alreadySelected = prev.selected.find(s => s.choiceId === choice.id)
      let newSelected: SelectedChoice[]
      if (alreadySelected) {
        newSelected = prev.selected.filter(s => s.choiceId !== choice.id)
      } else if (isSingle) {
        newSelected = [...prev.selected.filter(s => s.optionId !== option.id!), {
          optionId: option.id!, optionName: option.name,
          choiceId: choice.id!, choiceName: choice.name, price: choice.price
        }]
      } else {
        newSelected = [...prev.selected, {
          optionId: option.id!, optionName: option.name,
          choiceId: choice.id!, choiceName: choice.name, price: choice.price
        }]
      }
      return { ...prev, selected: newSelected }
    })
  }

  const confirmOptions = () => {
    if (!optionsModal) return
    const missing = optionsModal.options.filter(o => o.required && !optionsModal.selected.find(s => s.optionId === o.id))
    if (missing.length > 0) { alert(`Kies een ${missing[0].name}`); return }
    addToCart(optionsModal.product, optionsModal.selected)
    setOptionsModal(null)
  }

  const updateQty = (cartKey: string, qty: number) => {
    setCart(prev => {
      const updated = qty <= 0
        ? prev.filter(i => i.cartKey !== cartKey)
        : prev.map(i => i.cartKey === cartKey ? { ...i, quantity: qty } : i)
      if (tableNumber) {
        const newOrders = { ...tableOrders, [tableNumber]: updated }
        setTableOrders(newOrders)
        localStorage.setItem(tableOrdersKey, JSON.stringify(newOrders))
        // Zet tafel op FREE als cart leeg is
        const tablesRaw = localStorage.getItem(`vysion_tables_${tenant}`)
        if (tablesRaw) {
          try {
            const tbls = JSON.parse(tablesRaw)
            const updatedTbls = tbls.map((t: { number: string; status: string }) =>
              t.number === tableNumber ? { ...t, status: updated.length > 0 ? 'OCCUPIED' : 'FREE' } : t
            )
            localStorage.setItem(`vysion_tables_${tenant}`, JSON.stringify(updatedTbls))
            setKassaTables(updatedTbls)
          } catch { /* empty */ }
        }
      }
      return updated
    })
  }

  const clearCart = () => {
    setCart([])
    if (tableNumber) {
      const newOrders = { ...tableOrders, [tableNumber]: [] }
      setTableOrders(newOrders)
      localStorage.setItem(tableOrdersKey, JSON.stringify(newOrders))
    }
  }
  const total = cart.reduce((sum, i) => {
    const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
    return sum + (i.product.price + choicesTotal) * i.quantity
  }, 0)

  // ── Numpad ────────────────────────────────────────────────────────────────
  const handleNumpad = (key: string) => {
    if (key === 'C') { setNumpadValue(''); return }
    if (key === '=') {
      try {
        const expr = numpadValue.replace(/×/g, '*')
        // eslint-disable-next-line no-new-func
        const result = Function('"use strict"; return (' + expr + ')')()
        setNumpadValue(String(result))
      } catch { /* ongeldige expressie */ }
      return
    }
    if (['+', '-', '×'].includes(key)) {
      if (numpadValue && !['+', '-', '×'].some(op => numpadValue.endsWith(op)))
        setNumpadValue(numpadValue + key)
      return
    }
    if (key === '.') {
      const parts = numpadValue.split(/[+\-×]/)
      if (!parts[parts.length - 1].includes('.')) setNumpadValue(numpadValue + '.')
      return
    }
    setNumpadValue(numpadValue + key)
  }

  const addCustomAmount = () => {
    const amount = parseFloat(numpadValue)
    if (amount > 0) {
      const custom: MenuProduct = {
        id: `custom-${Date.now()}`,
        tenant_slug: tenant,
        category_id: null,
        name: `Bedrag €${amount.toFixed(2)}`,
        description: '',
        price: amount,
        image_url: '',
        is_active: true,
        is_popular: false,
        sort_order: 0,
        allergens: [],
      }
      setCart(prev => [...prev, { product: custom, quantity: 1, cartKey: custom.id! }])
      setNumpadValue('')
    }
  }

  const cycleOrderType = () => {
    const types: OrderType[] = ['DINE_IN', 'TAKEAWAY', 'DELIVERY']
    setOrderType(types[(types.indexOf(orderType) + 1) % types.length])
  }

  const offlineQueueKey = `vysion_offline_orders_${tenant}`

  // Retry offline queue bij reconnect
  useEffect(() => {
    const retryQueue = async () => {
      const raw = localStorage.getItem(offlineQueueKey)
      if (!raw) return
      try {
        const queue: object[] = JSON.parse(raw)
        if (queue.length === 0) return
        const remaining: object[] = []
        for (const order of queue) {
          const { error } = await supabase.from('orders').insert(order)
          if (error) remaining.push(order)
        }
        localStorage.setItem(offlineQueueKey, JSON.stringify(remaining))
      } catch { /* empty */ }
    }
    window.addEventListener('online', retryQueue)
    retryQueue() // ook bij pagina laden
    return () => window.removeEventListener('online', retryQueue)
  }, [tenant, offlineQueueKey])

  const clearTableAfterPayment = (tblNr: string) => {
    const updated = { ...tableOrders }
    delete updated[tblNr]
    setTableOrders(updated)
    localStorage.setItem(tableOrdersKey, JSON.stringify(updated))
    updateTableStatus(tblNr, false)
    // Verwijder open order uit Supabase
    supabase
      .from('orders')
      .delete()
      .eq('tenant_slug', tenant)
      .eq('table_number', tblNr)
      .eq('status', 'open')
  }

  const completePayment = async (method: PaymentMethodType) => {
    if (cart.length === 0) return
    const vatRate = tenantInfo?.btw_percentage ?? 6
    const subtotal = total / (1 + vatRate / 100)
    const tax = total - subtotal
    const createdAt = new Date()

    // Lokaal ordernummer berekenen (werkt ook offline)
    let orderNumber = Date.now() % 100000
    try {
      const { data: lastOrderRow } = await supabase
        .from('orders')
        .select('order_number')
        .eq('tenant_slug', tenant)
        .order('order_number', { ascending: false })
        .limit(1)
        .single()
      orderNumber = (lastOrderRow?.order_number ?? 1000) + 1
    } catch { /* offline: gebruik timestamp-gebaseerd nummer */ }

    const orderPayload = {
      tenant_slug: tenant,
      order_number: orderNumber,
      status: 'completed',
      payment_status: 'paid',
      payment_method: method,
      order_type: orderType,
      table_number: tableNumber || null,
      subtotal: Math.round(subtotal * 100) / 100,
      tax: Math.round(tax * 100) / 100,
      total_amount: total,
      items: cart.map(i => ({
        product_id: i.product.id,
        name: i.product.name,
        price: i.product.price,
        quantity: i.quantity,
        choices: i.choices || [],
      })),
      created_at: createdAt.toISOString(),
    }

    // Probeer Supabase, bij falen: sla op in offline queue
    const { error } = await supabase.from('orders').insert(orderPayload)
    if (error) {
      const raw = localStorage.getItem(offlineQueueKey)
      const queue = raw ? JSON.parse(raw) : []
      queue.push(orderPayload)
      localStorage.setItem(offlineQueueKey, JSON.stringify(queue))
      alert(`⚠️ Geen internetverbinding. Order #${orderNumber} is lokaal opgeslagen en wordt automatisch verstuurd zodra je weer online bent.`)
    }

    setLastOrder({ orderNumber, items: [...cart], total, paymentMethod: method, orderType, tableNumber, createdAt })

    if (tableNumber) clearTableAfterPayment(tableNumber)

    clearCart()
    setTableNumber('')
    setShowPaymentModal(false)
    setShowSuccessModal(true)
  }

  const printReceipt = (order: typeof lastOrder) => {
    if (!order) return
    const vatRate = tenantInfo?.btw_percentage ?? 6
    const subtotal = order.total / (1 + vatRate / 100)
    const tax = order.total - subtotal
    const orderTypeLabel =
      order.orderType === 'DINE_IN' ? '🍽️ Hier Opeten' :
      order.orderType === 'TAKEAWAY' ? '📦 Afhalen' : '🚗 Bezorgen'
    const payLabel =
      order.paymentMethod === 'CASH' ? 'Contant' :
      order.paymentMethod === 'CARD' ? 'PIN/Kaart' :
      order.paymentMethod === 'IDEAL' ? 'iDEAL' : 'Bancontact'

    const html = `<!DOCTYPE html><html><head><title>Bon #${order.orderNumber}</title><style>
      * { margin:0;padding:0;box-sizing:border-box; }
      body { font-family:'Courier New',monospace;font-size:12px;width:80mm;padding:10px; }
      .center { text-align:center; }
      .bold { font-weight:bold; }
      .big { font-size:16px; }
      .small { font-size:10px; }
      .divider { border-top:1px dashed #000;margin:8px 0; }
      .divider-solid { border-top:1px solid #000;margin:8px 0; }
      .row { display:flex;justify-content:space-between;margin:2px 0; }
      .total { font-size:18px;font-weight:bold;margin-top:8px; }
      .order-type { font-size:20px;font-weight:bold;margin:10px 0;padding:8px;border:2px solid #000; }
      @media print { body { width:auto; } }
    </style></head><body>
      <div class="center">
        <div class="bold big">${tenantInfo?.business_name || 'Vysion Horeca'}</div>
        ${tenantInfo?.address ? `<div class="small">${tenantInfo.address}</div>` : ''}
        ${(tenantInfo?.postal_code || tenantInfo?.city) ? `<div class="small">${tenantInfo.postal_code ?? ''} ${tenantInfo.city ?? ''}</div>` : ''}
        ${tenantInfo?.phone ? `<div class="small">Tel: ${tenantInfo.phone}</div>` : ''}
      </div>
      <div class="divider"></div>
      <div class="center order-type">${orderTypeLabel}${order.tableNumber ? `<br/>TAFEL ${order.tableNumber}` : ''}</div>
      <div class="row small">
        <span>Bon #${order.orderNumber}</span>
        <span>${order.createdAt.toLocaleString('nl-NL', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
      </div>
      <div class="divider-solid"></div>
      ${order.items.map(i => {
        const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
        const lineTotal = (i.product.price + choicesTotal) * i.quantity
        return `<div class="row"><span>${i.quantity}x ${i.product.name}</span><span>€${lineTotal.toFixed(2)}</span></div>
        ${(i.choices || []).map(c => `<div class="row small" style="margin-left:15px;color:#666;"><span>+ ${c.choiceName}</span><span>${c.price > 0 ? '€' + c.price.toFixed(2) : ''}</span></div>`).join('')}`
      }).join('')}
      <div class="divider-solid"></div>
      <div class="row"><span>Subtotaal</span><span>€${subtotal.toFixed(2)}</span></div>
      <div class="row"><span>BTW (${vatRate}%)</span><span>€${tax.toFixed(2)}</span></div>
      <div class="row total"><span>TOTAAL</span><span>€${order.total.toFixed(2)}</span></div>
      <div class="divider"></div>
      <div class="center small">Betaald met: ${payLabel}</div>
      <div class="divider"></div>
      <div class="center small">
        ${tenantInfo?.btw_number ? `BTW: ${tenantInfo.btw_number}<br/>` : ''}
        Bedankt voor uw bezoek!
        ${tenantInfo?.website ? `<br/>${tenantInfo.website}` : ''}
      </div>
    </body></html>`

    // iPad-safe print via blob URL + verborgen iframe
    try {
      const blob = new Blob([html], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const iframe = document.createElement('iframe')
      iframe.style.position = 'fixed'
      iframe.style.top = '-9999px'
      iframe.style.left = '-9999px'
      iframe.style.width = '80mm'
      iframe.style.height = '1px'
      iframe.src = url
      document.body.appendChild(iframe)
      iframe.onload = () => {
        setTimeout(() => {
          iframe.contentWindow?.print()
          setTimeout(() => {
            document.body.removeChild(iframe)
            URL.revokeObjectURL(url)
          }, 1000)
        }, 300)
      }
    } catch {
      // Fallback: window.open voor browsers die blob niet ondersteunen
      const w = window.open('', '_blank', 'width=400,height=600')
      if (w) { w.document.write(html); w.document.close() }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('vysion_tenant')
    window.location.href = '/login'
  }

  return (
    <div className="flex flex-col bg-[#e3e3e3] overflow-hidden" style={{ height: '100dvh' }}>

      {/* ── Blauwe navigatiebalk — volledige breedte ── */}
      <div className="flex-shrink-0 bg-[#1e293b] flex items-center px-3 gap-1 relative z-30" style={{ height: 68 }}>

        {/* Backdrop sluit alles */}
        {flyoutOpen && <div className="fixed inset-0 z-10" onClick={() => setFlyoutOpen(null)} />}

        {/* ── NAV ITEMS ── */}

        {/* Kassa */}
        <div className="relative z-20">
          <button onClick={() => setFlyoutOpen(flyoutOpen === 'kassa' ? null : 'kassa')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${flyoutOpen === 'kassa' ? 'bg-blue-600 text-white' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
            <span className="text-xl">🖥️</span>
            <span className="font-bold text-sm">Kassa</span>
            <svg className={`w-3.5 h-3.5 transition-transform ${flyoutOpen === 'kassa' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {flyoutOpen === 'kassa' && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-30" style={{ width: 240 }}>
              <div className="px-4 py-2.5 bg-[#1e293b] text-white text-xs font-bold uppercase tracking-wider">Kassa</div>
              <Link href={`${baseUrl}/kassa`} onClick={() => setFlyoutOpen(null)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 border-b border-gray-100 font-semibold text-[#3C4D6B] text-sm transition-colors"><span className="text-lg">🖥️</span> Ga naar kassa</Link>
              <Link href={`${baseUrl}/categorieen`} onClick={() => setFlyoutOpen(null)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 border-b border-gray-100 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">📁</span> Categorieën</Link>
              <Link href={`${baseUrl}/producten`} onClick={() => setFlyoutOpen(null)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 border-b border-gray-100 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">🍟</span> Producten</Link>
              <Link href={`${baseUrl}/opties`} onClick={() => setFlyoutOpen(null)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 border-b border-gray-100 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">➕</span> Opties & Extra&apos;s</Link>
              <Link href={`${baseUrl}/allergenen`} onClick={() => setFlyoutOpen(null)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 border-b border-gray-100 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">⚠️</span> Allergenen</Link>
              <Link href={`${baseUrl}/bonnenprinter`} onClick={() => setFlyoutOpen(null)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 border-b border-gray-100 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">🖨️</span> Bonnenprinter</Link>
              <Link href={`${baseUrl}/labels`} onClick={() => setFlyoutOpen(null)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">🏷️</span> Labels</Link>
            </div>
          )}
        </div>

        {/* Online Platform — accordion dropdown */}
        <div className="relative z-20">
          <button onClick={() => { setFlyoutOpen(flyoutOpen === 'online' ? null : 'online'); setOnlineSubOpen(null) }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${flyoutOpen === 'online' ? 'bg-blue-600 text-white' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
            <span className="text-xl">🛒</span>
            <span className="font-bold text-sm">Online</span>
            <svg className={`w-3.5 h-3.5 transition-transform ${flyoutOpen === 'online' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {flyoutOpen === 'online' && (() => {
            const sections = [
              { key: 'overzicht', icon: '📊', label: 'Overzicht', items: [
                { icon: '📊', label: 'Dashboard', href: '' },
                { icon: '📈', label: 'Bedrijfsanalyse', href: '/analyse' },
                { icon: '💰', label: 'Verkoop', href: '/verkoop' },
                { icon: '🔥', label: 'Populaire items', href: '/populair' },
                { icon: '💎', label: 'Abonnement', href: '/abonnement' },
              ]},
              { key: 'instellingen', icon: '⚙️', label: 'Instellingen', items: [
                { icon: '🔴', label: 'Online Status', href: '/online-status' },
                { icon: '🏪', label: 'Bedrijfsprofiel', href: '/profiel' },
                { icon: '🕐', label: 'Openingstijden', href: '/openingstijden' },
                { icon: '🚗', label: 'Levering & Afhaal', href: '/levering' },
                { icon: '💳', label: 'Betaalmethoden', href: '/betaling' },
                { icon: '🎨', label: 'Design & Kleuren', href: '/design' },
                { icon: '🔍', label: 'SEO', href: '/seo' },
              ]},
              { key: 'menu', icon: '🍽️', label: 'Menu', items: [
                { icon: '📁', label: 'Categorieën', href: '/categorieen' },
                { icon: '🍟', label: 'Producten', href: '/producten' },
                { icon: '➕', label: "Opties & Extra's", href: '/opties' },
                { icon: '⚠️', label: 'Allergenen', href: '/allergenen' },
                { icon: '📷', label: "Foto's & Media", href: '/media' },
              ]},
              { key: 'whatsapp', icon: '💬', label: 'WhatsApp', items: [
                { icon: '⚙️', label: 'Instellingen', href: '/whatsapp' },
              ]},
              { key: 'klanten', icon: '👥', label: 'Klanten', items: [
                { icon: '👥', label: 'Klantenlijst', href: '/klanten' },
                { icon: '🎁', label: 'Beloningen', href: '/klanten/beloningen' },
              ]},
              { key: 'bestellingen', icon: '📦', label: 'Bestellingen', items: [
                { icon: '📦', label: 'Bestellingenlijst', href: '/bestellingen' },
                { icon: '📅', label: 'Reserveringen', href: '/reserveringen' },
              ]},
              { key: 'groepen', icon: '👥', label: 'Groepsbestellingen', items: [
                { icon: '🏢', label: 'Groepen', href: '/groepen' },
                { icon: '📋', label: 'Sessies', href: '/groepen/sessies' },
                { icon: '📦', label: 'Overzicht', href: '/groepen/bestellingen' },
                { icon: '🏷️', label: 'Labelprinter', href: '/labels' },
              ]},
              { key: 'marketing', icon: '📣', label: 'Marketing', items: [
                { icon: '📧', label: 'Marketing', href: '/marketing' },
                { icon: '📱', label: 'QR Codes', href: '/qr-codes' },
                { icon: '🎁', label: 'Promoties', href: '/promoties' },
                { icon: '⭐', label: 'Reviews', href: '/reviews' },
              ]},
            ]
            const activeSec = sections.find(s => s.key === onlineSubOpen)
            return (
              <div className="absolute top-full left-0 mt-1 flex z-30">
                {/* Eerste kolom: secties */}
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-y-auto" style={{ width: 240, maxHeight: '82vh' }}>
                  <div className="px-4 py-2.5 bg-[#1e293b] text-white text-xs font-bold uppercase tracking-wider sticky top-0 rounded-t-2xl">Online Platform</div>
                  {sections.map(sec => (
                    <button key={sec.key}
                      onClick={() => setOnlineSubOpen(onlineSubOpen === sec.key ? null : sec.key)}
                      className={`w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0 transition-colors ${onlineSubOpen === sec.key ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{sec.icon}</span>
                        <span className="font-semibold text-sm text-gray-700">{sec.label}</span>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${onlineSubOpen === sec.key ? 'text-blue-500' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  ))}
                </div>
                {/* Tweede popup: sub-items rechts naast eerste */}
                {activeSec && (
                  <div className="ml-2 bg-white rounded-2xl shadow-2xl border border-gray-100 z-30 overflow-y-auto" style={{ width: 220, maxHeight: '82vh' }}>
                    <div className="px-4 py-2.5 bg-[#1e293b] text-white text-xs font-bold uppercase tracking-wider sticky top-0 rounded-t-2xl flex items-center gap-2">
                      <span>{activeSec.icon}</span> {activeSec.label}
                    </div>
                    {activeSec.items.map(item => (
                      <Link key={item.href} href={`${baseUrl}${item.href}`} onClick={() => { setFlyoutOpen(null); setOnlineSubOpen(null) }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 text-sm text-gray-700 transition-colors">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {/* Personeel */}
        <div className="relative z-20">
          <button onClick={() => { setFlyoutOpen(flyoutOpen === 'personeel' ? null : 'personeel'); setPersoneelSubOpen(null) }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${flyoutOpen === 'personeel' ? 'bg-blue-600 text-white' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
            <span className="text-xl">👔</span>
            <span className="font-bold text-sm">Personeel</span>
            <svg className={`w-3.5 h-3.5 transition-transform ${flyoutOpen === 'personeel' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {flyoutOpen === 'personeel' && (() => {
            const sections = [
              { key: 'medewerkers', icon: '👥', label: 'Medewerkers', items: [
                { icon: '👤', label: 'Medewerkers', href: '/personeel' },
                { icon: '🏢', label: 'Team', href: '/team' },
              ]},
              { key: 'uren', icon: '⏱️', label: 'Urenregistratie', items: [
                { icon: '⏱️', label: 'Urenregistratie', href: '/personeel' },
              ]},
              { key: 'vacatures', icon: '📋', label: 'Vacatures', items: [
                { icon: '📋', label: 'Vacatures', href: '/vacatures' },
              ]},
            ]
            const activeSec = sections.find(s => s.key === personeelSubOpen)
            return (
              <div className="absolute top-full left-0 mt-1 flex z-30">
                <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-y-auto" style={{ width: 240, maxHeight: '82vh' }}>
                  <div className="px-4 py-2.5 bg-[#1e293b] text-white text-xs font-bold uppercase tracking-wider sticky top-0 rounded-t-2xl">Personeel</div>
                  {sections.map(sec => (
                    <button key={sec.key}
                      onClick={() => setPersoneelSubOpen(personeelSubOpen === sec.key ? null : sec.key)}
                      className={`w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0 transition-colors ${personeelSubOpen === sec.key ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{sec.icon}</span>
                        <span className="font-semibold text-sm text-gray-700">{sec.label}</span>
                      </div>
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </button>
                  ))}
                </div>
                {activeSec && (
                  <div className="ml-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-y-auto" style={{ width: 220, maxHeight: '82vh' }}>
                    <div className="px-4 py-2.5 bg-[#1e293b] text-white text-xs font-bold uppercase tracking-wider sticky top-0 rounded-t-2xl flex items-center gap-2">
                      <span>{activeSec.icon}</span> {activeSec.label}
                    </div>
                    {activeSec.items.map(item => (
                      <Link key={item.href} href={`${baseUrl}${item.href}`} onClick={() => { setFlyoutOpen(null); setPersoneelSubOpen(null) }}
                        className="flex items-center gap-3 px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-0 text-sm text-gray-700 transition-colors">
                        <span>{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )
          })()}
        </div>

        {/* Kostenberekening */}
        <div className="relative z-20">
          <button onClick={() => setFlyoutOpen(flyoutOpen === 'kosten' ? null : 'kosten')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${flyoutOpen === 'kosten' ? 'bg-blue-600 text-white' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
            <span className="text-xl">🧮</span>
            <span className="font-bold text-sm">Kosten</span>
            <svg className={`w-3.5 h-3.5 transition-transform ${flyoutOpen === 'kosten' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {flyoutOpen === 'kosten' && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-30" style={{ width: 240 }}>
              <div className="px-4 py-2.5 bg-[#1e293b] text-white text-xs font-bold uppercase tracking-wider">Kostenberekening</div>
              <Link href={`${baseUrl}/kosten`} onClick={() => setFlyoutOpen(null)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 border-b border-gray-100 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">📊</span> Overzicht</Link>
              <Link href={`${baseUrl}/kosten/instellingen`} onClick={() => setFlyoutOpen(null)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 border-b border-gray-100 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">⚙️</span> Instellingen</Link>
              <Link href={`${baseUrl}/analyse`} onClick={() => setFlyoutOpen(null)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">📈</span> Analyse</Link>
            </div>
          )}
        </div>

        {/* GKS Rapporten */}
        <div className="relative z-20">
          <button onClick={() => setFlyoutOpen(flyoutOpen === 'gks' ? null : 'gks')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${flyoutOpen === 'gks' ? 'bg-blue-600 text-white' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
            <span className="text-xl">🧾</span>
            <span className="font-bold text-sm">GKS</span>
            <svg className={`w-3.5 h-3.5 transition-transform ${flyoutOpen === 'gks' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {flyoutOpen === 'gks' && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-30" style={{ width: 240 }}>
              <div className="px-4 py-2.5 bg-[#1e293b] text-white text-xs font-bold uppercase tracking-wider">GKS Rapporten</div>
              <Link href={`${baseUrl}/z-rapport`} onClick={() => setFlyoutOpen(null)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 border-b border-gray-100 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">🧾</span> Z-Rapporten</Link>
              <Link href={`${baseUrl}/verkoop`} onClick={() => setFlyoutOpen(null)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">📊</span> Verkoop</Link>
            </div>
          )}
        </div>

        {/* Reservaties */}
        <div className="relative z-20">
          <button onClick={() => setFlyoutOpen(flyoutOpen === 'reservaties' ? null : 'reservaties')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${flyoutOpen === 'reservaties' ? 'bg-blue-600 text-white' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
            <span className="text-xl">📅</span>
            <span className="font-bold text-sm">Reservaties</span>
            <svg className={`w-3.5 h-3.5 transition-transform ${flyoutOpen === 'reservaties' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {flyoutOpen === 'reservaties' && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-30" style={{ width: 240 }}>
              <div className="px-4 py-2.5 bg-[#1e293b] text-white text-xs font-bold uppercase tracking-wider">Reservaties</div>
              <button onClick={() => { setFlyoutOpen(null); setShowReservations(true) }} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 border-b border-gray-100 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">📅</span> Reservaties beheren</button>
              <button onClick={() => { setFlyoutOpen(null); setShowReservations(true) }} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">⚙️</span> Instellingen</button>
            </div>
          )}
        </div>

        {/* Shop */}
        <div className="relative z-20">
          <button onClick={() => setFlyoutOpen(flyoutOpen === 'shop' ? null : 'shop')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-colors ${flyoutOpen === 'shop' ? 'bg-blue-600 text-white' : 'text-white/90 hover:bg-white/10 hover:text-white'}`}>
            <span className="text-xl">🔗</span>
            <span className="font-bold text-sm">Shop</span>
            <svg className={`w-3.5 h-3.5 transition-transform ${flyoutOpen === 'shop' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {flyoutOpen === 'shop' && (
            <div className="absolute top-full left-0 mt-1 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-30" style={{ width: 240 }}>
              <div className="px-4 py-2.5 bg-[#1e293b] text-white text-xs font-bold uppercase tracking-wider">Mijn Shop</div>
              <Link href={`/shop/${tenant}`} target="_blank" onClick={() => setFlyoutOpen(null)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 border-b border-gray-100 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">🔗</span> Bekijk je shop</Link>
              <Link href={`${baseUrl}/design`} onClick={() => setFlyoutOpen(null)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 border-b border-gray-100 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">🎨</span> Design</Link>
              <Link href={`${baseUrl}/seo`} onClick={() => setFlyoutOpen(null)} className="flex items-center gap-3 px-4 py-3.5 hover:bg-blue-50 font-semibold text-gray-700 text-sm transition-colors"><span className="text-lg">🔍</span> SEO</Link>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* ── RECHTS: online status + geluid + taal + uitloggen ── */}

        {/* Geluid */}
        <button onClick={toggleSound}
          className={`w-9 h-9 rounded-lg flex items-center justify-center text-xl transition-colors ${soundsOn ? 'bg-green-500/80 text-white' : 'bg-white/10 text-white/60'}`}
          title={soundsOn ? 'Geluid aan' : 'Geluid uit'}>
          {soundsOn ? '🔔' : '🔕'}
        </button>

        {/* Taal */}
        <div ref={langRef} className="relative z-20">
          <button onClick={() => setLangOpen(o => !o)}
            className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-xl font-medium text-white transition-colors">
            <span className="text-2xl">{localeFlags[locale]}</span>
            <span className="text-sm font-bold">{(localeNames[locale] || '').slice(0, 2).toUpperCase()}</span>
            <svg className={`w-4 h-4 transition-transform ${langOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
          {langOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-xl border border-gray-200 z-50 min-w-[160px] overflow-hidden">
              {locales.map(lang => (
                <button key={lang} onClick={() => { setLocale(lang); setLangOpen(false) }}
                  className={`w-full flex items-center gap-2 px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm ${locale === lang ? 'bg-blue-50 text-blue-600 font-semibold' : 'text-gray-700'}`}>
                  <span>{localeFlags[lang]}</span>
                  <span>{localeNames[lang]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Uitloggen */}
        <button onClick={handleLogout}
          className="flex items-center gap-1.5 px-3 py-2 bg-red-600/80 hover:bg-red-600 rounded-lg text-white text-sm font-bold transition-colors ml-1">
          <span className="text-lg">🚪</span>
          <span>Uit</span>
        </button>

      </div>

      {/* ── Body: midden + rechts ── */}
      <div className="flex flex-1 overflow-hidden min-h-0">

        {/* ── Midden: categorieën / producten ── */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">

          {/* Sub-header: terugknop bij producten */}
          {selectedCategory && (
            <div className="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-[#e3e3e3] border-b border-gray-300">
              <button
                onClick={() => setSelectedCategory(null)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-100 transition-colors"
              >
                ← Terug
              </button>
              <span className="text-lg font-bold text-gray-800">
                {selectedCategory.icon && <span className="mr-1">{selectedCategory.icon}</span>}
                {selectedCategory.name}
              </span>
            </div>
          )}

          {/* Grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {menuLoading ? (
              <div className="flex items-center justify-center h-full text-gray-400 text-lg">Laden...</div>
            ) : !selectedCategory ? (
              /* Categorieën grid — 4 kolommen */
              categories.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400">
                  <span className="text-5xl mb-3">📂</span>
                  <p className="font-semibold">Nog geen categorieën</p>
                  <p className="text-sm mt-1">Voeg categorieën toe via het Online Platform</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {categories.map(cat => {
                    const catImage = products.find(p => p.category_id === cat.id && p.image_url)?.image_url
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat)}
                        className="aspect-square relative rounded-xl overflow-hidden active:scale-95 transition-transform"
                        style={{ backgroundColor: '#3C4D6B', boxShadow: '0 8px 30px rgba(0,0,0,0.35)' }}
                      >
                        {catImage && (
                          <img src={catImage} alt={cat.name} className="absolute inset-0 w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute inset-0 flex flex-col items-center justify-end p-2">
                          {cat.icon && <span className="text-2xl mb-0.5">{cat.icon}</span>}
                          <span className="font-bold text-white text-xl text-center leading-tight drop-shadow-lg">{cat.name}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )
            ) : (
              /* Producten grid — 4 kolommen */
              (() => {
                const filtered = products.filter(p => p.category_id === selectedCategory.id)
                return filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <span className="text-5xl mb-3">🍽️</span>
                    <p className="font-semibold">Geen producten in deze categorie</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-4">
                    {filtered.map(product => {
                      const inCart = cart.filter(i => i.product.id === product.id).reduce((s, i) => s + i.quantity, 0)
                      const hasOpts = productsWithOptions.includes(product.id!)
                      return (
                        <button
                          key={product.id}
                          onClick={() => handleProductClick(product)}
                          className="flex flex-col bg-white rounded-xl overflow-hidden active:scale-95 transition-transform relative"
                          style={{ boxShadow: '0 8px 30px rgba(0,0,0,0.35)' }}
                        >
                          <div className="aspect-square w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                            {product.image_url
                              ? <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                              : <span className="text-3xl text-gray-300">🍽️</span>
                            }
                          </div>
                          {inCart > 0 && (
                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-[#3C4D6B] text-white text-xs font-bold flex items-center justify-center shadow">
                              {inCart}
                            </div>
                          )}
                          {hasOpts && (
                            <div className="absolute bottom-8 right-1 text-xs bg-amber-400 text-white rounded px-1 font-bold">+</div>
                          )}
                          <div className="p-2 text-left">
                            <p className="font-semibold text-sm text-gray-800 leading-tight line-clamp-2">{product.name}</p>
                            <p className="text-[#3C4D6B] font-bold text-sm mt-0.5">€{product.price.toFixed(2)}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )
              })()
            )}
          </div>
        </div>

        {/* ── Rechts: numpad / cart ── */}
        <div className="w-80 sm:w-96 lg:w-[380px] bg-white border-l border-gray-200 flex flex-col flex-shrink-0 min-h-0 overflow-hidden">

        {/* Tafel knop */}
        {orderType === 'DINE_IN' && (
          <div className="px-3 pt-3 relative">
            <button
              onClick={() => setShowTablePicker(p => !p)}
              className="w-full py-3 rounded-xl bg-[#3C4D6B] hover:bg-[#2D3A52] text-white font-bold text-base transition-colors"
            >
              {tableNumber ? `🪑 Tafel ${tableNumber}` : 'Kies tafel...'}
            </button>

            {/* Tafel picker popup */}
            {showTablePicker && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowTablePicker(false)} />
                <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
                  <div className="p-3 border-b bg-gray-50">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Kies tafel</p>
                  </div>
                  {kassaTables.length === 0 ? (
                    <div className="p-4 text-center text-gray-400 text-sm">
                      Nog geen tafels aangemaakt
                    </div>
                  ) : (
                    <div className="p-2 grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                      {kassaTables.map(t => (
                        <button
                          key={t.id}
                          onClick={() => switchToTable(t.number)}
                          className={`py-3 rounded-xl font-bold text-sm transition-colors border-2 relative ${
                            tableNumber === t.number
                              ? 'bg-[#3C4D6B] text-white border-[#3C4D6B]'
                              : t.status === 'FREE'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                              : t.status === 'UNPAID'
                              ? 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100'
                              : 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                          }`}
                        >
                          <div className="text-lg">🪑</div>
                          <div>{t.number}</div>
                          <div className="text-[10px] opacity-70">
                            {t.status === 'FREE' ? 'Vrij' : t.status === 'OCCUPIED' ? 'Bezet' : 'Onbetaald'}
                          </div>
                          {tableOrders[t.number] && tableOrders[t.number].length > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                              {tableOrders[t.number].length}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="p-2 border-t bg-gray-50 flex gap-2">
                    {tableNumber && (
                      <button
                        onClick={() => { setTableNumber(''); setShowTablePicker(false) }}
                        className="flex-1 py-2 rounded-xl bg-red-50 text-red-600 font-semibold text-sm hover:bg-red-100 transition-colors"
                      >
                        ✕ Geen tafel
                      </button>
                    )}
                    <button
                      onClick={() => { setShowTablePicker(false); setShowFloorPlan(true) }}
                      className="flex-1 py-2 rounded-xl bg-[#3C4D6B] text-white font-semibold text-sm hover:bg-[#2D3A52] transition-colors"
                    >
                      🗺️ Plattegrond
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Besteltype banner */}
        <button
          onClick={cycleOrderType}
          className={`mx-3 mt-2 py-3 rounded-xl font-bold text-lg uppercase tracking-wide transition-colors ${
            orderType === 'DINE_IN' ? 'bg-[#3C4D6B] text-white' :
            orderType === 'TAKEAWAY' ? 'bg-amber-500 text-black' :
            'bg-blue-600 text-white'
          }`}
        >
          {orderType === 'DINE_IN' && `🍽️ HIER OPETEN${tableNumber ? ` • Tafel ${tableNumber}` : ''}`}
          {orderType === 'TAKEAWAY' && '📦 AFHALEN'}
          {orderType === 'DELIVERY' && '🚗 LEVERING'}
        </button>

        {/* Cart of Numpad */}
        <div className="flex-1 overflow-y-auto px-3 pt-2 flex flex-col">
          {cart.length === 0 ? (
            <div className="flex flex-col flex-1">
              <div className="bg-[#e3e3e3] rounded-xl px-4 py-3 mb-3">
                <input
                  type="text"
                  value={numpadValue}
                  readOnly
                  placeholder="0.00"
                  className="w-full text-right text-3xl font-bold bg-transparent border-none outline-none text-black"
                />
              </div>
              <div className="grid grid-cols-4 gap-2 flex-1">
                {['7','8','9','+','4','5','6','-','1','2','3','×','C','0','.','='].map(key => (
                  <button
                    key={key}
                    onClick={() => handleNumpad(key)}
                    className={`rounded-xl font-bold text-2xl transition-colors ${
                      key === 'C' ? 'bg-[#3C4D6B] text-white hover:bg-[#2D3A52]'
                      : key === '=' ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                      : ['+','-','×'].includes(key) ? 'bg-[#3C4D6B] text-white hover:bg-[#2D3A52]'
                      : 'bg-[#e3e3e3] text-black hover:bg-gray-200'
                    }`}
                  >
                    {key}
                  </button>
                ))}
              </div>
              {numpadValue && parseFloat(numpadValue) > 0 && (
                <button
                  onClick={addCustomAmount}
                  className="mt-3 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg transition-colors"
                >
                  + €{parseFloat(numpadValue || '0').toFixed(2)} toevoegen
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {cart.map(item => {
                const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
                return (
                  <div key={item.cartKey} className="bg-gray-50 rounded-xl p-3 flex items-center gap-3 border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{item.product.name}</p>
                      {item.choices && item.choices.length > 0 && (
                        <p className="text-xs text-gray-400 truncate">{item.choices.map(c => c.choiceName).join(', ')}</p>
                      )}
                      <p className="text-[#3C4D6B] font-bold">€{((item.product.price + choicesTotal) * item.quantity).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQty(item.cartKey, item.quantity - 1)}
                        className="w-9 h-9 rounded-lg bg-red-500 text-white font-bold text-lg flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        {item.quantity === 1 ? '🗑' : '−'}
                      </button>
                      <span className="w-6 text-center font-bold text-lg">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.cartKey, item.quantity + 1)}
                        className="w-9 h-9 rounded-lg bg-[#3C4D6B] text-white font-bold text-lg flex items-center justify-center hover:bg-[#2D3A52] transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Totaal + knoppen */}
        <div className="border-t border-gray-200 p-3 space-y-2">
          <div className="flex justify-between items-center py-2 border-b border-gray-100">
            <span className="font-bold text-gray-700 text-lg">Totaal</span>
            <span className="font-bold text-[#3C4D6B] text-2xl">€{total.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button className="flex flex-col items-center gap-1 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors">
              <span className="text-xl">💰</span>
              <span className="text-xs font-semibold">Lade open</span>
            </button>
            <button className="flex flex-col items-center gap-1 py-3 bg-sky-500 hover:bg-sky-600 text-white rounded-xl transition-colors">
              <span className="text-xl">🖨️</span>
              <span className="text-xs font-semibold">Print opnieuw</span>
            </button>
            <button
              onClick={clearCart}
              disabled={cart.length === 0}
              className="flex flex-col items-center gap-1 py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl transition-colors disabled:opacity-40"
            >
              <span className="text-xl">🗑️</span>
              <span className="text-xs font-semibold">Verwijder</span>
            </button>
          </div>
          {orderType === 'DINE_IN' && tableNumber && cart.length > 0 && (
            <button
              onClick={parkOrder}
              className="w-full py-3 rounded-xl bg-[#3C4D6B] hover:bg-[#2D3A52] text-white font-bold text-base transition-colors flex items-center justify-center gap-2"
            >
              🪑 Naar tafel {tableNumber}
            </button>
          )}
          <button
            onClick={() => { if (cart.length > 0) setShowPaymentModal(true) }}
            disabled={cart.length === 0}
            className="w-full py-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xl transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            💳 Afrekenen
          </button>
        </div>
        </div>
      </div>

      {/* ── Bevestiging: Tafel wisselen ── */}
      {switchConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 flex flex-col gap-4">
            <div className="text-center">
              <div className="text-4xl mb-2">🪑</div>
              <h2 className="font-bold text-xl text-gray-800">Tafel wisselen?</h2>
              <p className="text-gray-500 mt-1 text-sm">
                Je hebt nog items op tafel <strong>{tableNumber}</strong>.<br/>
                Die bestelling wordt opgeslagen. Wil je verder naar tafel <strong>{switchConfirm}</strong>?
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSwitchConfirm(null)}
                className="flex-1 py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
              >
                Annuleer
              </button>
              <button
                onClick={() => doSwitchToTable(switchConfirm)}
                className="flex-1 py-3 rounded-xl bg-[#3C4D6B] text-white font-bold hover:bg-[#2D3A52] transition-colors"
              >
                Wissel naar {switchConfirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Opties Modal ── */}
      {optionsModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b">
              {optionsModal.product.image_url && (
                <img src={optionsModal.product.image_url} alt={optionsModal.product.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg truncate">{optionsModal.product.name}</p>
                <p className="text-[#3C4D6B] font-bold">
                  €{(optionsModal.product.price + optionsModal.selected.reduce((s, c) => s + c.price, 0)).toFixed(2)}
                </p>
              </div>
              <button onClick={() => setOptionsModal(null)} className="p-2 hover:bg-gray-100 rounded-xl">✕</button>
            </div>

            {/* Opties */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              {optionsModal.options.map(option => (
                <div key={option.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-bold text-gray-800">{option.name}</p>
                    {option.required && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold">Verplicht</span>}
                    {option.type === 'multiple' && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Meerdere</span>}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {(option.choices || []).map(choice => {
                      const isSelected = optionsModal.selected.some(s => s.choiceId === choice.id)
                      return (
                        <button
                          key={choice.id}
                          onClick={() => toggleChoice(option, choice)}
                          className={`flex items-center justify-between px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                            isSelected ? 'border-[#3C4D6B] bg-[#3C4D6B] text-white' : 'border-gray-200 hover:border-[#3C4D6B] text-gray-700'
                          }`}
                        >
                          <span>{choice.name}</span>
                          {choice.price > 0 && <span className={isSelected ? 'text-white/80' : 'text-gray-400'}>+€{choice.price.toFixed(2)}</span>}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 border-t flex gap-3">
              <button onClick={() => setOptionsModal(null)} className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold text-gray-700">Annuleer</button>
              <button onClick={confirmOptions} className="flex-[2] py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg">
                + Toevoegen €{(optionsModal.product.price + optionsModal.selected.reduce((s, c) => s + c.price, 0)).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Plattegrond / Tafelkeuze ── */}
      {showFloorPlan && (
        <KassaFloorPlan
          tenant={tenant}
          onSelectTable={(nr) => switchToTable(nr)}
          onClose={() => setShowFloorPlan(false)}
        />
      )}

      {showReservations && (
        <KassaReservationsView
          tenant={tenant}
          kassaTables={kassaTables}
          onClose={() => setShowReservations(false)}
          onStartOrder={(tableNr) => { switchToTable(tableNr); setShowReservations(false) }}
        />
      )}

      {/* ── Betaalmodal ── */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-semibold">Betalen</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-2 rounded-lg hover:bg-gray-100 text-2xl">✕</button>
            </div>
            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-gray-500">Te betalen</p>
                <p className="text-5xl font-bold text-[#3C4D6B]">€{total.toFixed(2)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {([
                  { method: 'CASH' as const, label: 'Contant', icon: '💵', color: '#10b981' },
                  { method: 'CARD' as const, label: 'PIN/Kaart', icon: '💳', color: '#3b82f6' },
                  { method: 'IDEAL' as const, label: 'iDEAL', icon: '📱', color: '#ec4899' },
                  { method: 'BANCONTACT' as const, label: 'Bancontact', icon: '🏦', color: '#f59e0b' },
                ] as const).map(pm => (
                  <button
                    key={pm.method}
                    onClick={() => completePayment(pm.method)}
                    className="flex flex-col items-center justify-center h-32 gap-3 rounded-xl border-2 bg-gray-50 hover:scale-[1.02] transition-transform font-semibold text-lg"
                    style={{ borderColor: pm.color }}
                  >
                    <span className="text-4xl">{pm.icon}</span>
                    <span style={{ color: pm.color }}>{pm.label}</span>
                  </button>
                ))}
                {/* Gesplitst Betalen — volle breedte */}
                <button
                  onClick={() => { setSplitCash(0); setSplitCard(total); setShowSplitModal(true); setShowPaymentModal(false) }}
                  className="col-span-2 flex flex-col items-center justify-center h-32 gap-3 rounded-xl border-2 bg-gray-50 hover:scale-[1.02] transition-transform font-semibold text-lg"
                  style={{ borderColor: '#8b5cf6' }}
                >
                  <span className="text-4xl">👛</span>
                  <span style={{ color: '#8b5cf6' }}>Gesplitst Betalen</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Gesplitst Betalen modal ── */}
      {showSplitModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <span className="text-purple-500">👛</span> Gesplitst Betalen
              </h3>
              <button onClick={() => { setShowSplitModal(false); setShowPaymentModal(true) }} className="p-2 rounded-lg hover:bg-gray-100 text-2xl">✕</button>
            </div>
            <div className="p-6 space-y-5">
              {/* Totaal */}
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-gray-500">Totaal te betalen</p>
                <p className="text-4xl font-bold text-[#3C4D6B]">€{total.toFixed(2)}</p>
              </div>
              {/* Contant */}
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-gray-500 text-sm">💵 Contant bedrag</label>
                <input
                  type="number"
                  value={splitCash || ''}
                  onChange={(e) => { const v = parseFloat(e.target.value) || 0; setSplitCash(v); setSplitCard(Math.max(0, total - v)) }}
                  className="w-full px-4 py-4 text-2xl font-bold rounded-xl bg-white border-2 border-green-400 focus:border-green-500 outline-none"
                  placeholder="0.00" step="0.01" min="0"
                />
              </div>
              {/* Kaart */}
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-gray-500 text-sm">💳 Kaart bedrag</label>
                <input
                  type="number"
                  value={splitCard || ''}
                  onChange={(e) => { const v = parseFloat(e.target.value) || 0; setSplitCard(v); setSplitCash(Math.max(0, total - v)) }}
                  className="w-full px-4 py-4 text-2xl font-bold rounded-xl bg-white border-2 border-blue-400 focus:border-blue-500 outline-none"
                  placeholder="0.00" step="0.01" min="0"
                />
              </div>
              {/* Snelle knoppen */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: '50/50', cash: total / 2, card: total / 2 },
                  { label: '100% 💵', cash: total, card: 0 },
                  { label: '100% 💳', cash: 0, card: total },
                ].map(opt => (
                  <button key={opt.label} onClick={() => { setSplitCash(opt.cash); setSplitCard(opt.card) }}
                    className="py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold transition-colors">
                    {opt.label}
                  </button>
                ))}
              </div>
              {/* Resterende indicator */}
              {Math.abs(total - splitCash - splitCard) > 0.01 && (
                <div className={`p-3 rounded-xl text-center text-sm font-semibold ${(total - splitCash - splitCard) > 0 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700'}`}>
                  {(total - splitCash - splitCard) > 0
                    ? `Nog te betalen: €${(total - splitCash - splitCard).toFixed(2)}`
                    : `Te veel: €${Math.abs(total - splitCash - splitCard).toFixed(2)}`}
                </div>
              )}
              {/* Bevestigen */}
              <button
                onClick={() => { if (Math.abs(total - splitCash - splitCard) < 0.01) { completePayment('CASH'); setShowSplitModal(false) } }}
                disabled={Math.abs(total - splitCash - splitCard) > 0.01}
                className="w-full py-4 rounded-xl bg-purple-500 hover:bg-purple-600 text-white font-bold text-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ✓ Betalen €{(splitCash + splitCard).toFixed(2)}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Succes modal met kassabon ── */}
      {showSuccessModal && lastOrder && (() => {
        const vatRate = tenantInfo?.btw_percentage ?? 6
        const subtotal = lastOrder.total / (1 + vatRate / 100)
        const tax = lastOrder.total - subtotal
        const orderTypeLabel =
          lastOrder.orderType === 'DINE_IN' ? '🍽️ Hier Opeten' :
          lastOrder.orderType === 'TAKEAWAY' ? '📦 Afhalen' : '🚗 Bezorgen'
        const payLabel =
          lastOrder.paymentMethod === 'CASH' ? 'Contant' :
          lastOrder.paymentMethod === 'CARD' ? 'PIN/Kaart' :
          lastOrder.paymentMethod === 'IDEAL' ? 'iDEAL' : 'Bancontact'
        return (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl overflow-hidden max-w-md w-full my-4 shadow-2xl">
              {/* Header */}
              <div className="p-4 bg-emerald-500 text-white text-center">
                <div className="w-16 h-16 rounded-full bg-white/20 mx-auto mb-2 flex items-center justify-center text-4xl">✓</div>
                <h3 className="text-xl font-bold">Betaling Geslaagd!</h3>
                <p className="opacity-80">Bestelling #{lastOrder.orderNumber}</p>
              </div>

              {/* Kassabon — exact zelfde als referentie */}
              <div className="p-4 max-h-[50vh] overflow-y-auto">
                <div className="bg-white text-black p-4 rounded-lg max-w-[300px] mx-auto font-mono text-sm">
                  {/* Header */}
                  <div className="text-center mb-4">
                    <h1 className="font-bold text-lg">{tenantInfo?.business_name || 'Vysion Horeca'}</h1>
                    {tenantInfo?.address && <p className="text-xs">{tenantInfo.address}</p>}
                    {(tenantInfo?.postal_code || tenantInfo?.city) && (
                      <p className="text-xs">{tenantInfo?.postal_code} {tenantInfo?.city}</p>
                    )}
                    {tenantInfo?.phone && <p className="text-xs">Tel: {tenantInfo.phone}</p>}
                  </div>
                  <div className="border-t-2 border-dashed border-gray-400 my-3" />
                  {/* Besteltype */}
                  <div className="text-center mb-3">
                    <p className="font-bold text-lg">{orderTypeLabel}</p>
                    {lastOrder.tableNumber && <p className="font-bold">Tafel {lastOrder.tableNumber}</p>}
                  </div>
                  {/* Bon info */}
                  <div className="text-xs mb-3">
                    <div className="flex justify-between">
                      <span>Bon #{lastOrder.orderNumber}</span>
                      <span>{lastOrder.createdAt.toLocaleString('nl-NL', { day:'2-digit', month:'2-digit', year:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                    </div>
                  </div>
                  <div className="border-t border-gray-300 my-2" />
                  {/* Items */}
                  <div className="space-y-2">
                    {lastOrder.items.map((item, idx) => {
                      const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
                      const lineTotal = (item.product.price + choicesTotal) * item.quantity
                      return (
                        <div key={idx}>
                          <div className="flex justify-between">
                            <div className="flex-1">
                              <span className="font-medium">{item.quantity}x</span>{' '}
                              <span>{item.product.name}</span>
                            </div>
                            <span>€{lineTotal.toFixed(2)}</span>
                          </div>
                          {(item.choices || []).length > 0 && (
                            <div className="ml-4 text-xs text-gray-600">
                              {(item.choices || []).map((c, ci) => (
                                <div key={ci} className="flex justify-between">
                                  <span>+ {c.choiceName}</span>
                                  {c.price > 0 && <span>€{c.price.toFixed(2)}</span>}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  <div className="border-t border-gray-300 my-3" />
                  {/* Totalen */}
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between"><span>Subtotaal</span><span>€{subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>BTW ({vatRate}%)</span><span>€{tax.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-lg border-t border-gray-400 pt-2 mt-2">
                      <span>TOTAAL</span><span>€{lastOrder.total.toFixed(2)}</span>
                    </div>
                  </div>
                  {/* Betaalmethode */}
                  <div className="text-center mt-3 text-xs">
                    <p>Betaald met: {payLabel}</p>
                  </div>
                  <div className="border-t-2 border-dashed border-gray-400 my-3" />
                  <div className="text-center text-xs">
                    {tenantInfo?.btw_number && <p>BTW: {tenantInfo.btw_number}</p>}
                    <p className="mt-2">Bedankt voor uw bezoek!</p>
                    {tenantInfo?.website && <p className="mt-1">{tenantInfo.website}</p>}
                  </div>
                </div>
              </div>

              {/* Knoppen */}
              <div className="p-4 border-t flex gap-3">
                <button
                  onClick={() => { printReceipt(lastOrder); setShowSuccessModal(false) }}
                  className="flex-1 py-3 rounded-xl bg-gray-100 font-semibold text-gray-700 flex items-center justify-center gap-2"
                >
                  🖨️ printReceipt
                </button>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className="flex-1 py-3 rounded-xl bg-[#3C4D6B] text-white font-bold"
                >
                  Sluiten
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
