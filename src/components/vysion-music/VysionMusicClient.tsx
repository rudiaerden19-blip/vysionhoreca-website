'use client'

import Link from 'next/link'
import { useLanguage } from '@/i18n'
import styles from './vysion-music.module.css'

export function VysionMusicClient({
  businessName,
  kassaHref,
}: {
  tenant: string
  businessName: string
  kassaHref: string
}) {
  const { t } = useLanguage()

  return (
    <div className={styles.blankRoot}>
      <header className={styles.blankHeader}>
        <Link href={kassaHref} className={styles.blankBack} prefetch={false}>
          {t('vysionMusic.backToKassa')}
        </Link>
        <span className={styles.blankBrand}>VYSION MUSIC</span>
        <span className={styles.blankVenue}>{businessName}</span>
      </header>

      <main className={styles.blankMain}>
        <h1 className={styles.blankTitle}>{t('vysionMusic.blankSlateTitle')}</h1>
        <p className={styles.blankHint}>{t('vysionMusic.blankSlateHint')}</p>
      </main>
    </div>
  )
}
