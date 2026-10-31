import { addDaysToBelgiumYMD } from '@/lib/belgium-date-bounds'

/** Inclusief vandaag: de eigenaar kan 30 kalenderdagen terugkijken. */
export const STAFF_SALES_VISIBLE_DAYS = 30

const YMD = /^\d{4}-\d{2}-\d{2}$/

export type StaffSalesDayLine = {
  staffId: string
  name: string
  total: number
  orderCount: number
}

export function staffSalesVisibleRange(todayYmd: string): { minYmd: string; maxYmd: string } {
  return {
    minYmd: addDaysToBelgiumYMD(todayYmd, -(STAFF_SALES_VISIBLE_DAYS - 1)),
    maxYmd: todayYmd,
  }
}

export function isStaffSalesDateVisible(dateYmd: string, todayYmd: string): boolean {
  if (!YMD.test(dateYmd) || !YMD.test(todayYmd)) return false
  const { minYmd, maxYmd } = staffSalesVisibleRange(todayYmd)
  return dateYmd >= minYmd && dateYmd <= maxYmd
}

/**
 * Zelfde bonnen als het uitklok-overzicht: betaald, met kassa-medewerker.
 * Actieve medewerkers zonder verkoop blijven op €0 staan.
 */
export function buildStaffSalesDayLines(
  activeStaff: { id: string; name: string }[],
  extraStaff: { id: string; name: string }[],
  orders: { staffId: string | null | undefined; total: unknown }[],
): StaffSalesDayLine[] {
  const totals = new Map<string, { cents: number; orderCount: number }>()
  for (const order of orders) {
    const staffId = String(order.staffId ?? '').trim()
    if (!staffId) continue
    const cents = Math.round((Number(order.total) || 0) * 100)
    const current = totals.get(staffId) ?? { cents: 0, orderCount: 0 }
    current.cents += cents
    current.orderCount += 1
    totals.set(staffId, current)
  }

  const names = new Map<string, string>()
  for (const staff of activeStaff) {
    const id = String(staff.id ?? '').trim()
    if (!id) continue
    names.set(id, String(staff.name ?? '').trim())
  }
  for (const staff of extraStaff) {
    const id = String(staff.id ?? '').trim()
    if (!id || names.has(id)) continue
    names.set(id, String(staff.name ?? '').trim())
  }
  for (const staffId of totals.keys()) {
    if (!names.has(staffId)) names.set(staffId, '')
  }

  const lines: StaffSalesDayLine[] = [...names.keys()].map((staffId) => {
    const bucket = totals.get(staffId)
    return {
      staffId,
      name: names.get(staffId) ?? '',
      total: (bucket?.cents ?? 0) / 100,
      orderCount: bucket?.orderCount ?? 0,
    }
  })

  lines.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'nl') || a.staffId.localeCompare(b.staffId))
  return lines
}

export function staffSalesDayTotal(lines: StaffSalesDayLine[]): number {
  const cents = lines.reduce((sum, line) => sum + Math.round(line.total * 100), 0)
  return cents / 100
}
