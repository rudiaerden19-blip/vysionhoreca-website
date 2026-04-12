/** Sessie na geslaagde code-check; alleen client-side (sessionStorage). */
export type SchoolShopSession = {
  weekId: string
  accessCode: string
  productIds: string[]
  orderDeadline: string
  title: string
}

export function schoolShopStorageKey(tenantSlug: string) {
  return `school_shop_${tenantSlug}`
}

export function readSchoolShopSession(tenantSlug: string): SchoolShopSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(schoolShopStorageKey(tenantSlug))
    if (!raw) return null
    const o = JSON.parse(raw) as SchoolShopSession
    if (!o?.weekId || !o?.accessCode || !Array.isArray(o.productIds)) return null
    return o
  } catch {
    return null
  }
}

export function writeSchoolShopSession(tenantSlug: string, session: SchoolShopSession) {
  sessionStorage.setItem(schoolShopStorageKey(tenantSlug), JSON.stringify(session))
}

export function clearSchoolShopSession(tenantSlug: string) {
  sessionStorage.removeItem(schoolShopStorageKey(tenantSlug))
}

/** Standaard: eerstvolgende vrijdag 08:00 in de browser-tijdzone (meestal BE). */
export function defaultNextFridayEightDatetimeLocalValue(): string {
  const d = new Date()
  const dow = d.getDay()
  const h = d.getHours()
  const mi = d.getMinutes()
  let daysToAdd = (5 - dow + 7) % 7
  if (daysToAdd === 0 && (h > 8 || (h === 8 && mi > 0))) {
    daysToAdd = 7
  }
  d.setDate(d.getDate() + daysToAdd)
  d.setHours(8, 0, 0, 0)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T08:00`
}

export function datetimeLocalToIso(value: string): string {
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString()
}
