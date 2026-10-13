/** LAN-print: iPad (Safari) → Windows Print Agent op vaste IP. Alleen actief met tenant-flag. */

export const KASSA_LAN_PRINT_HOST_STORAGE_PREFIX = 'vysion_lan_print_host_'

const PRINT_AGENT_PORT = 9742

export function kassaLanPrintHostStorageKey(tenantSlug: string): string {
  return `${KASSA_LAN_PRINT_HOST_STORAGE_PREFIX}${tenantSlug.trim()}`
}

export function isValidLanPrintHost(raw: string): boolean {
  const s = raw.trim()
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(s)) return false
  return s.split('.').every((part) => {
    const n = Number.parseInt(part, 10)
    return Number.isFinite(n) && n >= 0 && n <= 255
  })
}

export function vysionPrintAgentOriginFromHost(host: string, port = PRINT_AGENT_PORT): string {
  return `http://${host.trim()}:${port}`
}

export function readLanPrintHostForTenant(tenantSlug: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    const v = localStorage.getItem(kassaLanPrintHostStorageKey(tenantSlug))?.trim() || ''
    return isValidLanPrintHost(v) ? v : null
  } catch {
    return null
  }
}

export function writeLanPrintHostForTenant(tenantSlug: string, host: string): void {
  if (typeof window === 'undefined') return
  const key = kassaLanPrintHostStorageKey(tenantSlug)
  const trimmed = host.trim()
  if (!trimmed) {
    localStorage.removeItem(key)
    return
  }
  if (!isValidLanPrintHost(trimmed)) return
  localStorage.setItem(key, trimmed)
}

export type ResolveVysionPrintAgentOriginInput = {
  lanPrintEnabled: boolean
  tenantSlug: string
  tenantDefaultHost?: string | null
  probeLocalAgent?: () => Promise<boolean>
}

const DEFAULT_LOCAL_ORIGIN = 'http://127.0.0.1:9742'

/** Korte localhost-probe — PC met agent op dezelfde machine. */
export async function probeLocalVysionPrintAgent(timeoutMs = 400): Promise<boolean> {
  if (typeof fetch === 'undefined') return false
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const init: RequestInit = {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
    }
    ;(init as RequestInit & { targetAddressSpace?: string }).targetAddressSpace = 'local'
    const r = await fetch(`${DEFAULT_LOCAL_ORIGIN}/health`, init)
    if (!r.ok) return false
    const j = (await r.json()) as { ok?: boolean }
    return j.ok === true
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Zonder tenant-flag: altijd localhost (huidig gedrag).
 * Met flag: localhost als PC-agent bereikbaar; anders tenant-default of per-iPad IP in localStorage.
 */
export async function resolveVysionPrintAgentOrigin(
  input: ResolveVysionPrintAgentOriginInput,
): Promise<string> {
  if (!input.lanPrintEnabled) return DEFAULT_LOCAL_ORIGIN

  const probe = input.probeLocalAgent ?? probeLocalVysionPrintAgent
  if (await probe()) return DEFAULT_LOCAL_ORIGIN

  const fromDevice = readLanPrintHostForTenant(input.tenantSlug)
  if (fromDevice) return vysionPrintAgentOriginFromHost(fromDevice)

  const fromTenant = input.tenantDefaultHost?.trim() || ''
  if (fromTenant && isValidLanPrintHost(fromTenant)) {
    return vysionPrintAgentOriginFromHost(fromTenant)
  }

  return DEFAULT_LOCAL_ORIGIN
}
