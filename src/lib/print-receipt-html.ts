import { isAndroidTabletPrintClient } from '@/lib/vysion-print-agent-client'

/** Escape text for HTML receipts (names, addresses, notes). */
export function escapeReceiptHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * Zelfde style block als kassa POS receipt (`kassa/page.tsx`), plus @page voor 80mm (browser print).
 */
export const KASSA_PRINT_RECEIPT_STYLES = `
      * { margin:0;padding:0;box-sizing:border-box; }
      @page { size: 80mm auto; margin: 0; }
      body { font-family:'Courier New',monospace;font-size:10px;width:80mm;padding:8px;margin:0; }
      .center { text-align:center; }
      .bold { font-weight:bold; }
      .big { font-size:12px; }
      .small { font-size:9px; }
      .divider { border-top:1px dashed #000;margin:6px 0; }
      .divider-solid { border-top:1px solid #000;margin:6px 0; }
      .row { display:flex;justify-content:space-between;margin:1px 0; }
      .total { font-size:12px;font-weight:bold;margin-top:6px; }
      .order-type { font-size:12px;font-weight:bold;margin:6px 0;padding:6px;border:1px solid #000; }
      @media print { body { width:auto; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
`.trim()

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

/** Medewerker dagoverzicht — alleen browser-/systeem print (HTML). */
export async function printStaffSalesSummaryReceipt(opts: {
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
  /** Chrome Android: systeemdialoog wordt vrijwel altijd PDF — kiosk valt om; tablet gebruikt USB-brug. */
  if (typeof window !== 'undefined' && isAndroidTabletPrintClient()) return

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
