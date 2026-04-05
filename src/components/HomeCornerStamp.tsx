'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'

/** Klein gebied bij Premium-CTA; volledige kaart triggert te vroeg als alleen de bovenkant in beeld is. */
const DEFAULT_ANCHOR_ID = 'pricing-premium-stamp-anchor'

type Props = {
  /** Card/container to observe; stamp animates when this intersects the viewport. */
  observeAnchorId?: string
  /** Optional i18n keys (full path, e.g. `subscriptionsPage.premiumStampTop`). Omits defaults: home boogteksten + midden `VYSION`. */
  arcTopKey?: string
  arcBottomKey?: string
  centerWordKey?: string
}

/**
 * Rubber-stamp graphic for the pricing Premium (Pro) card.
 * Renders absolute — parent must be `relative`.
 */
export default function HomeCornerStamp({
  observeAnchorId = DEFAULT_ANCHOR_ID,
  arcTopKey,
  arcBottomKey,
  centerWordKey,
}: Props) {
  const { t } = useLanguage()
  const uid = useId().replace(/:/g, '')
  /** Path meta: sweep 0 = bovenboog in SVG; textPath zet glyphs visueel langs de andere boog. */
  const arcUpperPathId = `home-stamp-arc-u-${uid}`
  const arcLowerPathId = `home-stamp-arc-l-${uid}`
  /** Langere onderboog voor software/hardware-stempel: "hardware" lager + ruimer om de ★ heen. */
  const arcUpperOuterPathId = `home-stamp-arc-uout-${uid}`
  const [visible, setVisible] = useState(false)
  const triggeredRef = useRef(false)

  useEffect(() => {
    const el = document.getElementById(observeAnchorId)
    const trigger = () => {
      if (!triggeredRef.current) {
        triggeredRef.current = true
        setVisible(true)
      }
    }
    // Geen timeout-fallback: die liet de stempel “meteen” verschijnen bij edge cases.
    if (!el) return

    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          // Strakker: merendeel van het anker zichtbaar, en binnen een ingekaderde viewport (minder vroeg).
          if (e.isIntersecting && e.intersectionRatio >= 0.5) {
            trigger()
            obs.disconnect()
            break
          }
        }
      },
      {
        threshold: [0, 0.25, 0.5, 0.75, 1],
        rootMargin: '-18% 0px -22% 0px',
      }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [observeAnchorId])

  const topArc = arcTopKey ? t(arcTopKey) : t('homeCornerStamp.topArc')
  const bottomArc = arcBottomKey ? t(arcBottomKey) : t('homeCornerStamp.bottomArc')
  const centerWord = centerWordKey ? t(centerWordKey) : 'VYSION'
  const centerFontSize = centerWordKey ? (centerWord.length > 9 ? 14 : centerWord.length > 6 ? 17 : 22) : 26
  const centerLetterSpacing = centerWordKey ? '0.06em' : '0.14em'

  return (
    <div
      className={`home-stamp-wrap pointer-events-none absolute bottom-3 right-3 z-10 hidden md:block overflow-visible w-[176px] h-[176px] sm:w-[198px] sm:h-[198px] ${
        visible ? 'home-stamp-visible' : 'home-stamp-hidden'
      }`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 200 200"
        overflow="visible"
        className="h-full w-full text-black drop-shadow-[0_10px_22px_rgba(0,0,0,0.12)]"
        fill="none"
      >
        <defs>
          {/* Kleinere straal = boogtekst verder van de dubbele ring (meest was te dicht tegen de rand). */}
          <path id={arcUpperPathId} d="M 42 100 A 58 58 0 0 0 158 100" />
          <path id={arcLowerPathId} d="M 42 100 A 58 58 0 0 1 158 100" />
          {centerWordKey ? (
            <path id={arcUpperOuterPathId} d="M 28 100 A 72 72 0 0 0 172 100" />
          ) : null}
        </defs>
        <circle
          cx="100"
          cy="100"
          r="78"
          stroke="currentColor"
          strokeWidth="4"
          opacity="0.95"
        />
        <circle
          cx="100"
          cy="100"
          r="85"
          stroke="currentColor"
          strokeWidth="2.2"
          opacity="0.9"
        />
        {/* boven: meest — groter lettertype, boog ver naar binnen */}
        <text
          fill="currentColor"
          fontSize="19"
          fontWeight="800"
          letterSpacing="0.1em"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <textPath href={`#${arcLowerPathId}`} startOffset="50%" textAnchor="middle">
            {topArc}
          </textPath>
        </text>
        <text
          fill="currentColor"
          fontSize={centerWordKey ? 17 : 15}
          fontWeight="700"
          letterSpacing={centerWordKey ? '0.07em' : '0.05em'}
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <textPath
            href={`#${centerWordKey ? arcUpperOuterPathId : arcUpperPathId}`}
            startOffset="50%"
            textAnchor="middle"
          >
            {bottomArc}
          </textPath>
        </text>
        <text x="100" y="64" textAnchor="middle" fill="currentColor" fontSize="14" opacity="0.95">
          ★
        </text>
        <text x="100" y="148" textAnchor="middle" fill="currentColor" fontSize="14" opacity="0.95">
          ★
        </text>
        <line x1="14" y1="78" x2="186" y2="78" stroke="currentColor" strokeWidth="2.8" />
        <line x1="14" y1="122" x2="186" y2="122" stroke="currentColor" strokeWidth="2.8" />
        <text
          x="100"
          y="105"
          textAnchor="middle"
          fill="currentColor"
          fontSize={centerFontSize}
          fontWeight="800"
          letterSpacing={centerLetterSpacing}
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          {centerWord}
        </text>
      </svg>
    </div>
  )
}
