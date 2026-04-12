/** Escape text for HTML receipts (names, addresses, notes). */
export function escapeReceiptHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Exact same style block as kassa POS receipt (`kassa/page.tsx`), plus @page for 80mm thermal.
 * Gebruikt voor kassabon én medewerker-dagoverzicht (zelfde printpad).
 */
export const KASSA_PRINT_RECEIPT_STYLES = `
      * { margin:0;padding:0;box-sizing:border-box; }
      @page { size: 80mm auto; margin: 0; }
      body { font-family:'Courier New',monospace;font-size:12px;width:80mm;padding:10px;margin:0; }
      .center { text-align:center; }
      .bold { font-weight:bold; }
      .big { font-size:16px; }
      .small { font-size:10px; }
      .divider { border-top:1px dashed #000;margin:8px 0; }
      .divider-solid { border-top:1px solid #000;margin:8px 0; }
      .row { display:flex;justify-content:space-between;margin:2px 0; }
      .total { font-size:18px;font-weight:bold;margin-top:8px; }
      .order-type { font-size:20px;font-weight:bold;margin:10px 0;padding:8px;border:2px solid #000; }
      @media print { body { width:auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`.trim()

/** Zelfde sleutel als shop display / keuken (`printer_ip_{tenant}`) voor iPad print-server. */
export function getSavedLanPrinterIp(tenantSlug: string): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(`printer_ip_${tenantSlug}`)
}

export function appLocaleToBcp47(locale: string): string {
  const m: Record<string, string> = {
    nl: 'nl-NL',
    en: 'en-GB',
    de: 'de-DE',
    fr: 'fr-FR',
    es: 'es-ES',
    it: 'it-IT',
    ja: 'ja-JP',
    zh: 'zh-CN',
    ar: 'ar-SA',
  }
  return m[locale] ?? 'nl-NL'
}

export type StaffSalesSummaryReceiptLabels = {
  docTitle: string
  heading: string
  introLine: string
  totalLabel: string
  orderCountLine: string
  columnAmount: string
  noOrdersLine: string
  printedLine: string
}

export type StaffSalesSummaryReceiptBusiness = {
  name?: string
  address?: string
  postalCode?: string
  city?: string
  phone?: string
  email?: string
  btw_number?: string
}

type ThermalItem = {
  quantity: number
  product_name: string
  name: string
  price: number
  total_price: number
}

/** Zelfde `/api/print-proxy` → iPad :3001 als shop display (customer-bon). */
async function tryStaffSummaryThermalPrint(opts: {
  printerIP: string
  btwPercentage: number
  business?: StaffSalesSummaryReceiptBusiness
  staffName: string
  summaryHeading: string
  introLine: string
  printedLine: string
  total: number
  orders: { order_number: number; total: number }[]
}): Promise<boolean> {
  const vat = opts.btwPercentage || 6
  const subtotal = Math.round((opts.total / (1 + vat / 100)) * 100) / 100
  const tax = Math.round((opts.total - subtotal) * 100) / 100

  let items: ThermalItem[]
  if (opts.orders.length > 0) {
    items = opts.orders.map((o) => ({
      quantity: 1,
      product_name: `Bon #${o.order_number}`,
      name: `Bon #${o.order_number}`,
      price: o.total,
      total_price: o.total,
    }))
  } else {
    items = [
      {
        quantity: 1,
        product_name: opts.introLine.slice(0, 120) || '—',
        name: '—',
        price: 0,
        total_price: 0,
      },
    ]
  }

  const orderNumber =
    opts.orders.length > 0 ? Math.max(...opts.orders.map((o) => Number(o.order_number) || 0)) : 0

  const b = opts.business
  const order = {
    order_number: orderNumber || 1,
    customer_name: `${opts.staffName} — ${opts.summaryHeading}`.slice(0, 200),
    customer_phone: undefined as string | undefined,
    customer_email: undefined as string | undefined,
    customer_address: undefined as string | undefined,
    order_type: 'TAKEAWAY',
    payment_status: 'paid',
    payment_method: 'CASH',
    items,
    subtotal,
    delivery_fee: 0,
    discount: 0,
    total: opts.total,
    tax,
    notes: `${opts.introLine}\n${opts.printedLine}`.slice(0, 500),
    created_at: new Date().toISOString(),
  }

  const businessInfo = {
    name: b?.name,
    address: b?.address,
    city: b?.city,
    postalCode: b?.postalCode,
    phone: b?.phone,
    email: b?.email,
    btw_number: b?.btw_number,
    btw_percentage: vat,
  }

  try {
    const response = await fetch('/api/print-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerIP: opts.printerIP,
        order,
        businessInfo,
        printType: 'customer',
      }),
    })
    const data = (await response.json()) as { success?: boolean; error?: string }
    return response.ok && !!data.success
  } catch {
    return false
  }
}

