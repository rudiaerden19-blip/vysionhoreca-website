/** Lokale Vysion Print Agent (Windows): poort standaard 9742 — zie `sendToVysionPrintAgent`. */
export const VYSION_PRINT_AGENT_LOCAL_ORIGIN = 'http://127.0.0.1:9742'

const DEFAULT_AGENT_ORIGIN = VYSION_PRINT_AGENT_LOCAL_ORIGIN

export type VysionPrintAgentItem = {
  quantity: number
  name: string
  price: number
  choices?: { name: string; price: number }[]
}

export type VysionPrintAgentOrderData = {
  orderNumber: number | string
  orderType?: string
  tableNumber?: number | string | null
  items: VysionPrintAgentItem[]
  subtotal: number
  tax: number
  total: number
  paymentMethod?: string
}

export type VysionPrintAgentBusinessInfo = {
  name?: string
  address?: string
  postalCode?: string
  city?: string
  phone?: string
  vatNumber?: string
  website?: string
  vatRate?: number
}

export type VysionPrintAgentBody = {
  winkelnaam?: string
  storeName?: string
  bonInhoud: string
  receiptText?: string
  orderData?: VysionPrintAgentOrderData
  businessInfo?: VysionPrintAgentBusinessInfo
  copies?: number
  /** Open kassa-lade (drawer-kick) na het printen. */
  openDrawer?: boolean
  /** "kassa" (default, volledige bon) of "keuken" (compacte keukenbon). */
  receiptMode?: 'kassa' | 'keuken'
}

/** Zelfde JSON als POST /print — Android-app (PrintBridgeActivity) verwacht identieke structuur. */
function buildAgentRequestPayload(body: VysionPrintAgentBody) {
  return {
    winkelnaam: body.winkelnaam ?? body.storeName,
    storeName: body.storeName ?? body.winkelnaam,
    bonInhoud: body.bonInhoud ?? body.receiptText ?? '',
    receiptText: body.receiptText ?? body.bonInhoud ?? '',
    orderData: body.orderData,
    businessInfo: body.businessInfo,
    copies: body.copies,
    openDrawer: body.openDrawer === true,
    receiptMode: body.receiptMode || 'kassa',
  }
}

function isAndroidUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android/i.test(navigator.userAgent)
}

const ANDROID_KIOSK_SESSION_STORAGE_KEY = 'vysion_android_kiosk_session'

function persistAndroidKioskHint(): void {
  try {
    sessionStorage.setItem(ANDROID_KIOSK_SESSION_STORAGE_KEY, '1')
  } catch {
    /* private mode */
  }
  try {
    localStorage.setItem(ANDROID_KIOSK_SESSION_STORAGE_KEY, '1')
  } catch {
    /* private mode / quota */
  }
}

function readStoredAndroidKioskHint(): boolean {
  try {
    return (
      sessionStorage.getItem(ANDROID_KIOSK_SESSION_STORAGE_KEY) === '1' ||
      localStorage.getItem(ANDROID_KIOSK_SESSION_STORAGE_KEY) === '1'
    )
  } catch {
    return false
  }
}

/** Zelfde query als Vysion Kiosk „Open kassa in Chrome” (`MainActivity.ANDROID_KIOSK_Q`). */
function hasAndroidKioskSessionHint(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const q = new URLSearchParams(window.location.search).get('vysion_android_kiosk')
    if (q === '1') {
      persistAndroidKioskHint()
      return true
    }
    return readStoredAndroidKioskHint()
  } catch {
    return false
  }
}

/**
 * Chrome Android „Desktopweergave”: UA kan op Linux-desktop lijken zonder „Android”-token.
 * Touchscreen + Chrome + geen Windows/Mac wijst nog vaak op tablet/kiosk met misleidende UA.
 */
