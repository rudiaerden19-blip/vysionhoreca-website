/**
 * Pure merge van twee offline-orderlijsten (localStorage + IndexedDB snapshot).
 * Volgorde: eerst LS, dan IDB — zelfde iteratie als productie zodat bij dezelfde sleutel de laatste wint.
 */

export function mergeOfflineOrderQueueRows(fromLs: object[], fromIdb: object[]): object[] {
  const byUuid = new Map<string, object>()
  const legacyNum = new Map<number, object>()
  for (const o of [...fromLs, ...fromIdb]) {
    const row = o as { kassa_client_uuid?: string; order_number?: number }
    const u = row.kassa_client_uuid
    if (typeof u === 'string' && u.length > 0) {
      byUuid.set(u, o)
    } else if (typeof row.order_number === 'number') {
      legacyNum.set(row.order_number, o)
    } else {
      const fallbackKey = `legacy:${String((row as { created_at?: string }).created_at ?? '')}:${String((row as { total?: number }).total ?? '')}`
      byUuid.set(fallbackKey, o)
    }
  }
  return [...byUuid.values(), ...legacyNum.values()]
}