/**
 * Medewerker dagoverzicht: eerst thermisch via iPad (zelfde als online scherm) indien `printer_ip_*` gezet,
 * anders dezelfde HTML-print als kassabon (`printReceiptHtmlDocument`).
 */
export async function printStaffSalesSummaryReceipt(opts: {
  savedPrinterIp: string | null
  btwPercentage: number
  business?: StaffSalesSummaryReceiptBusiness
  labels: StaffSalesSummaryReceiptLabels
  total: number
  orders: { order_number: number; total: number }[]
  staffName: string
  summaryHeading: string
  introLine: string
  printedLine: string
}): Promise<void> {
  const html = buildStaffSalesSummaryReceiptHtml({
    business: opts.business,
    labels: opts.labels,
    total: opts.total,
    orders: opts.orders,
  })

  const ip = opts.savedPrinterIp?.trim()
  if (ip) {
    const ok = await tryStaffSummaryThermalPrint({
      printerIP: ip,
      btwPercentage: opts.btwPercentage,
      business: opts.business,
      staffName: opts.staffName,
      summaryHeading: opts.summaryHeading,
      introLine: opts.introLine,
      printedLine: opts.printedLine,
      total: opts.total,
      orders: opts.orders,
    })
    if (ok) return
  }

  printReceiptHtmlDocument(html)
}

/**
 * HTML-structuur gelijk aan kassabon: zelfde CSS, order-type-blok, rows (80mm).
 */
export function buildStaffSalesSummaryReceiptHtml(opts: {
  business?: StaffSalesSummaryReceiptBusiness
  labels: StaffSalesSummaryReceiptLabels
  total: number
  orders: { order_number: number; total: number }[]
}): string {
  const esc = escapeReceiptHtml
  const b = opts.business
  const nameLine = b?.name?.trim() ? `<div class="bold big">${esc(b.name.trim())}</div>` : ''
  const addr = b?.address?.trim() ? `<div class="small">${esc(b.address.trim())}</div>` : ''
  const pcCity =
    b?.postalCode?.trim() || b?.city?.trim()
      ? `<div class="small">${esc(`${b?.postalCode?.trim() ?? ''} ${b?.city?.trim() ?? ''}`.trim())}</div>`
      : ''
  const phone = b?.phone?.trim() ? `<div class="small">Tel: ${esc(b.phone.trim())}</div>` : ''

  const rowsHtml =
    opts.orders.length === 0
      ? `<div class="center small" style="margin:10px 0;">${esc(opts.labels.noOrdersLine)}</div>`
      : `<div class="divider-solid"></div>
        <div class="row small"><span class="bold">#</span><span class="bold">${esc(opts.labels.columnAmount)}</span></div>
        <div class="divider"></div>
        ${opts.orders
          .map(
            (o) =>
              `<div class="row"><span>Bon #${o.order_number}</span><span>€${o.total.toFixed(2)}</span></div>`
          )
          .join('')}`

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(opts.labels.docTitle)}</title><style>${KASSA_PRINT_RECEIPT_STYLES}</style></head><body>
    <div class="center">${nameLine}${addr}${pcCity}${phone}</div>
    <div class="divider"></div>
    <div class="center order-type">${esc(opts.labels.heading)}</div>
    <div class="center small" style="margin-top:6px;line-height:1.35;">${esc(opts.labels.introLine)}</div>
    <div class="divider-solid"></div>
    <div class="row total"><span>${esc(opts.labels.totalLabel)}</span><span>€${opts.total.toFixed(2)}</span></div>
    <div class="center small" style="margin-top:4px;">${esc(opts.labels.orderCountLine)}</div>
    ${rowsHtml}
    <div class="divider"></div>
    <div class="center small">${esc(opts.labels.printedLine)}</div>
  </body></html>`
}

