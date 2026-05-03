import type { MenuProduct } from '@/lib/admin-api'

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

export type KassaPaymentMethod = 'CASH' | 'CARD' | 'IDEAL' | 'BANCONTACT' | 'SPLIT'

export interface KassaLastOrderReceipt {
  orderNumber: number
  checkoutReference?: string
  items: KassaCartItem[]
  total: number
  paymentMethod: KassaPaymentMethod
  splitCash?: number
  splitCard?: number
  orderType: KassaRegisterOrderType
  tableNumber: string
  createdAt: Date
  helpedByStaffName?: string | null
}
