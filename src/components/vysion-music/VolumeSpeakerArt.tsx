'use client'

import { useEffect, useState } from 'react'
import styles from './vysion-music.module.css'

/** Windows-kassa: vaste PNG. Mac/iOS: systeem-🔊 (Apple Color Emoji). */
const WIN_SPEAKER_SRC = '/images/vysion-music/speaker-emoji-win.png'

function useMacStyleVolumeEmoji(): boolean | null {
  const [macStyle, setMacStyle] = useState<boolean | null>(null)
  useEffect(() => {
    const p = navigator.platform ?? ''
    const ua = navigator.userAgent ?? ''
    const apple =
      /Mac|iPhone|iPad|iPod/i.test(p) || /Mac OS X|iPhone|iPad/i.test(ua)
    setMacStyle(apple)
  }, [])
  return macStyle
}

export function VolumeSpeakerArt({ large }: { large?: boolean }) {
  const macStyle = useMacStyleVolumeEmoji()
  const wrapClass = large ? styles.volumeIconLarge : styles.volumeIcon

  if (macStyle === true) {
    return (
      <span
        className={`${wrapClass} ${large ? styles.volumeSpeakerNativeLarge : styles.volumeSpeakerNative}`}
        aria-hidden
      >
        🔊
      </span>
    )
  }

  return (
    <span className={wrapClass} aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={WIN_SPEAKER_SRC}
        alt=""
        draggable={false}
        className={large ? styles.volumeSpeakerImgLarge : styles.volumeSpeakerImg}
      />
    </span>
  )
}
