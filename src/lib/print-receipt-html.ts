/** Escape text for HTML receipts (names, addresses, notes). */
export function escapeReceiptHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
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
}

/**
 * Narrow 80mm-style HTML for staff day sales summary (browser / receipt printer).
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
  const addrParts: string[] = []
  if (b?.address?.trim()) addrParts.push(b.address.trim())
  const pcCity = [b?.postalCode?.trim(), b?.city?.trim()].filter(Boolean).join(' ')
  if (pcCity) addrParts.push(pcCity)
  const addr = addrParts.length ? `<div class="small">${esc(addrParts.join(' — '))}</div>` : ''
  const phone = b?.phone?.trim() ? `<div class="small">Tel: ${esc(b.phone.trim())}</div>` : ''

  const rowsHtml =
    opts.orders.length === 0
      ? `<div class="center small" style="margin:10px 0;">${esc(opts.labels.noOrdersLine)}</div>`
      : `<div class="divider-solid"></div>
        <div class="row small bold"><span>#</span><span>${esc(opts.labels.columnAmount)}</span></div>
        <div class="divider"></div>
        ${opts.orders
          .map(
            (o) =>
              `<div class="row"><span class="mono">#${o.order_number}</span><span>€${o.total.toFixed(2)}</span></div>`
          )
          .join('')}`

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${esc(opts.labels.docTitle)}</title><style>
    * { margin:0;padding:0;box-sizing:border-box; }
    body { font-family:'Courier New',monospace;font-size:12px;width:80mm;padding:10px; }
    .center { text-align:center; }
    .bold { font-weight:bold; }
    .big { font-size:16px; }
    .small { font-size:10px; }
    .mono { font-family:'Courier New',monospace; }
    .divider { border-top:1px dashed #000;margin:8px 0; }
    .divider-solid { border-top:1px solid #000;margin:8px 0; }
    .row { display:flex;justify-content:space-between;margin:3px 0; }
    .total { font-size:18px;font-weight:bold;margin-top:8px; }
    @media print { body { width:auto; } }
  </style></head><body>
    <div class="center">${nameLine}${addr}${phone}</div>
    <div class="divider"></div>
    <div class="center bold big">${esc(opts.labels.heading)}</div>
    <p class="small" style="margin-top:8px;text-align:center;line-height:1.35;">${esc(opts.labels.introLine)}</p>
    <div class="divider"></div>
    <div class="center">
      <div class="small bold">${esc(opts.labels.totalLabel)}</div>
      <div class="total" style="margin-top:4px;">€${opts.total.toFixed(2)}</div>
      <div class="small" style="margin-top:4px;">${esc(opts.labels.orderCountLine)}</div>
    </div>
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
