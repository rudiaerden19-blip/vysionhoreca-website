'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'

/** Klein gebied bij Premium-CTA; volledige kaart triggert te vroeg als alleen de bovenkant in beeld is. */
const DEFAULT_ANCHOR_ID = 'pricing-premium-stamp-anchor'

type Props = {
  /** Card/container to observe; stamp animates when this intersects the viewport. */
  observeAnchorId?: string
}

/**
 * Rubber-stamp graphic for the pricing Premium (Pro) card.
 * Renders absolute — parent must be `relative`.
 */
export default function HomeCornerStamp({ observeAnchorId = DEFAULT_ANCHOR_ID }: Props) {
  const { t } = useLanguage()
  const uid = useId().replace(/:/g, '')
  /** Path meta: sweep 0 = bovenboog in SVG; textPath zet glyphs visueel langs de andere boog. */
  const arcUpperPathId = `home-stamp-arc-u-${uid}`
  const arcLowerPathId = `home-stamp-arc-l-${uid}`
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

  const topArc = t('homeCornerStamp.topArc')
  const bottomArc = t('homeCornerStamp.bottomArc')

  return (
    <div
      className={`home-stamp-wrap pointer-events-none absolute bottom-3 right-3 z-10 hidden md:block w-[176px] h-[176px] sm:w-[198px] sm:h-[198px] ${
        visible ? 'home-stamp-visible' : 'home-stamp-hidden'
      }`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 200 200"
        className="h-full w-full text-black drop-shadow-[0_10px_22px_rgba(0,0,0,0.12)]"
        fill="none"
      >
        <defs>
          {/* Langere straal = boogtekst dichter bij de buitenrand, meer ruimte rond het middenblok */}
          <path id={arcUpperPathId} d="M 28 100 A 72 72 0 0 0 172 100" />
          <path id={arcLowerPathId} d="M 28 100 A 72 72 0 0 1 172 100" />
        </defs>
        <circle
          cx="100"
          cy="100"
          r="80"
          stroke="currentColor"
          strokeWidth="4.2"
          opacity="0.95"
        />
        <circle
          cx="100"
          cy="100"
          r="88"
          stroke="currentColor"
          strokeWidth="2.4"
          opacity="0.9"
        />
        {/* boven: meest (topArc) — koppeling aan path zo dat glyphs aan bovenkant van de stempel staan */}
        <text
          fill="currentColor"
          fontSize="16"
          fontWeight="700"
          letterSpacing="0.08em"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <textPath href={`#${arcLowerPathId}`} startOffset="50%" textAnchor="middle">
            {topArc}
          </textPath>
        </text>
        <text
          fill="currentColor"
          fontSize="16"
          fontWeight="700"
          letterSpacing="0.06em"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <textPath href={`#${arcUpperPathId}`} startOffset="50%" textAnchor="middle">
            {bottomArc}
          </textPath>
        </text>
        <text x="100" y="58" textAnchor="middle" fill="currentColor" fontSize="15" opacity="0.95">
          ★
        </text>
        <text x="100" y="150" textAnchor="middle" fill="currentColor" fontSize="15" opacity="0.95">
          ★
        </text>
        <line x1="14" y1="78" x2="186" y2="78" stroke="currentColor" strokeWidth="2.8" />
        <line x1="14" y1="122" x2="186" y2="122" stroke="currentColor" strokeWidth="2.8" />
        <text
          x="100"
          y="105"
          textAnchor="middle"
          fill="currentColor"
          fontSize="26"
          fontWeight="800"
          letterSpacing="0.14em"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          VYSION
        </text>
      </svg>
    </div>
  )
}
