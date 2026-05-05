import type { Locale } from '@/i18n/config'

/**
 * Taal-badge (ISO-code alleen) — géén vlag-emoji: op Windows is dat vaak een leeg vakje.
 * Gebruik `className` voor contrast op lichte/donkere balk (bv. text-white op kassa-header).
 */
export function LocaleFlagEmoji({ locale, className }: { locale: Locale; className?: string }) {
  const code = locale.toUpperCase()
  return (
    <span
      className={`inline-flex h-8 min-w-[2.75rem] shrink-0 items-center justify-center rounded-lg border border-current/30 bg-black/15 px-2 text-center text-[11px] font-extrabold uppercase leading-none tracking-wide sm:min-w-[3rem] sm:text-xs ${className ?? ''}`}
      aria-hidden
    >
      {code}
    </span>
  )
}

/** Zelfde zichtbare badge; extra wrapper voor shop/marketing die aparte code-kleur wilde. */
export function LocaleFlagWithCode({
  locale,
  className,
  codeClassName,
}: {
  locale: Locale
  className?: string
  codeClassName?: string
}) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      <LocaleFlagEmoji locale={locale} className={codeClassName} />
    </span>
  )
}