/** Print HTML via hidden iframe (same-origin); falls back to blob/blank window. */
export function printReceiptHtmlDocument(html: string): void {
  let printStarted = false
  const cleanupIframe = (el: HTMLIFrameElement) => {
    try {
      el.remove()
    } catch {
      /* ignore */
    }
  }

  const tryPrintWindow = (w: Window | null | undefined): boolean => {
    if (!w) return false
    try {
      w.focus()
      w.print()
      return true
    } catch {
      return false
    }
  }

  const fallbackBlobOrBlankWindow = () => {
    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const w = window.open(url, '_blank', 'width=420,height=640')
      if (w) {
        const finish = () => {
          try {
            URL.revokeObjectURL(url)
          } catch {
            /* ignore */
          }
          try {
            w.close()
          } catch {
            /* ignore */
          }
        }
        w.addEventListener(
          'load',
          () => {
            setTimeout(() => {
              tryPrintWindow(w)
              setTimeout(finish, 1200)
            }, 150)
          },
          { once: true }
        )
        return
      }
      URL.revokeObjectURL(url)
    } catch {
      /* try blank */
    }
    const w = window.open('', '_blank', 'width=420,height=640')
    if (!w) return
    try {
      w.document.open()
      w.document.write(html)
      w.document.close()
      setTimeout(() => tryPrintWindow(w), 200)
    } catch {
      /* ignore */
    }
  }

  const iframe = document.createElement('iframe')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText =
    'position:fixed;inset:0;width:0;height:0;border:0;opacity:0;pointer-events:none;z-index:-1'
  iframe.srcdoc = html
  document.body.appendChild(iframe)

  const runSrcdocPrint = () => {
    if (printStarted) return
    if (tryPrintWindow(iframe.contentWindow)) {
      printStarted = true
      setTimeout(() => cleanupIframe(iframe), 1500)
      return
    }
    printStarted = true
    cleanupIframe(iframe)
    fallbackBlobOrBlankWindow()
  }

  if (iframe.contentDocument?.readyState === 'complete') {
    setTimeout(runSrcdocPrint, 50)
  } else {
    iframe.onload = () => setTimeout(runSrcdocPrint, 100)
    setTimeout(() => {
      if (!iframe.isConnected || printStarted) return
      if (iframe.contentDocument?.readyState === 'complete') runSrcdocPrint()
    }, 800)
  }
}

/** Minimale order-vorm voor `/api/print-proxy` en lokale :3001 print-server (zelfde als onlinescherm). */
export type KassaThermalOrderPayload = {
  order_number: number
  customer_name: string
  customer_phone?: string
  customer_email?: string
  customer_address?: string
  order_type: string
  payment_status: string
  payment_method: string
  items: Array<{
    quantity: number
    product_name: string
    name: string
    price: number
    total_price: number
    options?: Array<{ name: string; price?: number }>
  }>
  subtotal: number
  delivery_fee: number
  discount: number
  total: number
  tax: number
  notes: string | null
  created_at: string
}

export type KassaThermalBusinessPayload = {
  name?: string
  address?: string
  city?: string
  postalCode?: string
  phone?: string
  email?: string
  btw_number?: string
  btw_percentage: number
}

