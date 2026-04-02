'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'

/**
 * Fixed decorative stamp near pricing; animates once when #prijzen scrolls into view.
 */
export default function HomeCornerStamp() {
  const { t } = useLanguage()
  const uid = useId().replace(/:/g, '')
  const arcTopId = `home-stamp-arc-top-${uid}`
  const arcBotId = `home-stamp-arc-bot-${uid}`
  const [visible, setVisible] = useState(false)
  const triggeredRef = useRef(false)

  useEffect(() => {
    const el = document.getElementById('prijzen')
    const fallback = () => {
      if (!triggeredRef.current) {
        triggeredRef.current = true
        setVisible(true)
      }
    }
    if (!el) {
      const timer = window.setTimeout(fallback, 2500)
      return () => window.clearTimeout(timer)
    }
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !triggeredRef.current) {
            triggeredRef.current = true
            setVisible(true)
            obs.disconnect()
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -5% 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const topArc = t('homeCornerStamp.topArc')
  const bottomArc = t('homeCornerStamp.bottomArc')

  return (
    <div
      className={`home-stamp-wrap pointer-events-none fixed bottom-5 right-3 z-30 hidden md:block ${
        visible ? 'home-stamp-visible' : 'home-stamp-hidden'
      }`}
      aria-hidden="true"
    >
      <svg
        width="132"
        height="132"
        viewBox="0 0 200 200"
        className="text-[#3d4655] drop-shadow-[0_14px_28px_rgba(0,0,0,0.14)]"
      >
        <defs>
          <path id={arcTopId} d="M 34 100 A 66 66 0 0 0 166 100" fill="none" />
          <path id={arcBotId} d="M 34 100 A 66 66 0 0 1 166 100" fill="none" />
        </defs>
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          opacity="0.92"
        />
        <circle
          cx="100"
          cy="100"
          r="88"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          opacity="0.88"
        />
        <text
          fill="currentColor"
          fontSize="12"
          fontWeight="700"
          letterSpacing="0.14em"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <textPath href={`#${arcTopId}`} startOffset="50%" textAnchor="middle">
            {topArc}
          </textPath>
        </text>
        <text
          fill="currentColor"
          fontSize="12"
          fontWeight="700"
          letterSpacing="0.1em"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          <textPath href={`#${arcBotId}`} startOffset="50%" textAnchor="middle">
            {bottomArc}
          </textPath>
        </text>
        <text x="100" y="71" textAnchor="middle" fill="currentColor" fontSize="13" opacity="0.95">
          ★
        </text>
        <text x="100" y="138" textAnchor="middle" fill="currentColor" fontSize="13" opacity="0.95">
          ★
        </text>
        <line x1="18" y1="86" x2="182" y2="86" stroke="currentColor" strokeWidth="2.6" />
        <line x1="18" y1="114" x2="182" y2="114" stroke="currentColor" strokeWidth="2.6" />
        <text
          x="100"
          y="109"
          textAnchor="middle"
          fill="currentColor"
          fontSize="21"
          fontWeight="800"
          letterSpacing="0.1em"
          style={{ fontFamily: 'system-ui, sans-serif' }}
        >
          VYSION
        </text>
      </svg>
    </div>
  )
}
