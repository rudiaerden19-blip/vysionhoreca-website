'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'
import type { KassaRegisterUiTheme } from '@/lib/kassa-register-ui-theme'
import { activateAudioForIOS, initAudio, prewarmAudio } from '@/lib/sounds'

export function kassaSoundSessionKey(tenant: string): string {
  return `vysion_kassa_audio_ok_${tenant}`
}

type SoundUi = Pick<
  KassaRegisterUiTheme,
  'soundBackdrop' | 'soundHeading' | 'soundBody' | 'soundStrong' | 'soundMuted'
>

/**
 * Eén groen toestemmingsscherm per browsersessie (sessionStorage).
 */
export function useKassaSoundActivationGate(tenant: string) {
  const sessionKey = kassaSoundSessionKey(tenant)
  const [soundActivated, setSoundActivated] = useState(false)
  const audioUnlockOnceRef = useRef(false)

  useLayoutEffect(() => {
    let activated = false
    try {
      activated = sessionStorage.getItem(sessionKey) === 'true'
    } catch {
      activated = false
    }
    setSoundActivated(activated)
  }, [sessionKey])

  const activateSound = useCallback(() => {
    activateAudioForIOS()
    initAudio()
    prewarmAudio()
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
    try {
      sessionStorage.setItem(sessionKey, 'true')
    } catch {
      /* ignore */
    }
    setSoundActivated(true)
  }, [sessionKey])

  useEffect(() => {
    if (!soundActivated || audioUnlockOnceRef.current) return
    const onPointer = () => {
      if (audioUnlockOnceRef.current) return
      audioUnlockOnceRef.current = true
      activateAudioForIOS()
      initAudio()
      window.removeEventListener('pointerdown', onPointer, true)
    }
    window.addEventListener('pointerdown', onPointer, true)
    return () => window.removeEventListener('pointerdown', onPointer, true)
  }, [soundActivated])

  return { soundActivated, activateSound }
}

export function KassaSoundActivationScreen({
  ui,
  onActivate,
}: {
  ui: SoundUi
  onActivate: () => void
}) {
  const { t } = useLanguage()

  return (
    <div
      className={`fixed inset-0 z-[650] flex flex-col items-center justify-center p-8 ${ui.soundBackdrop}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="kassa-sound-activation-title"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className={`max-w-md text-center ${ui.soundHeading}`}>
        <div className="mb-8 text-8xl"></div>
        <h1 id="kassa-sound-activation-title" className={`mb-4 text-4xl font-bold ${ui.soundHeading}`}>
          {t('kassaApp.soundTitle')}
        </h1>
        <p className={`mb-8 text-xl ${ui.soundBody}`}>
          {t('kassaApp.soundBody')}
          <br />
          <br />
          <strong className={ui.soundStrong}>{t('kassaApp.soundOncePerDay')}</strong>
        </p>
        <button
          type="button"
          onPointerDown={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onActivate()
          }}
          className="flex w-full transform touch-manipulation items-center justify-center gap-4 rounded-2xl bg-green-500 py-6 text-2xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-green-600 active:bg-green-700"
        >
          <span className="text-4xl"></span>
          {t('kassaApp.soundActivateButton').toUpperCase()}
        </button>
        <p className={`mt-6 text-sm ${ui.soundMuted}`}> {t('kassaApp.soundHintFooter')}</p>
      </div>
    </div>
  )
}
