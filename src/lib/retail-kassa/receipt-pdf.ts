import PDFDocument from 'pdfkit'
import type { TenantSettings } from '@/lib/admin-api'
import type { KassaLastOrderReceipt } from '@/lib/kassa-cart-types'
import { normalizeCategoryVatPercent } from '@/lib/order-vat'
import { appLocaleToBcp47 } from '@/lib/print-receipt-html'
import type { RetailReceiptI18n } from '@/lib/retail-kassa-receipt'
import { formatStoreDisplayName } from '@/lib/retail-kassa/receipt-layout'

const MM = 2.834645669
const PAGE_W = 80 * MM
const MARGIN = 4 * MM
const CONTENT_W = PAGE_W - 2 * MARGIN
const LINE = 11

function formatEuro(amount: number): string {
  return `EUR ${amount.toFixed(2).replace('.', ',')}`
}

function staffFirstName(full: string): string {
  const p = full.trim().split(/\s+/).filter(Boolean)
  return p[0] ?? full.trim()
}

function payMethodShort(order: KassaLastOrderReceipt, labels: RetailReceiptI18n): string {
  if (order.paymentMethod === 'SPLIT') {
    return labels.paidSplit((order.splitCash ?? 0).toFixed(2), (order.splitCard ?? 0).toFixed(2))
  }
  if (order.paymentMethod === 'CASH') return labels.payCash
  if (order.paymentMethod === 'CARD') return labels.payPin
  if (order.paymentMethod === 'IDEAL') return labels.payIdeal
  return labels.payBancontact
}

