'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'

const DEFAULT_ANCHOR_ID = 'pricing-premium-card'

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
    if (!el) {
      const timer = window.setTimeout(trigger, 4000)
      return () => window.clearTimeout(timer)
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            trigger()
            obs.disconnect()
            break
          }
        }
      },
      { threshold: 0.35, rootMargin: '0px 0px -8% 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [observeAnchorId])

  const topArc = t('homeCornerStamp.topArc')
  const bottomArc = t('homeCornerStamp.bottomArc')

  return (
    <div
      className={`home-stamp-wrap pointer-events-none absolute bottom-3 right-3 z-10 hidden md:block w-[168px] h-[168px] sm:w-[188px] sm:h-[188px] ${
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
          <path id={arcUpperPathId} d="M 34 100 A 66 66 0 0 0 166 100" />
          <path id={arcLowerPathId} d="M 34 100 A 66 66 0 0 1 166 100" />
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
          fontSize="17"
          fontWeight="700"
          letterSpacing="0.06em"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <textPath href={`#${arcLowerPathId}`} startOffset="50%" textAnchor="middle">
            {topArc}
          </textPath>
        </text>
        <text
          fill="currentColor"
          fontSize="17"
          fontWeight="700"
          letterSpacing="0.04em"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <textPath href={`#${arcUpperPathId}`} startOffset="50%" textAnchor="middle">
            {bottomArc}
          </textPath>
        </text>
        <text x="100" y="69" textAnchor="middle" fill="currentColor" fontSize="16" opacity="0.95">
          ★
        </text>
        <text x="100" y="140" textAnchor="middle" fill="currentColor" fontSize="16" opacity="0.95">
          ★
        </text>
        <line x1="16" y1="86" x2="184" y2="86" stroke="currentColor" strokeWidth="2.8" />
        <line x1="16" y1="114" x2="184" y2="114" stroke="currentColor" strokeWidth="2.8" />
        <text
          x="100"
          y="110"
          textAnchor="middle"
          fill="currentColor"
          fontSize="28"
          fontWeight="800"
          letterSpacing="0.12em"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          VYSION
        </text>
      </svg>
    </div>
  )
}
