'use client'

/** Actieve server-ping voor GKS — niet vertrouwen op navigator.onLine. */
export const GKS_PING_INTERVAL_MS = 1500
export const GKS_PING_TIMEOUT_MS = 1200
export const GKS_PING_URL = '/api/ping?gks=1'

let internetLocked = true
let consecutiveSuccesses = 0
let pollTimer: number | null = null
let pollStarted = false
const listeners = new Set<() => void>()

function notifyListeners() {
  listeners.forEach((fn) => fn())
}

export function getGksInternetLocked(): boolean {
  return internetLocked
}

export function getGksInternetOnline(): boolean {
  return !internetLocked
}

/** 1 fail → lock; 2 opeenvolgende success → unlock. */
export function applyGksPingResult(ok: boolean): void {
  if (ok) {
    consecutiveSuccesses += 1
    if (consecutiveSuccesses >= 2) {
      if (internetLocked) {
        internetLocked = false
        notifyListeners()
      }
    }
  } else {
    consecutiveSuccesses = 0
    if (!internetLocked) {
      internetLocked = true
      notifyListeners()
    } else {
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
  if (opts?.online) {
    internetLocked = false
    consecutiveSuccesses = 2
  } else {
    internetLocked = true
    consecutiveSuccesses = 0
  }
  notifyListeners()
}

export function subscribeGksInternetLock(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
