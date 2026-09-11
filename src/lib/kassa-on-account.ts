export type KassaOnAccountEntry = {
  id: string
  tenant_slug: string
  customer_name: string
  entry_date: string
  amount: number
  amount_paid?: number | null
  is_paid: boolean
  created_at?: string
  updated_at?: string
}

export function normalizeOnAccountCustomerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function parseOnAccountAmount(raw: unknown): number {
  const n = parseOnAccountMoney(raw)
  return n != null && n > 0 ? n : 0
}

/** 0 toegestaan (nog niets betaald). Negatief of ongeldig → null. */
export function parseOnAccountMoney(raw: unknown): number | null {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(',', '.'))
  if (!Number.isFinite(n) || n < 0) return null
  return Math.round(n * 100) / 100
}

export function clampOnAccountPaid(amount: number, paid: number): number {
  const total = Number.isFinite(amount) ? Math.max(0, amount) : 0
  const got = Number.isFinite(paid) ? paid : 0
  return Math.round(Math.min(total, Math.max(0, got)) * 100) / 100
}

export function onAccountPaidSoFar(row: Pick<KassaOnAccountEntry, 'amount' | 'amount_paid' | 'is_paid'>): number {
  const total = Number(row.amount) || 0
  if (row.amount_paid != null && Number.isFinite(Number(row.amount_paid))) {
    return clampOnAccountPaid(total, Number(row.amount_paid))
  }
  if (row.is_paid) return clampOnAccountPaid(total, total)
  return 0
}

export function onAccountRemaining(row: Pick<KassaOnAccountEntry, 'amount' | 'amount_paid' | 'is_paid'>): number {
  const total = Number(row.amount) || 0
  return Math.round(Math.max(0, total - onAccountPaidSoFar(row)) * 100) / 100
}

export function onAccountIsSettled(row: Pick<KassaOnAccountEntry, 'amount' | 'amount_paid' | 'is_paid'>): boolean {
  return onAccountRemaining(row) <= 0
}

export function isOnAccountEntryDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function onAccountMonthKey(entryDate: string): string {
  return entryDate.slice(0, 7)
}

export function onAccountCustomerKey(name: string): string {
  return normalizeOnAccountCustomerName(name).toLocaleLowerCase('nl')
}

export type OnAccountOpenName = {
  name: string
  remaining: number
}

/** Sneloverzicht: per naam het openstaande restant (alleen > 0). */
export function summarizeOnAccountOpenByName(
  rows: readonly KassaOnAccountEntry[],
): OnAccountOpenName[] {
  const map = new Map<string, OnAccountOpenName>()
  for (const row of rows) {
    const remaining = onAccountRemaining(row)
    if (remaining <= 0) continue
    const name = normalizeOnAccountCustomerName(row.customer_name)
    const key = onAccountCustomerKey(name)
    const prev = map.get(key)
    if (prev) {
      prev.remaining = Math.round((prev.remaining + remaining) * 100) / 100
    } else {
      map.set(key, { name, remaining })
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'nl'))
}

export function groupOnAccountEntriesByDate(
  rows: readonly KassaOnAccountEntry[],
): { date: string; entries: KassaOnAccountEntry[] }[] {
  const map = new Map<string, KassaOnAccountEntry[]>()
  for (const row of rows) {
    const d = row.entry_date
    const list = map.get(d) ?? []
    list.push(row)
    map.set(d, list)
  }
  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, entries]) => ({
      date,
      entries: [...entries].sort((a, b) => a.customer_name.localeCompare(b.customer_name, 'nl')),
    }))
}
