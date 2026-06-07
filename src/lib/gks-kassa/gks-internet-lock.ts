'use client'

/** Actieve server-ping voor GKS — niet vertrouwen op navigator.onLine. */
export const GKS_PING_INTERVAL_MS = 1500
export const GKS_PING_TIMEOUT_MS = 1200
export const GKS_PING_URL = '/api/ping?gks=1'

const GKS_INET_OK_SESSION_KEY = 'gks_internet_ok_at'
const GKS_INET_OK_SESSION_TTL_MS = 60_000

/** Volscherm alleen na bevestigde offline-ping (niet tijdens opstart/navigatie). */
let internetLocked = false
/** Minstens één ping afgerond — fiscale acties pas daarna (zonder overlay bij OK). */
let internetVerified = false
let consecutiveSuccesses = 0
let pollTimer: number | null = null
let pollStarted = false
const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach((fn) => fn())
}

function markSessionInternetOk(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(GKS_INET_OK_SESSION_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
}

function clearSessionInternetOk(): void {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(GKS_INET_OK_SESSION_KEY)
  } catch {
    /* ignore */
  }
}

function hydrateInternetLockFromSession(): void {
  if (typeof window === 'undefined') return
  try {
    const raw = sessionStorage.getItem(GKS_INET_OK_SESSION_KEY)
    if (!raw) return
    if (Date.now() - Number(raw) < GKS_INET_OK_SESSION_TTL_MS) {
      internetLocked = false
      internetVerified = true
      consecutiveSuccesses = 2
    }
  } catch {
    /* ignore */
  }
}

hydrateInternetLockFromSession()

/** Bevestigde offline → volscherm blur/popup. */
export function getGksInternetLocked(): boolean {
  return internetLocked
}

/** Fiscale acties: pas online na verify + niet locked. */
export function getGksInternetOnline(): boolean {
  return internetVerified && !internetLocked
}

/** 1 fail → lock + overlay; na lock: 2 opeenvolgende success → unlock. */
export function applyGksPingResult(ok: boolean): void {
  const wasVerified = internetVerified
  internetVerified = true

  if (ok) {
    consecutiveSuccesses += 1
    markSessionInternetOk()
    if (internetLocked) {
      if (consecutiveSuccesses >= 2) {
        internetLocked = false
        notifyListeners()
      }
    } else if (!wasVerified) {
      notifyListeners()
    }
  } else {
    consecutiveSuccesses = 0
    clearSessionInternetOk()
    if (!internetLocked) {
      internetLocked = true
      notifyListeners()
    } else if (!wasVerified) {
      notifyListeners()
    }
  }
}

export async function pingGksServerOnce(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  const ctrl = new AbortController()
  const timer = window.setTimeout(() => ctrl.abort(), GKS_PING_TIMEOUT_MS)
  try {
    const res = await fetch(GKS_PING_URL, {
      method: 'GET',
      cache: 'no-store',
      credentials: 'same-origin',
      signal: ctrl.signal,
    })
    return res.ok
  } catch {
    return false
  } finally {
    window.clearTimeout(timer)
  }
}

async function runPingTick(): Promise<void> {
  const ok = await pingGksServerOnce()
  applyGksPingResult(ok)
}

export function ensureGksInternetLockPolling(): void {
  if (pollStarted || typeof window === 'undefined') return
  pollStarted = true
  void runPingTick()
  pollTimer = window.setInterval(() => void runPingTick(), GKS_PING_INTERVAL_MS)
}

export function stopGksInternetLockPollingForTest(): void {
  if (pollTimer != null) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
  pollStarted = false
}

export function resetGksInternetLockForTest(opts?: { online?: boolean }): void {
  if (typeof window === 'undefined') {
    /* noop in node tests without window */
  } else {
    try {
      sessionStorage.removeItem(GKS_INET_OK_SESSION_KEY)
    } catch {
      /* ignore */
    }
  }
  if (opts?.online === true) {
    internetLocked = false
    internetVerified = true
    consecutiveSuccesses = 2
  } else if (opts?.online === false) {
    internetLocked = true
    internetVerified = true
    consecutiveSuccesses = 0
  } else {
    internetLocked = false
    internetVerified = false
    consecutiveSuccesses = 0
  }
  notifyListeners()
}

export function subscribeGksInternetLock(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
