export type RetailStoreCreditReturnedItem = {
  product_id: string
  variant_id: string | null
  name: string
  price: number
  quantity: number
}

export type RetailOrderLineForReturn = {
  lineKey: string
  product_id: string
  variant_id: string | null
  name: string
  price: number
  quantitySold: number
  quantityReturned: number
  quantityReturnable: number
}

export type RetailStoreCreditPos = {
  id: string
  credit_code: string
  source_order_number: number
  amount_remaining: number
  amount_initial: number
  status: string
}

export type RetailStoreCreditIssueResult = {
  ok: boolean
  error?: string
  credit?: RetailStoreCreditPos
  creditNoteOrderNumber?: number
}