export function buildKassaThermalOrderPayload(opts: {
  orderNumber: number
  customerName: string
  orderType: string
  paymentMethod: string
  subtotal: number
  tax: number
  total: number
  notes: string | null
  createdAtIso: string
  items: Array<{
    product: { name: string; price: number }
    quantity: number
    choices?: Array<{ choiceName: string; price: number }>
  }>
}): KassaThermalOrderPayload {
  const items = opts.items.map((i) => {
    const choicesTotal = (i.choices || []).reduce((s, c) => s + c.price, 0)
    const unit = i.product.price + choicesTotal
    const total_price = unit * i.quantity
    return {
      quantity: i.quantity,
      product_name: i.product.name,
      name: i.product.name,
      price: unit,
      total_price,
      options: (i.choices || []).map((c) => ({ name: c.choiceName, price: c.price })),
    }
  })
  return {
    order_number: opts.orderNumber,
    customer_name: opts.customerName,
    order_type: opts.orderType,
    payment_status: 'paid',
    payment_method: opts.paymentMethod,
    items,
    subtotal: opts.subtotal,
    delivery_fee: 0,
    discount: 0,
    total: opts.total,
    tax: opts.tax,
    notes: opts.notes,
    created_at: opts.createdAtIso,
  }
}

/** Zelfde pad als onlinescherm: Vercel/host → `/api/print-proxy` → `http://{ip}:3001/print` (werkt enkel als de server het LAN-IP kan bereiken, bv. self-hosted). */
export async function tryKassaCustomerThermalViaProxy(opts: {
  printerIP: string
  order: KassaThermalOrderPayload
  businessInfo: KassaThermalBusinessPayload
}): Promise<boolean> {
  try {
    const response = await fetch('/api/print-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        printerIP: opts.printerIP,
        order: opts.order,
        businessInfo: opts.businessInfo,
        printType: 'customer',
      }),
    })
    const data = (await response.json()) as { success?: boolean }
    return response.ok && !!data.success
  } catch {
    return false
  }
}

/**
 * Probeer rechtstreeks vanuit de browser naar `http://{printerIP}:3001/print` (lokale print-server / iPad-app).
 * Werkt alleen als de pagina **niet** mixed-content blokkeert (typisch: site over HTTP op hetzelfde LAN, of speciale kiosk-setup).
 * Vanaf HTTPS naar een privé-IP blokkeert de browser dit meestal — dan val je terug op HTML-print.
 */
export async function tryKassaCustomerThermalDirectLan(opts: {
  printerIP: string
  order: KassaThermalOrderPayload
  businessInfo: KassaThermalBusinessPayload
}): Promise<boolean> {
  try {
    const response = await fetch(`http://${opts.printerIP}:3001/print`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        order: opts.order,
        businessInfo: opts.businessInfo,
        printType: 'customer',
      }),
    })
    if (!response.ok) return false
    try {
      const data = (await response.json()) as { success?: boolean }
      return !!data.success
    } catch {
      return response.ok
    }
  } catch {
    return false
  }
}

/**
 * Volgorde: bij offline eerst direct LAN (als ingesteld), online via print-proxy, anders HTML-bon.
 */
export async function printKassaReceiptThermalThenHtml(opts: {
  printerIP: string | null
  isOnline: boolean
  htmlReceipt: string
  order: KassaThermalOrderPayload
  businessInfo: KassaThermalBusinessPayload
}): Promise<void> {
  const ip = opts.printerIP?.trim()
  if (ip) {
    if (!opts.isOnline) {
      const okDirect = await tryKassaCustomerThermalDirectLan({
        printerIP: ip,
        order: opts.order,
        businessInfo: opts.businessInfo,
      })
      if (okDirect) return
    } else {
      const okProxy = await tryKassaCustomerThermalViaProxy({
        printerIP: ip,
        order: opts.order,
        businessInfo: opts.businessInfo,
      })
      if (okProxy) return
    }
  }
  printReceiptHtmlDocument(opts.htmlReceipt)
}
