'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'
import {
  activateAudioForIOS,
  initAudio,
  isAudioActivatedThisSession,
  markAudioActivated,
  playOrderNotification,
  prewarmAudio,
  setSoundsEnabled,
} from '@/lib/sounds'

/** Geluid op onlinescherm / keuken — zelfde browser-unlock als kassa. */
export function useOnlineDisplaySoundGate(tenant: string) {
  const [soundActivated, setSoundActivated] = useState(false)
  const audioUnlockOnceRef = useRef(false)

  useLayoutEffect(() => {
    setSoundActivated(isAudioActivatedThisSession(tenant))
  }, [tenant])

  const activateSound = useCallback(() => {
    setSoundsEnabled(true, tenant)
    activateAudioForIOS()
    initAudio()
    prewarmAudio()
    markAudioActivated(tenant)
    void playOrderNotification()
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      void Notification.requestPermission()
    }
    setSoundActivated(true)
  }, [tenant])

  useEffect(() => {
    if (!soundActivated) return
    setSoundsEnabled(true, tenant)
    prewarmAudio()
  }, [soundActivated, tenant])

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

export function OnlineDisplaySoundActivationScreen({
  onActivate,
}: {
  onActivate: () => void
}) {
  const { t } = useLanguage()

  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gray-100 p-8"
      role="dialog"
      aria-modal="true"
      aria-labelledby="online-display-sound-title"
    >
      <div className="max-w-md text-center text-gray-900">
        <h1 id="online-display-sound-title" className="mb-4 text-3xl font-bold">
          {t('kassaApp.soundTitle')}
        </h1>
        <p className="mb-6 text-lg text-gray-700">
          {t('kassaApp.soundBody')}
          <br />
          <br />
          <strong className="text-gray-900">{t('kassaApp.soundOncePerDay')}</strong>
        </p>
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault()
            onActivate()
          }}
          className="w-full rounded-2xl bg-accent py-5 text-xl font-bold text-white shadow-lg transition-colors hover:bg-accent/90 active:bg-[#0c4f6e]"
        >
          {t('kassaApp.soundActivateButton').toUpperCase()}
        </button>
        <p className="mt-6 text-sm text-gray-500">{t('kassaApp.soundHintFooter')}</p>
      </div>
    </div>
  )
}
