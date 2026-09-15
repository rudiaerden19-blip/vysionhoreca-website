import { nameTabCustomerKey } from '@/lib/kassa-name-account'

export type NameAccountOpenListItem = { id: string; name: string; remaining: number }

/** Bij elke open van de op-rekening-popup: schone sessie (vorige klant mag niet blijven staan). */
export function nameAccountModalSessionOnOpen(): {
  name: string
  selectedTabId: string | null
  confirmName: string | null
  payAmount: string
  error: string | null
} {
  return {
    name: '',
    selectedTabId: null,
    confirmName: null,
    payAmount: '',
    error: null,
  }
}

/** Lege naam → volledige lijst openstaande rekeningen; anders filter op invoer. */
export function nameAccountOpenListVisible(
  nameInput: string,
  openList: readonly NameAccountOpenListItem[],
  keyFn: (n: string) => string = nameTabCustomerKey,
): NameAccountOpenListItem[] {
  const q = keyFn(nameInput)
  if (!q) return [...openList]
  return openList.filter((x) => keyFn(x.name).includes(q))
}

/** Som openstaand saldo voor alle tabs met dezelfde klantnaam (normalised key). */
export function nameAccountOpenTotalForName(
  nameInput: string,
  openList: readonly NameAccountOpenListItem[],
  keyFn: (n: string) => string = nameTabCustomerKey,
): number {
  const key = keyFn(nameInput)
  if (!key) return 0
  const sum = openList.filter((x) => keyFn(x.name) === key).reduce((s, x) => s + x.remaining, 0)
  return Math.round(sum * 100) / 100
}

export function nameAccountOpenRemainingForTabId(
  tabId: string | null | undefined,
  openList: readonly NameAccountOpenListItem[],
): number | null {
  if (!tabId) return null
  const hit = openList.find((x) => x.id === tabId)
  return hit != null ? hit.remaining : null
}

/** Zelfde bedrag als in de lijst «Openstaande rekeningen» (bron voor het veld Bedrag open). */
export function nameAccountOpenTotalDisplay(
  nameInput: string,
  selectedTabId: string | null,
  openList: readonly NameAccountOpenListItem[],
  keyFn: (n: string) => string = nameTabCustomerKey,
): number {
  const byTab = nameAccountOpenRemainingForTabId(selectedTabId, openList)
  if (byTab != null && byTab > 0.001) return byTab
  return nameAccountOpenTotalForName(nameInput, openList, keyFn)
}

/** Totaal open — som van alle klanten in de lijst (zelfde bron als openstaande rekeningen). */
export function nameAccountGrandOpenTotal(openList: readonly NameAccountOpenListItem[]): number {
  const sum = openList.reduce((s, x) => s + x.remaining, 0)
  return Math.round(sum * 100) / 100
}

export function formatOpenAmountForInput(eur: number): string {
  return eur.toFixed(2).replace('.', ',')
}

export function parseOpenAmountInput(raw: string): number {
  return parseFloat(raw.replace(',', '.').trim())
}
