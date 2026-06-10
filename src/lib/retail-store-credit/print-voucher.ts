import type { TenantSettings } from '@/lib/admin-api'
import { escapeReceiptHtml, printReceiptHtmlDocument } from '@/lib/print-receipt-html'
import { buildEan13BarcodeSvg } from '@/lib/retail-loyalty/ean13-barcode-svg'
import type { RetailPrintReceiptResult } from '@/lib/retail-kassa-receipt'
import { isAndroidTabletPrintClient, sendToVysionPrintAgent } from '@/lib/vysion-print-agent-client'
import type { RetailStoreCreditReturnedItem } from '@/lib/retail-store-credit/types'

export type StoreCreditVoucherPrintLabels = {
  creditNoteTitle: string
  storeCreditTitle: string
  sourceReceipt: (n: number) => string
  creditNoteNo: (n: number) => string
  amountLine: (euro: string) => string
  noCashRefund: string
  scanHint: string
  thanks: string
}

function buildStoreCreditVoucherHtml(opts: {
  tenantInfo: TenantSettings | null
  creditCode: string
  amount: number
  sourceOrderNumber: number
  creditNoteOrderNumber?: number
  returnedItems: RetailStoreCreditReturnedItem[]
  labels: StoreCreditVoucherPrintLabels
  locale: string
}): string {
  const { tenantInfo, creditCode, amount, sourceOrderNumber, labels } = opts
  const dateStr = new Date().toLocaleString(opts.locale.replace('_', '-'), {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const barcodeSvg = buildEan13BarcodeSvg(creditCode)
  const lines = opts.returnedItems
    .map(
      (it) =>
        `<tr><td>${escapeReceiptHtml(it.name)}</td><td style="text-align:right">-${it.quantity}</td><td style="text-align:right">€${(it.price * it.quantity).toFixed(2)}</td></tr>`,
    )
    .join('')

  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body{font-family:monospace;font-size:12px;margin:0;padding:8px;max-width:280px}
    .center{text-align:center}.bold{font-weight:bold}.small{font-size:11px}
    table{width:100%;border-collapse:collapse} td{padding:2px 0}
    .divider{border-top:1px dashed #000;margin:6px 0}
  </style></head><body>
    <div class="center bold">${escapeReceiptHtml(tenantInfo?.business_name || '')}</div>
    ${tenantInfo?.address ? `<div class="center small">${escapeReceiptHtml(tenantInfo.address)}</div>` : ''}
    <div class="divider"></div>
    <div class="center bold">${escapeReceiptHtml(labels.creditNoteTitle)}</div>
    <div class="center bold">${escapeReceiptHtml(labels.storeCreditTitle)}</div>
    <div class="divider"></div>
    <div>${escapeReceiptHtml(labels.sourceReceipt(sourceOrderNumber))}</div>
    ${
      opts.creditNoteOrderNumber
        ? `<div>${escapeReceiptHtml(labels.creditNoteNo(opts.creditNoteOrderNumber))}</div>`
        : ''
    }
    <div>${dateStr}</div>
    <div class="divider"></div>
    <table>${lines}</table>
    <div class="divider"></div>
    <div class="bold">${escapeReceiptHtml(labels.amountLine(amount.toFixed(2)))}</div>
    <div class="small">${escapeReceiptHtml(labels.noCashRefund)}</div>
    <div class="divider"></div>
    <div class="center">${barcodeSvg}</div>
    <div class="center small">${escapeReceiptHtml(creditCode)}</div>
    <div class="center small">${escapeReceiptHtml(labels.scanHint)}</div>
    <div class="divider"></div>
    <div class="center small">${escapeReceiptHtml(labels.thanks)}</div>
  </body></html>`
}

export async function printRetailStoreCreditVoucher(opts: {
  tenantInfo: TenantSettings | null
  creditCode: string
  amount: number
  sourceOrderNumber: number
  creditNoteOrderNumber?: number
  returnedItems: RetailStoreCreditReturnedItem[]
  labels: StoreCreditVoucherPrintLabels
  locale: string
}): Promise<RetailPrintReceiptResult> {
  const html = buildStoreCreditVoucherHtml(opts)
  const printResult = await sendToVysionPrintAgent({
    winkelnaam: opts.tenantInfo?.business_name ?? undefined,
    storeName: opts.tenantInfo?.business_name ?? undefined,
    bonInhoud: html,
  })
  if (printResult.ok) return { ok: true }
  return { ok: false, error: printResult.error, fallbackHtml: html }
}

export function tryBrowserPrintStoreCreditFallback(html: string): void {
  if (!html || isAndroidTabletPrintClient()) return
  printReceiptHtmlDocument(html)
}
