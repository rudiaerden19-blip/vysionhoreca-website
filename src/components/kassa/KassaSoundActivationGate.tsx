'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'
import type { KassaRegisterUiTheme } from '@/lib/kassa-register-ui-theme'
import { activateAudioForIOS, initAudio, prewarmAudio } from '@/lib/sounds'

export function kassaSoundSessionKey(tenant: string): string {
  return `vysion_kassa_audio_ok_${tenant}`
}

/** Kassa-in-horeca sfeerbeeld — met overlay leesbaar op alle kassa-thema’s. */
export const KASSA_SOUND_ACTIVATION_RESTAURANT_BG = '/images/kassa-sound-activation-restaurant.jpg'

/** Zelfde CTA-blauw als login / marketing (tailwind `accent`). */
export const kassaSoundActivationPrimaryButtonClass =
  'flex w-full transform touch-manipulation items-center justify-center gap-4 rounded-2xl bg-accent py-6 text-2xl font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-[#0c5273] active:bg-accent/90'

export function KassaSoundActivationRestaurantBackdrop() {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url('${KASSA_SOUND_ACTIVATION_RESTAURANT_BG}')` }}
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-black/45" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-black/40 via-black/30 to-black/55"
        aria-hidden
      />
    </>
  )
}

type SoundUi = Pick<
  KassaRegisterUiTheme,
  'soundBackdrop' |  'soundHeading' |  'soundBody' |  'soundStrong' |  'soundMuted'
>

/**
 * Eén toestemmingsscherm per browsersessie (sessionStorage).
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
  ui: _ui,
  onActivate,
}: {
  ui: SoundUi
  onActivate: () => void
}) {
  const { t } = useLanguage()

  return (
    <div
      className="fixed inset-0 z-[650] flex flex-col items-center justify-center overflow-hidden p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kassa-sound-activation-title"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <KassaSoundActivationRestaurantBackdrop />
      <div className="relative z-10 max-w-md text-center text-white">
        <div className="mb-8 text-8xl"></div>
        <h1 id="kassa-sound-activation-title" className="mb-4 text-4xl font-bold drop-shadow-sm">
          {t('kassaApp.soundTitle')}
        </h1>
        <p className="mb-8 text-xl text-white/90 drop-shadow-sm">
          {t('kassaApp.soundBody')}
          <br />
          <br />
          <strong className="text-white">{t('kassaApp.soundOncePerDay')}</strong>
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
          className={kassaSoundActivationPrimaryButtonClass}
        >
          <span className="text-4xl"></span>
          {t('kassaApp.soundActivateButton').toUpperCase()}
        </button>
        <p className="mt-6 text-sm text-white/70 drop-shadow-sm"> {t('kassaApp.soundHintFooter')}</p>
      </div>
    </div>
  )
}
