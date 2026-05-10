import type { Locale } from '@/i18n/config'

/** Intl-regio’s: weekdag + datum komen uit dezelfde bron — altijd consistent. */
const localeTag: Record<Locale, string> = {
  nl: 'nl-BE',
  en: 'en-GB',
  fr: 'fr-BE',
  de: 'de-BE',
  es: 'es-ES',
  it: 'it-IT',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ar: 'ar-u-ca-gregory-nu-latn',
}

/**
 * Tekst in de kassa-datumbalk (compact): „wo 06 mei 2026” — weekdag afgekort,
 * dag/maand/jaar nog steeds uit dezelfde `Date`.
 * Geen vaste string — `date` bepaalt weekdag en dag tegelijk.
 */
export function formatKassaNumpadHeaderDate(date: Date, locale: Locale): string {
  const tag = localeTag[locale] ?? 'en-GB'
  const fmt = new Intl.DateTimeFormat(tag, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const parts = fmt.formatToParts(date)
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''

  let weekday = pick('weekday').replace(/\.$/, '').trim()
  const day = pick('day').trim()
  let month = pick('month').replace(/\.$/, '').trim().toLowerCase()
  const year = pick('year').trim()

  // In het Nederlands spreken we vaak „sept”; Intl geeft meestal „sep”.
  if (locale === 'nl' && month === 'sep') month = 'sept'

  // Arabisch (Latin digits): verbind met spaties; RTL laat de browser aan.
  return `${weekday} ${day} ${month} ${year}`.replace(/\s+/g, ' ').trim()
}

/** Klantscherm wachtscherm: weekdag + DD/MM/JJJJ — altijd in lokale tijdzone van het apparaat. */
export function formatKlantschermWaitingDateLine(
  date: Date,
  locale: Locale,
  opts?: { timeZone?: string },
): string {
  const tag = localeTag[locale] ?? 'en-GB'
  const tz = opts?.timeZone ? { timeZone: opts.timeZone } : {}
  const weekday = new Intl.DateTimeFormat(tag, { weekday: 'long', ...tz }).format(date)
  const rest = new Intl.DateTimeFormat(tag, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    ...tz,
  }).format(date)
  const cap = (s: string) => (s.length === 0 ? s : s.charAt(0).toUpperCase() + s.slice(1))
  return `${cap(weekday)} ${rest}`
}

/** 24-uurs tijd HH:mm voor klantscherm-klok. */
export function formatKlantschermWaitingClock(date: Date, locale: Locale, opts?: { timeZone?: string }): string {
  const tag = localeTag[locale] ?? 'en-GB'
  const tz = opts?.timeZone ? { timeZone: opts.timeZone } : {}
  return new Intl.DateTimeFormat(tag, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
    ...tz,
  }).format(date)
}

/** Uren en minuten apart voor grote digitale klok (knipperende dubbele punt). */
export function formatKlantschermWaitingClockParts(
  date: Date,
  locale: Locale,
  opts?: { timeZone?: string },
): {
  hours: string
  minutes: string
} {
  const tag = localeTag[locale] ?? 'en-GB'
  const tz = opts?.timeZone ? { timeZone: opts.timeZone } : {}
  const parts = new Intl.DateTimeFormat(tag, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    hourCycle: 'h23',
    ...tz,
  }).formatToParts(date)
  const hour = parts.find((p) => p.type === 'hour')?.value ?? '00'
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00'
  return { hours: hour, minutes: minute }
}
