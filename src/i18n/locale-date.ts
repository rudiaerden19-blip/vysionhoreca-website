import type { Locale } from './config'

/** BCP 47 tags for `toLocaleDateString` / `Intl` (BE/NL product focus for nl). */
export const localeDateTags: Record<Locale, string> = {
  nl: 'nl-BE',
  en: 'en-GB',
  fr: 'fr-BE',
  de: 'de-DE',
  es: 'es-ES',
  it: 'it-IT',
  ja: 'ja-JP',
  zh: 'zh-CN',
  ar: 'ar-SA',
}

export function localeToDateTag(locale: Locale): string {
  return localeDateTags[locale] ?? localeDateTags.nl
}
