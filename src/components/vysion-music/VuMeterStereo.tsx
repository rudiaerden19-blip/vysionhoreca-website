'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  computeVuMeterChannels,
  VU_SEGMENT_COUNT,
  vuLitOpacity,
  vuSegmentZone,
} from '@/lib/vysion-music-vu-meter'
import styles from './vysion-music.module.css'

type Props = {
  playing: boolean
  volumePercent: number
  trackKey: string
}

function ChannelColumn({ level }: { level: number }) {
  const indices = useMemo(
    () => Array.from({ length: VU_SEGMENT_COUNT }, (_, i) => VU_SEGMENT_COUNT - 1 - i),
    [],
  )

  return (
    <div className={styles.vuChannel} aria-hidden>
      {indices.map((fromBottom) => {
        const zone = vuSegmentZone(fromBottom)
        const opacity = vuLitOpacity(level, fromBottom)
        const zoneClass =
          zone === 'green'
            ? styles.vuSegmentGreen
            : zone === 'yellow'
              ? styles.vuSegmentYellow
              : styles.vuSegmentRed
        const lit = opacity > 0.55
        return (
          <div
            key={fromBottom}
            className={`${styles.vuSegment} ${zoneClass} ${lit ? styles.vuSegmentLit : ''}`}
            style={{ opacity: lit ? 1 : opacity }}
          />
        )
      })}
    </div>
  )
}

export function VuMeterStereo({ playing, volumePercent, trackKey }: Props) {
  const [levels, setLevels] = useState({ left: 0.03, right: 0.03 })
  const rafRef = useRef<number | null>(null)
  const startRef = useRef(0)

  useEffect(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    if (!playing || volumePercent <= 0) {
      setLevels({ left: 0.03, right: 0.03 })
      return
    }

    startRef.current = performance.now()
    const frame = (now: number) => {
      const t = now - startRef.current
      setLevels(computeVuMeterChannels(t, volumePercent, trackKey, true))
      rafRef.current = requestAnimationFrame(frame)
    }
    rafRef.current = requestAnimationFrame(frame)

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
    }
  }, [playing, volumePercent, trackKey])

  return (
    <div className={styles.vuMeter} aria-hidden>
      <div className={styles.vuMeterScaleLeft}>
        <span>+8</span>
        <span>0</span>
        <span>-20</span>
        <span>-60</span>
      </div>
      <div className={styles.vuMeterFace}>
        <ChannelColumn level={levels.left} />
        <ChannelColumn level={levels.right} />
      </div>
      <div className={styles.vuMeterScaleRight}>
        <span>+8</span>
        <span>0</span>
        <span>-20</span>
        <span>-60</span>
      </div>
      <div className={styles.vuMeterDb}>dB</div>
    </div>
  )
}
