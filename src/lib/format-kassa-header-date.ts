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
