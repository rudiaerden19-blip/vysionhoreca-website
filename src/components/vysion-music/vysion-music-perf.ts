/** Tijdelijke performance-meting (console, geen secrets). */
export function perfNow(): number {
  if (typeof performance !== 'undefined' && performance.now) return performance.now()
  return Date.now()
}

export function perfLog(
  phase: string,
  startMs: number,
  extra?: Record<string, unknown>,
): number {
  const elapsedMs = Math.round(perfNow() - startMs)
  // eslint-disable-next-line no-console
  console.info('[vysion-music-perf]', { phase, elapsedMs, ...extra })
  return elapsedMs
}
