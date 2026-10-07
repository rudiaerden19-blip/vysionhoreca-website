'use client'

import type { ReactNode } from 'react'
import styles from '@/components/klantscherm/klantscherm-display-shell.module.css'

/** Kleurrijke gradient-achtergrond voor bestelling / QR (geen plat zwart). */
export function KlantschermDisplayShell({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={styles.shell}>
      <div className={styles.mesh} aria-hidden />
      <div className={styles.blobA} aria-hidden />
      <div className={styles.blobB} aria-hidden />
      <div className={styles.blobC} aria-hidden />
      <div className={styles.vignette} aria-hidden />
      <div className={`${styles.content} ${className}`.trim()}>{children}</div>
    </div>
  )
}
