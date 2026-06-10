import type { KassaReceiptRetailCustomerInvoice } from '@/lib/kassa-cart-types'
import type { RetailLoyaltyMemberPos } from '@/lib/retail-loyalty/types'

export function retailCustomerInvoiceFromLoyaltyMember(
  member: RetailLoyaltyMemberPos | null | undefined,
): KassaReceiptRetailCustomerInvoice | undefined {
  if (!member) return undefined
  const vat = member.customer_btw_number?.trim()
  if (!vat) return undefined
  const name =
    member.customer_name?.trim() ||
    member.display_name?.trim() ||
    member.card_code
  const postalCity = [member.customer_postal_code?.trim(), member.customer_city?.trim()]
    .filter(Boolean)
    .join(' ')
  return {
    name,
    vatNumber: vat,
    addressLine: member.customer_address?.trim() || undefined,
    postalCity: postalCity || undefined,
  }
}
