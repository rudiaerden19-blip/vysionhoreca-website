export type RetailLoyaltySettings = {
  tenant_slug: string
  enabled: boolean
  points_per_euro: number
  min_order_total_for_points: number
  redeem_enabled: boolean
  redeem_points_per_euro: number
}

export type RetailLoyaltyMember = {
  id: string
  tenant_slug: string
  card_code: string
  display_name: string | null
  phone: string | null
  email: string | null
  shop_customer_id: string | null
  points_balance: number
  is_active: boolean
}

export type RetailLoyaltyMemberPublic = Pick<
  RetailLoyaltyMember,
  'id' |  'card_code' |  'display_name' |  'phone' |  'points_balance'
>

/** POS-kassa: e-mail voor bon versturen (niet op publieke winkelpas-pagina). */
export type RetailLoyaltyMemberPos = RetailLoyaltyMemberPublic & {
  email: string | null
  customer_name?: string | null
  customer_address?: string | null
  customer_postal_code?: string | null
  customer_city?: string | null
  customer_btw_number?: string | null
}
