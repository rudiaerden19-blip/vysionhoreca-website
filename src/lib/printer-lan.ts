/**
 * Lokale bonnenprinter (iPad/Vysion Print op poort 3001) — uitsluitend IPv4 op private ranges.
 * Geen hostnamen of cloud-discovery: alleen vast IP of handmatig ingevoerd adres.
 */

export const PRINTER_LAN_PRINT_SERVER_PORT = 3001

/** Ruime timeouts voor WiFi/Starlink-haperingen */
export const PRINT_PROXY_STATUS_TIMEOUT_MS = 5000
export const PRINT_PROXY_PRINT_TIMEOUT_MS = 15000

/** Heartbeat naar /status om print-server/printer wakker te houden */
export const PRINTER_LAN_HEARTBEAT_MS = 30000

export const PRINTER_POST_MAX_ATTEMPTS = 3
export const PRINTER_POST_RETRY_DELAY_MS = 1000

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

/** Zelfde private ranges als `/api/print-proxy` (SSRF-bescherming). */
export function isPrivateLanIpv4(host: string): boolean {
  const cleanIP = host.split(':')[0].trim()
  if (cleanIP === 'localhost' || cleanIP === '127.0.0.1') return true
  const parts = cleanIP.split('.')
  if (parts.length !== 4) return false
  const octets = parts.map((p) => parseInt(p, 10))
  if (octets.some((o) => Number.isNaN(o) || o < 0 || o > 255)) return false
  const [a, b] = octets
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 192 && b === 168) return true
  if (a === 169 && b === 254) return false
  return false
}

/**
 * Normaliseert invoer naar een IPv4-string zonder poort.
 * Geen DNS-namen — alleen `192.168.x.x` / `10.x` / `172.16-31.x` (optioneel `:poort` wordt genegeerd; print gebruikt altijd :3001).
 */
export function normalizeLanPrinterIp(raw: string): string | null {
  let s = raw.trim()
  if (!s) return null
  s = s.replace(/^https?:\/\//i, '').split('/')[0]
  const m = s.match(/^((?:\d{1,3}\.){3}\d{1,3})(?::\d+)?$/)
  if (!m) return null
  const h = m[1]
  if (!isPrivateLanIpv4(h)) return null
  return h
}

export type PrintProxyPostResult = { success: true } | { success: false; error: string }

/** Eén POST naar `/api/print-proxy` (de route zelf probeert tot 3× naar de print-server). */
export async function postPrintProxyOnce(body: Record<string, unknown>): Promise<PrintProxyPostResult> {
  try {
    const response = await fetch('/api/print-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = (await response.json().catch(() => ({}))) as { success?: boolean; error?: string }
    if (response.ok && data.success) return { success: true }
    return { success: false, error: data.error || `HTTP ${response.status}` }
  } catch (e: unknown) {
    return { success: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** Eén status-ping (geen retry-storm; heartbeat roept dit periodiek aan). */
export async function fetchPrinterOnlineViaProxy(printerIP: string): Promise<boolean> {
  const ip = normalizeLanPrinterIp(printerIP)
  if (!ip) return false
  try {
    const response = await fetch(`/api/print-proxy?printerIP=${encodeURIComponent(ip)}`)
    const data = (await response.json().catch(() => ({}))) as { status?: string }
    return data.status === 'online'
  } catch {
    return false
  }
}

/**
 * Start periodieke heartbeat (status-ping). Ruim altijd op met de returned functie.
 */
export function startPrinterLanHeartbeat(opts: {
  printerIP: string
  onResult: (online: boolean) => void
  intervalMs?: number
}): () => void {
  const ms = opts.intervalMs ?? PRINTER_LAN_HEARTBEAT_MS
  const ip = normalizeLanPrinterIp(opts.printerIP)
  if (!ip) return () => {}
  const tick = () => {
    void fetchPrinterOnlineViaProxy(ip).then(opts.onResult)
  }
  tick()
  const id = window.setInterval(tick, ms)
  return () => clearInterval(id)
}

/** Direct naar print-server (alleen bruikbaar zonder mixed-content blokkade). */
export async function postDirectLanPrintWithRetries(opts: {
  printerIP: string
  body: Record<string, unknown>
}): Promise<boolean> {
  const ip = normalizeLanPrinterIp(opts.printerIP)
  if (!ip) return false
  const url = `http://${ip}:${PRINTER_LAN_PRINT_SERVER_PORT}/print`
  for (let attempt = 0; attempt < PRINTER_POST_MAX_ATTEMPTS; attempt++) {
    try {
      const controller = new AbortController()
      const t = window.setTimeout(() => controller.abort(), PRINT_PROXY_PRINT_TIMEOUT_MS)
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(opts.body),
        signal: controller.signal,
      })
      window.clearTimeout(t)
      if (res.ok) {
        try {
          const data = (await res.json()) as { success?: boolean }
          if (data.success !== false) return true
        } catch {
          return true
        }
      }
    } catch {
      /* retry */
    }
    if (attempt < PRINTER_POST_MAX_ATTEMPTS - 1) {
      await sleep(PRINTER_POST_RETRY_DELAY_MS)
    }
  }
  return false
}
