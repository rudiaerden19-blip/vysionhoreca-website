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
  points_balance: number
  is_active: boolean
}

export type RetailLoyaltyMemberPublic = Pick<
  RetailLoyaltyMember,
  'id' | 'card_code' | 'display_name' | 'phone' | 'points_balance'
>
