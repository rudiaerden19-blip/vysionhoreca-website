import PDFDocument from 'pdfkit'
import type { TenantSettings } from '@/lib/admin-api'
import type { KassaLastOrderReceipt } from '@/lib/kassa-cart-types'
import { normalizeCategoryVatPercent } from '@/lib/order-vat'
import { appLocaleToBcp47 } from '@/lib/print-receipt-html'
import type { RetailReceiptI18n } from '@/lib/retail-kassa-receipt'
import { formatStoreDisplayName } from '@/lib/retail-kassa/receipt-layout'

const MM = 2.834645669
const PAGE_W = 80 * MM
const MARGIN = 5 * MM
const CONTENT_W = PAGE_W - 2 * MARGIN
const GAP_XS = 4
const GAP_SM = 8
const GAP_MD = 14
const GAP_LG = 20
const BAR_H = 20

function formatEuro(amount: number): string {
  return `EUR ${amount.toFixed(2).replace('.', ',')}`
}

function capitalizeProductName(name: string): string {
  const t = name.trim()
  if (!t) return t
  return t.charAt(0).toUpperCase() + t.slice(1)
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

type TextOpts = {
  width?: number
  align?: 'left' |  'center' |  'right'
  fontSize?: number
  bold?: boolean
}

function textBlock(doc: PdfDoc, y: number, text: string, opts: TextOpts = {}): number {
  const fontSize = opts.fontSize ?? 10
  const width = opts.width ?? CONTENT_W
  doc.fontSize(fontSize)
  doc.font(opts.bold ? 'Helvetica-Bold': 'Helvetica')
  doc.text(text, MARGIN, y, { width, align: opts.align ?? 'left', lineGap: 2 })
  const h = doc.heightOfString(text, { width, lineGap: 2 })
  doc.font('Helvetica')
  return y + h + GAP_XS
}

function rowLeftRight(doc: PdfDoc, y: number, left: string, right: string, fontSize = 10): number {
  doc.fontSize(fontSize).font('Helvetica')
  doc.text(left, MARGIN, y, { width: CONTENT_W * 0.58, align: 'left', lineGap: 2 })
  doc.text(right, MARGIN, y, { width: CONTENT_W, align: 'right', lineGap: 2 })
  const h = Math.max(
    doc.heightOfString(left, { width: CONTENT_W * 0.58, lineGap: 2 }),
    doc.heightOfString(right, { width: CONTENT_W, align: 'right', lineGap: 2 }),
  )
  return y + h + GAP_SM
}

function sectionBlackBar(doc: PdfDoc, y: number, title: string): number {
  doc.rect(MARGIN, y, CONTENT_W, BAR_H).fill('#000000')
  doc.fillColor('#ffffff')
  doc.fontSize(11).font('Helvetica-Bold')
  doc.text(title.toUpperCase(), MARGIN, y + 5, { width: CONTENT_W, align: 'center'})
  doc.fillColor('#000000')
  doc.font('Helvetica')
  return y + BAR_H + GAP_MD
}

export function retailReceiptPdfFilename(ref: string, orderNumber: number): string {
  const id = ref.trim() || (orderNumber > 0 ? String(orderNumber) : 'bon')
  const safe = id.replace(/[^\w\-]+/g, '_').slice(0, 48)
  return `Bon-${safe}.pdf`
}

/** 80mm-bon als PDF-bijlage (e-mail); layout in lijn met winkelkassa HTML-bon. */
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
  const invoice = order.retailCustomerInvoice

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [PAGE_W, 2400], margin: 0, autoFirstPage: true })
    const chunks: Buffer[] = []
    doc.on('data', (c) => chunks.push(c as Buffer))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    let y = MARGIN + GAP_SM

    y = textBlock(doc, y, labels.receiptDocumentTitle, {
      align: 'center',
      fontSize: 12,
      bold: true,
    })
    y += GAP_XS

    y = textBlock(doc, y, shopName, { align: 'center', fontSize: 18, bold: true })
    y += GAP_XS

    if (tenantInfo?.address?.trim()) {
      y = textBlock(doc, y, tenantInfo.address.trim(), { align: 'center', fontSize: 9 })
    }
    if (tenantInfo?.postal_code || tenantInfo?.city) {
      y = textBlock(doc, y, `${tenantInfo.postal_code ?? ''} ${tenantInfo.city ?? ''}`.trim(), {
        align: 'center',
        fontSize: 9,
      })
    }
    if (tenantInfo?.btw_number?.trim()) {
      y = textBlock(doc, y, labels.businessVatLabel(tenantInfo.btw_number.trim()), {
        align: 'center',
        fontSize: 9,
      })
    }
    if (tenantInfo?.phone?.trim()) {
      y = textBlock(doc, y, `${labels.telPrefix} ${tenantInfo.phone.trim()}`, {
        align: 'center',
        fontSize: 9,
      })
    }

    y += GAP_MD

    if (isDraft) {
      y = textBlock(doc, y, labels.draftBanner.toUpperCase(), { align: 'center', fontSize: 10, bold: true })
      y += GAP_SM
    }

    if (invoice) {
      y = textBlock(doc, y, labels.invoiceTitle.toUpperCase(), { align: 'center', fontSize: 11, bold: true })
      y = textBlock(doc, y, invoice.name.trim(), { align: 'center', fontSize: 9 })
      if (invoice.addressLine) y = textBlock(doc, y, invoice.addressLine.trim(), { align: 'center', fontSize: 9 })
      if (invoice.postalCity) y = textBlock(doc, y, invoice.postalCity.trim(), { align: 'center', fontSize: 9 })
      y = textBlock(doc, y, labels.customerVatLabel(invoice.vatNumber), { align: 'center', fontSize: 9, bold: true })
      y += GAP_SM
    }

    y = rowLeftRight(doc, y, `${labels.receiptBonNrPrefix}${receiptRefDisplay}`, dateStr, 10)
    y += GAP_SM

    y = sectionBlackBar(doc, y, labels.sectionOrderBar)

    for (const item of order.items) {
      const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
      const lineTotal = (item.product.price + choicesTotal) * item.quantity
      y = rowLeftRight(
        doc,
        y,
        `${item.quantity}x ${capitalizeProductName(item.product.name)}`,
        formatEuro(lineTotal),
        10,
      )
    }

    if (discountEuro > 0.009) {
      y += GAP_XS
      y = rowLeftRight(doc, y, labels.receiptDiscount, formatEuro(-discountEuro), 10)
    }

    y += GAP_MD
    y = sectionBlackBar(doc, y, labels.sectionTotalBar)

    y = rowLeftRight(doc, y, labels.subtotal, formatEuro(subtotalExcl), 10)
    y = rowLeftRight(doc, y, labels.vatSingleLabel, formatEuro(taxTotal), 10)
    y += GAP_SM
    y = rowLeftRight(doc, y, labels.total.toUpperCase(), formatEuro(order.total), 14)
    y += GAP_SM
    y = rowLeftRight(doc, y, labels.receivedLabel, formatEuro(order.total), 10)
    y = rowLeftRight(doc, y, labels.changeLabel, formatEuro(0), 10)
    y += GAP_LG

    const L = order.retailLoyalty
    if (L && labels.loyaltyBalanceLine) {
      if (L.memberLabel && labels.loyaltyPassLabel) {
        y = textBlock(doc, y, labels.loyaltyPassLabel(L.memberLabel), { align: 'center', fontSize: 10, bold: true })
      }
      if (L.pointsRedeemed > 0 && labels.loyaltyRedeemedLine) {
        y = textBlock(doc, y, labels.loyaltyRedeemedLine(L.pointsRedeemed), { align: 'center', fontSize: 10 })
      }
      if (L.pointsEarned > 0 && labels.loyaltyEarnedLine) {
        y = textBlock(doc, y, labels.loyaltyEarnedLine(L.pointsEarned), { align: 'center', fontSize: 10 })
      }
      y = textBlock(doc, y, labels.loyaltyBalanceLine(L.pointsBalance), { align: 'center', fontSize: 10, bold: true })
      y += GAP_SM
    }

    const helpedRaw = order.helpedByStaffName?.trim()
    if (helpedRaw && labels.helpedByIntro) {
      y = textBlock(doc, y, labels.helpedByIntro, { align: 'center', fontSize: 10 })
      y = textBlock(doc, y, staffFirstName(helpedRaw), { align: 'center', fontSize: 10, bold: true })
      y += GAP_SM
    }

    y = textBlock(doc, y, isDraft ? labels.draftFooter : labels.thanks, { align: 'center', fontSize: 10 })
    if (!isDraft) {
      y = textBlock(doc, y, labels.thanksFarewell, { align: 'center', fontSize: 10 })
    }
    y += GAP_MD

    y = textBlock(doc, y, labels.paymentMethodLine(payLabel), { align: 'center', fontSize: 10, bold: true })

    if (tenantInfo?.website?.trim()) {
      y += GAP_SM
      y = textBlock(doc, y, tenantInfo.website.trim(), { align: 'center', fontSize: 9 })
    }

    y += MARGIN

    doc.end()
  })
}
