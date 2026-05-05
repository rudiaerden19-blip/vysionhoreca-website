import type { Locale } from '@/i18n/config'
import { localeFlags } from '@/i18n/config'

/** Vlag-emoji met fontstack (Windows); zonder alleen emoji is de knop soms leeg. */
export function LocaleFlagEmoji({ locale, className }: { locale: Locale; className?: string }) {
  return (
    <span className={`vysion-locale-emoji leading-none ${className ?? ''}`} aria-hidden>
      {localeFlags[locale]}
    </span>
  )
}

/** Emoji + vaste taalcode (NL) — altijd zichtbaar als vlag ontbreekt op het OS. */
export function LocaleFlagWithCode({ locale, className, codeClassName }: {
  locale: Locale
  className?: string
  codeClassName?: string
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      <LocaleFlagEmoji locale={locale} />
      <span className={`text-[0.7rem] font-bold uppercase tabular-nums sm:text-xs ${codeClassName ?? ''}`}>
        {locale}
      </span>
    </span>
  )
}