function looksLikeAndroidChromeDesktopUa(): boolean {
  if (typeof navigator === 'undefined') return false
  if (navigator.maxTouchPoints <= 0) return false
  const ua = navigator.userAgent
  if (!/\bChrome\/\d/.test(ua) || /\bEdg\//.test(ua)) return false
  if (/\bWindows NT\b/.test(ua) || /\bMac OS X\b/.test(ua)) return false
  return /\bLinux\b/.test(ua) || /\bAndroid\b/.test(ua)
}

/**
 * Tablet-printstrategie (brug eerst, fetch-timeout race): Android UA, kiosk-flag, of verdachte desktop-UA op touch-Chrome.
 */
export function isAndroidTabletPrintClient(): boolean {
  return isAndroidUserAgent() || hasAndroidKioskSessionHint() || looksLikeAndroidChromeDesktopUa()
}

/** UTF-8 → Base64 zoals Android Base64.DEFAULT (standaard alphabet, geen regelbreuken). */
function utf8ToBase64Json(utf8Json: string): string {
  if (typeof btoa === 'undefined') return ''
  try {
    return btoa(unescape(encodeURIComponent(utf8Json)))
  } catch {
    return ''
  }
}

/**
 * Custom scheme naar Vysion Kiosk-app.
 *
 * **Niet** `location.assign` als eerste keus: dan navigeert het **huidige** tabblad weg van HTTPS-kassa → SPA breekt,
 * gebruiker valt vaak terug op Chrome-start of moet opnieuw inloggen.
 *
 * Eerst `_blank` (popup of `<a target="_blank">`): hoofdtab blijft op de webkassa; het systeem stuurt de intent nog steeds naar de app.
 */
function openKioskDeepLink(url: string): boolean {
  if (typeof window === 'undefined') return false

  try {
    const secondary = window.open(url, '_blank')
    if (secondary != null) {
      window.setTimeout(() => {
        try {
          secondary.close()
        } catch {
          /* blanco tab na externe scheme — niet kritisch */
        }
      }, 500)
      return true
    }
  } catch {
    /* popup geblokkeerd */
  }

  if (typeof document !== 'undefined') {
    try {
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.style.display = 'none'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      return true
    } catch {
      /* fallback hieronder */
    }
  }

  try {
    window.location.assign(url)
    return true
  } catch {
    return false
  }
}

/**
 * Chrome op Android blokkeert vaak fetch naar http://127.0.0.1. De Vysion Kiosk-app registreert
 * vysionkiosk:// — zelfde payload als de Windows Print Agent (geen wijziging in apps/vysion-print-agent).
 *
 * UI-feedback hoort in React (banner), niet via window.alert ná async — Chrome blokkeert dat vaak.
 */
function tryVysionKioskPrintBridge(body: VysionPrintAgentBody): { ok: boolean; reason?: string } {
  if (typeof document === 'undefined') return { ok: false, reason: 'Geen document (SSR).' }
  if (!isAndroidTabletPrintClient()) {
    return { ok: false, reason: 'Geen tablet/kiosk-sessie — overslaan van vysionkiosk://.' }
  }
  const payload = buildAgentRequestPayload(body)
  let json: string
  try {
    json = JSON.stringify(payload)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, reason: `JSON.stringify mislukt: ${msg}` }
  }
  const d = utf8ToBase64Json(json)
  if (!d) return { ok: false, reason: 'Base64 mislukt (boninhoud te groot of speciale tekens).' }
  const enc = encodeURIComponent(d)
  if (enc.length > 750_000) {
    return { ok: false, reason: `URL te lang (${enc.length} tekens); bon moet korter of agent via USB PC.` }
  }
  const url = `vysionkiosk://print?d=${enc}`
  /** Korte defer: React kan succes-banner nog pinten voordat secundair tabblad/scheme wordt geopend. */
  if (typeof window !== 'undefined') {
    window.setTimeout(() => {
      openKioskDeepLink(url)
    }, 48)
    return { ok: true }
  }
  return { ok: false, reason: 'Geen window.' }
}

function tryVysionKioskDrawerBridge(): boolean {
  if (typeof document === 'undefined' || !isAndroidTabletPrintClient()) return false
  return openKioskDeepLink('vysionkiosk://drawer')
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function postPrintOnce(
  body: VysionPrintAgentBody,
  origin: string
): Promise<{ ok: boolean; detail: string }> {
  /** Hard timeout zodat een hangende agent de UI niet 30s vastzet. */
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)
  const url = `${origin.replace(/\/$/, '')}/print`
  try {
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildAgentRequestPayload(body)),
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
    }
    ;(init as RequestInit & { targetAddressSpace?: string }).targetAddressSpace = 'local'

    const r = await Promise.race([
      fetch(url, init),
      sleep(7000).then(() => {
        controller.abort()
        throw new DOMException('Hard deadline bij POST /print', 'AbortError')
      }),
    ])
    const text = await Promise.race([
      r.text(),
      sleep(3000).then(() => {
        throw new DOMException('Hard deadline bij lezen antwoord print-service', 'AbortError')
      }),
    ])
    let data: { success?: boolean; error?: string } | null = null
    try {
      data = text ? (JSON.parse(text) as { success?: boolean; error?: string }) : null
    } catch {
      data = null
    }
    if (r.ok && data?.success === true) return { ok: true, detail: '' }
    const agentErr = data?.error != null ? String(data.error) : ''
    const snippet = (text || '').slice(0, 280).trim() || '(lege response)'
    return {
      ok: false,
      detail: `POST ${url} → HTTP ${r.status} ${r.statusText}${agentErr ? `. Agent: ${agentErr}` : ''}. Body: ${snippet}`,
    }
  } catch (e) {
    const name = e instanceof Error ? e.name : 'Error'
    const msg = e instanceof Error ? e.message : String(e)
    if (name === 'AbortError') {
      return {
        ok: false,
        detail: `Timeout 6s naar ${url}. Start de Print Agent (Windows) of Vysion printdienst (tablet), of controleer firewall.`,
      }
    }
    return {
      ok: false,
      detail: `${name}: ${msg} (geen verbinding met 127.0.0.1:9742 — typisch op Android/Chrome of agent uit).`,
    }
  } finally {
    clearTimeout(timer)
  }
}

