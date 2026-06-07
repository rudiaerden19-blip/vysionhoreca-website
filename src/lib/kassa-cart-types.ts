import type { MenuProduct } from '@/lib/admin-api'
import type { FloorPlanZone } from '@/lib/kassa-floor-plan-zone'

export interface KassaSelectedChoice {
  optionId: string
  optionName: string
  choiceId: string
  choiceName: string
  price: number
}

export interface KassaCartItem {
  product: MenuProduct
  quantity: number
  choices?: KassaSelectedChoice[]
  cartKey: string
}

export type KassaRegisterOrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'

/** Tafel op bon/DB alleen bij dine-in (bij afhalen/leveren geen tafelregel). */
export function kassaReceiptTableNumber(
  orderType: KassaRegisterOrderType,
  tableNumber: string | undefined | null,
): string {
  if (orderType !== 'DINE_IN') return ''
  return String(tableNumber ?? '').trim()
}

export type KassaPaymentMethod = 'CASH' | 'CARD' | 'IDEAL' | 'BANCONTACT' | 'SPLIT'

/** Afgeleid uit categorie-BTW; ontbreekt bij oude bonnen → UI valt terug op één zaak-tarief. */
export interface KassaReceiptVatLine {
  rate: number
  baseExcl: number
  tax: number
}

export interface KassaLastOrderReceipt {
  orderNumber: number
  checkoutReference?: string
  items: KassaCartItem[]
  total: number
  /** Meerdere tarieven (o.a. categorie-BTW); leeg/ontbreekt = legacy enkelvoudig tarief. */
  vatSplit?: KassaReceiptVatLine[]
  subtotalExclVat?: number
  totalTax?: number
  paymentMethod: KassaPaymentMethod
  splitCash?: number
  splitCard?: number
  orderType: KassaRegisterOrderType
  tableNumber: string
  /** Zaalebied voor dine-in (bon / rapportage blijft per tenant; kolom scheidt open manden). */
  floorPlanZone?: FloorPlanZone
  createdAt: Date
  helpedByStaffName?: string | null
  /** GKS-pilot: bon-BTW en QR na signSale (N); niet op productie-kassa. */
  gksFiscal?: import('@/lib/gks-kassa/gks-fiscal-receipt').GksFiscalReceiptSnapshot
}
