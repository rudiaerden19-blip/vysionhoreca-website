import type { Locale } from '@/i18n/config'

/**
 * Taal-weergave: `badge` = duidelijke tegel met rand (admin/marketing).
 * `inline` = alleen ISO-codetekst — op donkere balk naast bv. logout minder „dubbel vak”.
 */
export function LocaleFlagEmoji({
  locale,
  className,
  variant = 'badge',
}: {
  locale: Locale
  className?: string
  variant?: 'badge' | 'inline'
}) {
  const code = locale.toUpperCase()
  if (variant === 'inline') {
    return (
      <span className={`shrink-0 font-extrabold uppercase tracking-wide tabular-nums ${className ?? ''}`}>{code}</span>
    )
  }
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
