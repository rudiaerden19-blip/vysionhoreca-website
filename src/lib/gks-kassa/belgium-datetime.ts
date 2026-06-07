/** GKS API/UI: weergave altijd Europe/Brussels; opslag blijft UTC (timestamptz). */

export const GKS_DISPLAY_TIMEZONE = 'Europe/Brussels' as const

export function formatBelgiumDateTime(value: string | Date | null | undefined): string | null {
  if (value == null || value === '') return null
  const d = typeof value === 'string' ? new Date(value) : value
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('sv-SE', {
    timeZone: GKS_DISPLAY_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

const DEFAULT_TS_KEYS = ['created_at', 'updated_at', 'pos_date_time'] as const

/** Voegt per timestamp-kolom een `{key}_belgium` veld toe (ISO-UTC blijft staan). */
export function withBelgiumTimestampFields<T extends Record<string, unknown>>(
  row: T,
  keys: readonly string[] = DEFAULT_TS_KEYS,
): T & Record<string, string | null> {
  const out: Record<string, unknown> = { ...row }
  for (const key of keys) {
    if (!(key in row)) continue
    const raw = row[key]
    if (raw == null) {
      out[`${key}_belgium`] = null
      continue
    }
    out[`${key}_belgium`] = formatBelgiumDateTime(String(raw))
  }
  return out as T & Record<string, string | null>
}

export function gksApiTimeMeta(): {
  displayTimeZone: typeof GKS_DISPLAY_TIMEZONE
  serverTimeBelgium: string
} {
  return {
    displayTimeZone: GKS_DISPLAY_TIMEZONE,
    serverTimeBelgium: formatBelgiumDateTime(new Date()) ?? '',
  }
}
