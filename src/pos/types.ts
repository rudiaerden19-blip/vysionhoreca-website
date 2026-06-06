/** Reguliere POS-domeintypes — geen FDM/GKS-payloads. */

export type PosPaymentMethod = 'CASH' | 'CARD' | 'SPLIT' | 'ONLINE'

export type PosOrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'

export interface PosCartLineOption {
  name: string
  price: number
}

export interface PosCartLine {
  productId: string
  name: string
  unitPrice: number
  quantity: number
  vatPercent: number
  options?: PosCartLineOption[]
}

export interface PosCheckoutDraft {
  tenantSlug: string
  orderType: PosOrderType
  paymentMethod: PosPaymentMethod
  lines: PosCartLine[]
  /** Idempotente client-sleutel (offline retry); fiscaal ticket krijgt aparte sleutel via GKS. */
  kassaClientUuid: string
  splitCash?: number
  splitCard?: number
}
