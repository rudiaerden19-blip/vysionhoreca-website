export type KassaOnAccountEntry = {
  id: string
  tenant_slug: string
  customer_name: string
  entry_date: string
  amount: number
  is_paid: boolean
  created_at?: string
  updated_at?: string
}

export function normalizeOnAccountCustomerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ')
}

export function parseOnAccountAmount(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw ?? '').replace(',', '.'))
  if (!Number.isFinite(n) || n <= 0) return 0
  return Math.round(n * 100) / 100
}

export function isOnAccountEntryDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function onAccountMonthKey(entryDate: string): string {
  return entryDate.slice(0, 7)
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