function receiptDateStr(order: KassaLastOrderReceipt, locale: string): string {
  return order.createdAt.toLocaleString(appLocaleToBcp47(locale), {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function buildTotals(order: KassaLastOrderReceipt, fbVatRate: number) {
  const splitOk =
    Array.isArray(order.vatSplit) &&
    order.vatSplit.length > 0 &&
    typeof order.totalTax === 'number' &&
    typeof order.subtotalExclVat === 'number'
  if (splitOk) {
    return {
      taxTotal: Math.round((order.totalTax as number) * 100) / 100,
      subtotalExcl: Math.round((order.subtotalExclVat as number) * 100) / 100,
    }
  }
  const incl = order.total
  const excl = Math.round((incl / (1 + fbVatRate / 100)) * 100) / 100
  const tax = Math.round((incl - excl) * 100) / 100
  return { taxTotal: tax, subtotalExcl: excl }
}

function itemsGrossIncl(order: KassaLastOrderReceipt): number {
  return (
    Math.round(
      order.items.reduce((s, i) => {
        const choicesTotal = (i.choices || []).reduce((c, ch) => c + ch.price, 0)
        return s + (i.product.price + choicesTotal) * i.quantity
      }, 0) * 100,
    ) / 100
  )
}

type PdfDoc = InstanceType<typeof PDFDocument>

function rowLeftRight(doc: PdfDoc, y: number, left: string, right: string): number {
  doc.fontSize(9).text(left, MARGIN, y, { width: CONTENT_W * 0.62, align: 'left', lineBreak: false })
  doc.fontSize(9).text(right, MARGIN, y, { width: CONTENT_W, align: 'right', lineBreak: false })
  return y + LINE
}

function rowCenter(doc: PdfDoc, y: number, text: string, size = 9): number {
  doc.fontSize(size).text(text, MARGIN, y, { width: CONTENT_W, align: 'center' })
  return y + (size >= 12 ? LINE + 2 : LINE)
}

export function retailReceiptPdfFilename(ref: string, orderNumber: number): string {
  const id = ref.trim() || (orderNumber > 0 ? String(orderNumber) : 'bon')
  const safe = id.replace(/[^\w\-]+/g, '_').slice(0, 48)
  return `Bon-${safe}.pdf`
}

/** 80mm-bon als PDF-bijlage (e-mail); layout gelijk aan winkelkassa HTML-bon. */
export function buildRetailKassaReceiptPdfBuffer(opts: {
  tenantInfo: TenantSettings | null
  order: KassaLastOrderReceipt
  labels: RetailReceiptI18n
  locale: string
  isDraft?: boolean
}): Promise<Buffer> {
  const { tenantInfo, order, labels, locale } = opts
  const isDraft = !!opts.isDraft
  const fbVatRate = normalizeCategoryVatPercent(tenantInfo?.btw_percentage ?? 21, 21)
  const { taxTotal, subtotalExcl } = buildTotals(order, fbVatRate)
  const dateStr = receiptDateStr(order, locale)
  const receiptRefDisplay = isDraft
    ? '—'
    : order.checkoutReference ?? (order.orderNumber > 0 ? String(order.orderNumber) : '—')
  const payLabel = isDraft ? labels.draftNotPaid : payMethodShort(order, labels)
  const discountEuro = Math.round((itemsGrossIncl(order) - order.total) * 100) / 100
  const shopName = formatStoreDisplayName(tenantInfo?.business_name || labels.defaultBusinessName)

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [PAGE_W, 900], margin: 0, autoFirstPage: true })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    let y = MARGIN
    y = rowCenter(doc, y, shopName, 14)
    if (tenantInfo?.address?.trim()) y = rowCenter(doc, y, tenantInfo.address.trim())
    if (tenantInfo?.postal_code || tenantInfo?.city) {
      y = rowCenter(doc, y, `${tenantInfo.postal_code ?? ''} ${tenantInfo.city ?? ''}`.trim())
    }
    if (tenantInfo?.btw_number?.trim()) {
      y = rowCenter(doc, y, labels.businessVatLabel(tenantInfo.btw_number.trim()))
    }
    if (tenantInfo?.phone?.trim()) {
      y = rowCenter(doc, y, `${labels.telPrefix} ${tenantInfo.phone.trim()}`)
    }
    y += 4

    if (isDraft) {
      y = rowCenter(doc, y, labels.draftBanner.toUpperCase(), 10)
      y += 4
    }

    y = rowLeftRight(
      doc,
      y,
      `${labels.receiptBonNrPrefix}${receiptRefDisplay}`,
      dateStr,
    )
    y += 6
    doc.fontSize(10).text(labels.sectionOrderBar.toUpperCase(), MARGIN, y, { width: CONTENT_W })
    y += LINE + 2

    for (const item of order.items) {
      const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
      const lineTotal = (item.product.price + choicesTotal) * item.quantity
      y = rowLeftRight(doc, y, `${item.quantity}x ${item.product.name}`, formatEuro(lineTotal))
    }

    if (discountEuro > 0.009) {
      y += 2
      y = rowLeftRight(doc, y, labels.receiptDiscount, formatEuro(-discountEuro))
    }

    y += 6
    doc.fontSize(10).text(labels.sectionTotalBar.toUpperCase(), MARGIN, y, { width: CONTENT_W })
    y += LINE + 2
    y = rowLeftRight(doc, y, labels.subtotal, formatEuro(subtotalExcl))
    y = rowLeftRight(doc, y, labels.vatSingleLabel, formatEuro(taxTotal))
    y += 4
    doc.fontSize(12).font('Helvetica-Bold')
    y = rowLeftRight(doc, y, labels.total.toUpperCase(), formatEuro(order.total))
    doc.font('Helvetica')
    y += 4
    y = rowLeftRight(doc, y, labels.receivedLabel, formatEuro(order.total))
    y = rowLeftRight(doc, y, labels.changeLabel, formatEuro(0))
    y += 6

    const L = order.retailLoyalty
    if (L && labels.loyaltyBalanceLine) {
      y += 4
      if (L.memberLabel && labels.loyaltyPassLabel) {
        y = rowCenter(doc, y, labels.loyaltyPassLabel(L.memberLabel))
      }
      if (L.pointsRedeemed > 0 && labels.loyaltyRedeemedLine) {
        y = rowCenter(doc, y, labels.loyaltyRedeemedLine(L.pointsRedeemed))
      }
      if (L.pointsEarned > 0 && labels.loyaltyEarnedLine) {
        y = rowCenter(doc, y, labels.loyaltyEarnedLine(L.pointsEarned))
      }
      y = rowCenter(doc, y, labels.loyaltyBalanceLine(L.pointsBalance))
    }

    const helpedRaw = order.helpedByStaffName?.trim()
    if (helpedRaw && labels.helpedByIntro) {
      y += 4
      y = rowCenter(doc, y, labels.helpedByIntro)
      y = rowCenter(doc, y, staffFirstName(helpedRaw))
    }

    y += 4
    y = rowCenter(doc, y, isDraft ? labels.draftFooter : labels.thanks)
    if (!isDraft) y = rowCenter(doc, y, labels.thanksFarewell)
    y += 4
    doc.fontSize(9).text(labels.paymentMethodLine(payLabel), MARGIN, y, { width: CONTENT_W })
    y += LINE
    if (tenantInfo?.website?.trim()) {
      y = rowCenter(doc, y, tenantInfo.website.trim())
    }

    doc.end()
  })
}
