import { playOrderNotification } from '@/lib/sounds'

let alarmInterval: ReturnType<typeof setInterval> | null = null

/** Herhaald alarm voor nieuwe reservatie-aanvragen (admin reserveringen, los van kassa-poll). */
export function startReservationRequestAlarmLoop(): void {
  if (alarmInterval) return
  void playOrderNotification().catch(() => {})
  alarmInterval = setInterval(() => {
    void playOrderNotification().catch(() => {})
  }, 2000)
}

export function stopReservationRequestAlarmLoop(): void {
  if (alarmInterval) {
    clearInterval(alarmInterval)
    alarmInterval = null
  }
}

export function isReservationRequestAlarmLoopRunning(): boolean {
  return alarmInterval !== null
}

/** Kassa-page stuurt alarm via window.startOrderAlarm; anders lokale loop. */
export function triggerReservationRequestAlarmSound(): void {
  if (typeof window === 'undefined') return
  const w = window as unknown as { startOrderAlarm?: () => void }
  if (typeof w.startOrderAlarm === 'function') {
    w.startOrderAlarm()
    return
  }
  startReservationRequestAlarmLoop()
}

export function isPendingOrWaitlistReservationStatus(status: unknown): boolean {
  const st = String(status ?? '').toUpperCase()
  return st === 'PENDING' || st === 'WAITLIST'
}
