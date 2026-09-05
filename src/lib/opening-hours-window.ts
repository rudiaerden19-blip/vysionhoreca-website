/** Eén bron voor open/dicht, inclusief sluiting over middernacht (17:00–01:00). */

export function formatTimeShort(time: string): string {
  if (!time) return ''
  return time.slice(0, 5)
}

export function toMinutes(time: string): number {
  const [h, m] = formatTimeShort(time || '00:00').split(':').map(Number)
  return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0)
}

export function isOvernightRange(open: string, close: string): boolean {
  return toMinutes(close) <= toMinutes(open)
}

export function isInOpenWindow(now: string, open: string, close: string): boolean {
  const n = toMinutes(now)
  const o = toMinutes(open)
  const c = toMinutes(close)
  if (c <= o) return n >= o || n < c
  return n >= o && n < c
}

export function minutesSinceOpen(now: string, open: string): number {
  const n = toMinutes(now)
  const o = toMinutes(open)
  return n >= o ? n - o : n + 24 * 60 - o
}

export function leftoverOvernightClose(
  now: string,
  hours?: { is_open?: boolean; closed?: boolean; open?: string; close?: string; open_time?: string; close_time?: string; has_shift2?: boolean; hasShift2?: boolean; open_time_2?: string | null; close_time_2?: string | null; open2?: string; close2?: string },
): string | null {
  if (!hours || hours.closed === true || hours.is_open === false) return null
  const open = hours.open_time || hours.open
  const close = hours.close_time || hours.close
  if (open && close && isOvernightRange(open, close) && toMinutes(now) < toMinutes(close)) {
    return formatTimeShort(close)
  }
  const open2 = hours.open_time_2 || hours.open2
  const close2 = hours.close_time_2 || hours.close2
  const has2 = hours.has_shift2 || hours.hasShift2
  if (has2 && open2 && close2 && isOvernightRange(open2, close2) && toMinutes(now) < toMinutes(close2)) {
    return formatTimeShort(close2)
  }
  return null
}