/** Resultaat voor UI (alert) bij mislukte bon. */
export type VysionPrintAgentResult = { ok: true } | { ok: false; error: string }

async function sendToVysionPrintAgentCore(
  body: VysionPrintAgentBody,
  origin: string,
): Promise<VysionPrintAgentResult> {
  const base = origin.replace(/\/$/, '')
  const tablet = isAndroidTabletPrintClient()

  /**
   * Android / Chrome: fetch naar 127.0.0.1 kan lang vasthangen → gebruikers zien alleen de grijs/blauwe balk.
   * Tablet-route eerst: dezelfde JSON als POST /print via vysionkiosk:// (Vysion Kiosk-app).
   * Windows blijft uitsluitend localhost naar de Print Agent — géén brug eerst.
   */
  if (tablet) {
    const bridge = tryVysionKioskPrintBridge(body)
    if (bridge.ok) return { ok: true }
    const r = await postPrintOnce(body, base)
    if (r.ok) return { ok: true }
    return {
      ok: false,
      error: [
        `Bonafdruk op deze tablet mislukt.`,
        ``,
        `App-brug vysionkiosk://: ${bridge.reason ?? '—'}`,
        ``,
        `Print-service op dit apparaat (127.0.0.1): ${r.detail}`,
        ``,
        `Tip: open de kassa via „Open kassa in Chrome” in de Vysion Kiosk-app en controleer de USB-printer.`,
      ].join('\n'),
    }
  }

  let lastDetail = 'Geen poging uitgevoerd.'
  /** Minder pogingen maar korter tussen herkoppeling — agent meestal wél bereikbaar; 5× lange backoff voelde als „traag“. */
  for (let i = 0; i < 3; i++) {
    const r = await postPrintOnce(body, base)
    if (r.ok) return { ok: true }
    lastDetail = r.detail
    if (i < 2) await sleep(200)
  }

  const parts = [
    `Lokaal printen naar 127.0.0.1:9742 is mislukt.`,
    ``,
    `Laatste fout:`,
    lastDetail,
    ``,
    `Op deze PC: controleer Print Agent bij de klok (groene status) en testprint.`,
  ]
  return { ok: false, error: parts.join('\n') }
}

export async function sendToVysionPrintAgent(
  body: VysionPrintAgentBody,
  origin = DEFAULT_AGENT_ORIGIN,
): Promise<VysionPrintAgentResult> {
  const core = sendToVysionPrintAgentCore(body, origin)
  /**
   * Altijd een muurklok: sommige Chrome/Android-combinaties laten fetch naar 127.0.0.1 of body.text()
   * vastlopen zonder nette Abort → blauwe „printer wordt aangesproken” voor altijd.
   * Tablet korter (brug hoort direct OK); Windows mag iets langer (meerdere retries).
   */
  const ms = isAndroidTabletPrintClient() ? 18_000 : 55_000
  const wallClock = sleep(ms).then(
    (): VysionPrintAgentResult => ({
      ok: false,
      error:
        `Print-service reageerde niet binnen ${Math.round(ms / 1000)} seconden.\n\n` +
        (isAndroidTabletPrintClient()
          ? 'Tablet: controleer „Vysion printdienst“, USB-printer, open de kassa via „Open kassa in Chrome” in de app, en zet Chrome Desktopweergave UIT. Herstart de Kiosk-app bij twijfel.'
          : 'PC: start de Print Agent (icoon bij de klok), testprint vanuit de agent. Controleer firewall en dat poort 9742 lokaal bereikbaar is.'),
    }),
  )
  return await Promise.race([core, wallClock])
}

