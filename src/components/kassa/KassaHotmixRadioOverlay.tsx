'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLanguage } from '@/i18n'
import { ONTBIJTHUISJE_HOTMIX_URL } from '@/lib/kassa-ontbijthuisje-hotmix'

type Props = {
  open: boolean
  onClose: () => void
}

/**
 * Hotmix blijft in het document nadat de popup sluit, zodat login en audio
 * niet wegvallen terwijl de kassa verder gebruikt wordt.
 * sandbox zonder top-navigatie: de site kan de kassa niet vervangen.
 */
const HOTMIX_FRAME_SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation allow-downloads allow-storage-access-by-user-activation'

export function KassaHotmixRadioOverlay({ open, onClose }: Props) {
  const { t } = useLanguage()
  const [started, setStarted] = useState(false)
  const [hostReady, setHostReady] = useState(false)

  useEffect(() => {
    setHostReady(true)
  }, [])

  useEffect(() => {
    if (open) setStarted(true)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!started || !hostReady || typeof document === 'undefined') return null

  return createPortal(
    <div
      data-testid="kassa-hotmix-overlay"
      data-open={open ? 'true' : 'false'}
      role={open ? 'dialog' : undefined}
      aria-modal={open ? true : undefined}
      aria-label="Hotmix Radio"
      aria-hidden={open ? undefined : true}
      className={
        open
          ? 'fixed inset-0 z-[800] flex flex-col bg-[#0c1016]/80 p-3 sm:p-4'
          : 'pointer-events-none fixed -left-[9999px] top-0 -z-10 h-[480px] w-[640px] overflow-hidden opacity-0'
      }
    >
      {open ? (
        <div className="mb-3 flex shrink-0 items-center justify-between gap-3">
          <p className="text-lg font-bold text-white sm:text-2xl">Hotmix Radio</p>
          <button
            type="button"
            onClick={onClose}
            data-testid="kassa-hotmix-close"
            className="min-h-[3.15rem] shrink-0 rounded-xl bg-white px-6 text-lg font-bold text-[#151a21] shadow-lg sm:min-h-[3.45rem] sm:px-8 sm:text-xl"
          >
            {t('common.close')}
          </button>
        </div>
      ) : null}
      <iframe
        title="Hotmix Radio"
        src={ONTBIJTHUISJE_HOTMIX_URL}
        className={open ? 'min-h-0 w-full flex-1 rounded-xl border-0 bg-white' : 'h-full w-full border-0'}
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        sandbox={HOTMIX_FRAME_SANDBOX}
      />
    </div>,
    document.body,
  )
}
