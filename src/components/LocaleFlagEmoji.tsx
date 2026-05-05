import type { Locale } from '@/i18n/config'
import { localeFlags } from '@/i18n/config'

/**
 * Vlag-emoji + ISO-taalcode (nl, en, …).
 * Op Windows tonen regional-indicator vlag-emoji’s vaak niet; de code blijft dan leesbaar.
 */
export function LocaleFlagEmoji({ locale, className }: { locale: Locale; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-0.5 leading-none ${className ?? ''}`}>
      <span className="vysion-locale-emoji shrink-0" aria-hidden>
        {localeFlags[locale]}
      </span>
      <span className="shrink-0 text-[10px] font-extrabold uppercase leading-none tracking-tight sm:text-[11px]">
        {locale}
      </span>
    </span>
  )
}

/** Emoji + iets grotere taalcode — geen dubbele code t.o.v. LocaleFlagEmoji. */
export function LocaleFlagWithCode({ locale, className, codeClassName }: {
  locale: Locale
  className?: string
  codeClassName?: string
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      <span className="vysion-locale-emoji leading-none" aria-hidden>
        {localeFlags[locale]}
      </span>
      <span className={`text-[0.7rem] font-bold uppercase tabular-nums sm:text-xs ${codeClassName ?? ''}`}>
        {locale}
      </span>
    </span>
  )
}
