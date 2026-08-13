'use client'

import { useLanguage } from '@/i18n'
import { MARKETING_DEMO_SECTION_HREF } from '@/lib/marketing-demo-cta'

const btnBase =
  'inline-flex min-h-[48px] items-center justify-center rounded-full px-6 sm:px-8 py-3 sm:py-3.5 text-center text-sm font-semibold transition-colors sm:text-base'

type Props = {
  className?: string
  /** Stapel op mobiel, naast elkaar vanaf sm */
  layout?: 'row' | 'stack'
  /** Donkere hero / foto-achtergrond */
  onDark?: boolean
  /** Compacte header-knoppen (desktop hero-balk) */
  compact?: boolean
  /** Volle breedte knoppen in stack-layout */
  fullWidth?: boolean
}

export default function MarketingStartAndDemoButtons({
  className = '',
  layout = 'stack',
  onDark = false,
  compact = false,
  fullWidth = true,
}) {
  const { t, locale } = useLanguage()
  const registerHref = `/registreer?lang=${locale}`

  const widthClass = fullWidth ? 'w-full sm:w-auto' : ''
  const minW = layout === 'stack' && fullWidth ? 'sm:min-w-[200px]' : ''

  const primaryClass = onDark
    ? `${btnBase} bg-accent text-white shadow-home-btn hover:bg-accent/90 ${compact ? 'text-sm px-4 py-2.5 rounded-md' : ''}`
    : `${btnBase} bg-accent text-white shadow-home-btn hover:bg-accent/90 ${widthClass} ${minW}`

  const secondaryClass = onDark
    ? `${btnBase} border-2 border-white/80 bg-black/25 text-white backdrop-blur-[2px] hover:bg-black/40 ${compact ? 'text-sm px-4 py-2.5 rounded-md' : ''}`
    : `${btnBase} border-2 border-accent bg-white text-accent shadow-home-float hover:bg-accent/5 ${widthClass} ${minW}`

  const wrapClass = compact
    ? `hidden sm:flex items-center gap-2 shrink-0 ${className}`
    : layout === 'stack'
      ? `flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center ${className}`
      : `flex flex-wrap items-center justify-center gap-3 sm:gap-4 ${className}`

  return (
    <div className={wrapClass}>
      <a href={registerHref} className={primaryClass}>
        {t('heroLanding.ctaStartFree')}
      </a>
      <a href={MARKETING_DEMO_SECTION_HREF} className={secondaryClass}>
        {t('heroLanding.demoRequest')}
      </a>
    </div>
  )
}
