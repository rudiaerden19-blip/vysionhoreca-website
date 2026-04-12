/**
 * IndexedDB-persistentie voor kassa offline: menucache + offline orderwachtrij.
 * Vult aan op localStorage (sync) voor migratie en compatibiliteit.
 */

const DB_NAME = 'vysion-kassa-offline'
const DB_VERSION = 1
const STORE = 'kv'

type MenuSnapshot = {
  v: 1
  categoriesJson: string
  productsJson: string
  productsWithOptionsJson: string
  settingsJson?: string
  updatedAt: number
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onerror = () => reject(req.error)
    req.onsuccess = () => resolve(req.result)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
  })
}

export async function offlineDbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  try {
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      tx.onerror = () => reject(tx.error)
      const req = tx.objectStore(STORE).get(key) as IDBRequest<T | undefined>
      req.onsuccess = () => resolve(req.result)
    })
  } finally {
    db.close()
  }
}

export async function offlineDbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
      tx.objectStore(STORE).put(value, key)
    })
  } finally {
    db.close()
  }
}

export function menuCacheKey(tenant: string) {
  return `menu_v1_${tenant}`
}

export function offlineQueueDbKey(tenant: string) {
  return `offline_orders_v1_${tenant}`
}

export async function offlineDbSaveMenuSnapshot(
  tenant: string,
  payload: Omit<MenuSnapshot, 'v' | 'updatedAt'> & { updatedAt?: number }
): Promise<void> {
  const snap: MenuSnapshot = {
    v: 1,
    categoriesJson: payload.categoriesJson,
    productsJson: payload.productsJson,
    productsWithOptionsJson: payload.productsWithOptionsJson,
    settingsJson: payload.settingsJson,
    updatedAt: payload.updatedAt ?? Date.now(),
  }
  await offlineDbSet(menuCacheKey(tenant), snap)
}

export async function offlineDbLoadMenuSnapshot(tenant: string): Promise<MenuSnapshot | undefined> {
  const raw = await offlineDbGet<MenuSnapshot>(menuCacheKey(tenant))
  if (raw && raw.v === 1) return raw
  return undefined
}

export async function offlineDbGetOrderQueue(tenant: string): Promise<object[]> {
  const fromIdb = await offlineDbGet<object[]>(offlineQueueDbKey(tenant))
  if (Array.isArray(fromIdb)) return fromIdb
  return []
}

export async function offlineDbSetOrderQueue(tenant: string, queue: object[]): Promise<void> {
  await offlineDbSet(offlineQueueDbKey(tenant), queue)
}
