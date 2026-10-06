'use client'

import styles from './vysion-music.module.css'

const BAR_DELAYS = ['0s', '0.14s', '0.08s', '0.2s'] as const

export function TrackNowPlayingBars({ playing }: { playing: boolean }) {
  return (
    <span className={styles.trackRowEqualizer} aria-hidden>
      {BAR_DELAYS.map((delay, i) => (
        <span
          key={i}
          className={playing ? styles.trackEqBar : styles.trackEqBarIdle}
          style={playing ? { animationDelay: delay } : undefined}
        />
      ))}
    </span>
  )
}
