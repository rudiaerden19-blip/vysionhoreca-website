/** sessionStorage/localStorage in iframe, strikte Safari/PWA of cross-origin → SecurityError. */

export function safeSessionStorageGet(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage.getItem(key)
  } catch {
    return null
  }
}

export function safeSessionStorageSet(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false
  try {
    window.sessionStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function safeSessionStorageRemove(key: string): void {
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export function isSessionStorageAccessDeniedError(value: unknown): boolean {
  const msg =
    value instanceof Error
      ? `${value.name} ${value.message}`
      : typeof value === 'string'
        ? value
        : value != null &&
            typeof value === 'object' &&
            'message' in value &&
            typeof (value as { message: unknown }).message === 'string'
          ? (value as { message: string }).message
          : ''
  if (!msg) return false
  return (
    /sessionStorage/i.test(msg) &&
    (/access is denied/i.test(msg) ||
      /failed to read the ['"]sessionStorage['"] property/i.test(msg))
  )
}
