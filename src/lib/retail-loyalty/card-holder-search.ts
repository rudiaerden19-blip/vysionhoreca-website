/** Velden waarop de kassalijst «Klanten» zoekt. */
export type RetailCardHolderSearchFields = {
  display_name?: string | null
  customer_name?: string | null
  phone?: string | null
  email?: string | null
  customer_address?: string | null
  customer_postal_code?: string | null
  customer_city?: string | null
  customer_btw_number?: string | null
  card_code?: string | null
}

/** Elke woord uit de zoekterm moet ergens in naam, adres, btw of pas zitten. */
export function retailCardHolderMatchesQuery(
  row: RetailCardHolderSearchFields,
  raw: string,
): boolean {
  const tokens = raw.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true
  const hay = [
    row.display_name,
    row.customer_name,
    row.phone,
    row.email,
    row.customer_address,
    row.customer_postal_code,
    row.customer_city,
    row.customer_btw_number,
    row.card_code,
  ]
    .filter((part) => part != null && String(part).trim() !== '')
    .join(' ')
    .toLowerCase()
  return tokens.every((token) => hay.includes(token))
}
