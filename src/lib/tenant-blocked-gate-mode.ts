const STAFF_SEGMENTS = ['admin', 'display', 'klantscherm', 'keuken']

/** Personeelsschermen krijgen de kassa-melding en blijven pollen; publieke webshop alleen bij laden/focus. */
export function tenantBlockedGateMode(pathname: string): 'staff' | 'public' {
  const segments = pathname.split('/').filter(Boolean)
  return segments.some((s) => STAFF_SEGMENTS.includes(s)) ? 'staff' : 'public'
}
