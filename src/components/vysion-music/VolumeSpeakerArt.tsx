'use client'

import { VmVolume1, VmVolume2 } from './VysionMusicIcons'
import styles from './vysion-music.module.css'

const VM_ICON_STROKE = 2.35

/** Zelfde mockup-blauw (#0095ff) op Mac en Windows — geen emoji/PNG. */
export function VolumeSpeakerArt({ large }: { large?: boolean }) {
  const wrapClass = large ? styles.volumeIconLarge : styles.volumeIcon
  const iconClass = large ? styles.volumeSpeakerSvgLarge : styles.volumeSpeakerSvg

  return (
    <span className={wrapClass} aria-hidden>
      {large ? (
        <VmVolume2 className={iconClass} strokeWidth={VM_ICON_STROKE} />
      ) : (
        <VmVolume1 className={iconClass} strokeWidth={VM_ICON_STROKE} />
      )}
    </span>
  )
}
