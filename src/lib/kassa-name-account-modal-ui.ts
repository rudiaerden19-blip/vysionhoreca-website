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