/**
 * Stuurt enkel een drawer-kick (kassa-lade open) naar de Print Agent.
 * Gebruikt door de "Lade open"-knop in de kassa-UI.
 */
export async function openCashDrawer(origin = DEFAULT_AGENT_ORIGIN): Promise<boolean> {
  const base = origin.replace(/\/$/, '')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 4000)
  try {
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
    }
    ;(init as RequestInit & { targetAddressSpace?: string }).targetAddressSpace = 'local'
    const r = await fetch(`${base}/drawer`, init)
    const data = (await r.json().catch(() => null)) as { success?: boolean } | null
    if (r.ok && data?.success === true) return true
    if (tryVysionKioskDrawerBridge()) return true
    return false
  } catch {
    if (tryVysionKioskDrawerBridge()) return true
    return false
  } finally {
    clearTimeout(timer)
  }
}

/** Admin-pagina „Printer installatie”: lijst Windows-printers via Print Agent. */
export async function fetchVysionPrintAgentPrinterList(
  origin: string = VYSION_PRINT_AGENT_LOCAL_ORIGIN,
): Promise<{ ok: true; printers: string[] } | { ok: false; error: string; status?: number }> {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'SSR' }
  }
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 10_000)
  try {
    const base = origin.replace(/\/$/, '')
    const init: RequestInit = {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
    }
    ;(init as RequestInit & { targetAddressSpace?: string }).targetAddressSpace = 'local'
    const r = await fetch(`${base}/printers`, init)
    const data = (await r.json().catch(() => null)) as { ok?: boolean; printers?: unknown } | null
    if (r.ok && data && data.ok === true && Array.isArray(data.printers)) {
      return { ok: true, printers: data.printers.filter((p) => typeof p === 'string') as string[] }
    }
    return { ok: false, error: `HTTP ${r.status}`, status: r.status }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  } finally {
    clearTimeout(timer)
  }
}

/** Huidige printer + kassa-URL uit agent (zelfde als Electron Instellingen). */
export async function fetchVysionPrintAgentConfigSnapshot(
  origin: string = VYSION_PRINT_AGENT_LOCAL_ORIGIN,
): Promise<
  { ok: true; printerName: string; kassaUrl: string } | { ok: false; error: string; status?: number }
> {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'SSR' }
  }
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 10_000)
  try {
    const base = origin.replace(/\/$/, '')
    const init: RequestInit = {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      signal: controller.signal,
    }
    ;(init as RequestInit & { targetAddressSpace?: string }).targetAddressSpace = 'local'
    const r = await fetch(`${base}/config`, init)
    const data = (await r.json().catch(() => null)) as {
      ok?: boolean
      printerName?: string
      kassaUrl?: string
      error?: string
    } | null
    if (r.ok && data?.ok === true) {
      return {
        ok: true,
        printerName: typeof data.printerName === 'string' ? data.printerName : '',
        kassaUrl: typeof data.kassaUrl === 'string' ? data.kassaUrl : '',
      }
    }
    const err = data?.error != null ? String(data.error) : `HTTP ${r.status}`
    return { ok: false, error: err, status: r.status }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  } finally {
    clearTimeout(timer)
  }
}

/** Persisteer printer/kassa-url in Print Agent-config (browser → 127.0.0.1). */
export async function saveVysionPrintAgentConfigPatch(
  patch: { printerName?: string; kassaUrl?: string },
  origin: string = VYSION_PRINT_AGENT_LOCAL_ORIGIN,
): Promise<{ ok: true } | { ok: false; error: string; status?: number }> {
  if (typeof window === 'undefined') {
    return { ok: false, error: 'SSR' }
  }
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), 15_000)
  try {
    const base = origin.replace(/\/$/, '')
    const init: RequestInit = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify(patch || {}),
      signal: controller.signal,
    }
    ;(init as RequestInit & { targetAddressSpace?: string }).targetAddressSpace = 'local'
    const r = await fetch(`${base}/config`, init)
    const data = (await r.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    if (r.ok && data?.ok === true) return { ok: true }
    const err =
      data?.error != null
        ? String(data.error)
        : r.status === 503
          ? 'config-endpoint-not-available'
          : `HTTP ${r.status}`
    return { ok: false, error: err, status: r.status }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { ok: false, error: msg }
  } finally {
    clearTimeout(timer)
  }
}
