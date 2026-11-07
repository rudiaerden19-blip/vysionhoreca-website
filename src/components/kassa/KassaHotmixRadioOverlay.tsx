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
          ? 'fixed inset-0 z-[800] flex items-center justify-center bg-black/40 p-4'
          : 'pointer-events-none fixed -left-[9999px] top-0 -z-10 h-[480px] w-[640px] overflow-hidden opacity-0'
      }
    >
      <div
        data-testid="kassa-hotmix-panel"
        className={
          open
            ? 'flex h-[30rem] max-h-[calc(100vh-2rem)] w-full max-w-[42rem] flex-col overflow-hidden rounded-2xl bg-[#151a21] shadow-2xl'
            : 'h-full w-full'
        }
      >
        {open ? (
          <div className="flex shrink-0 items-center justify-between gap-3 px-3 py-2">
            <p className="text-sm font-bold text-white sm:text-base">Hotmix Radio</p>
            <button
              type="button"
              onClick={onClose}
              data-testid="kassa-hotmix-close"
              className="min-h-[2.25rem] shrink-0 rounded-lg bg-white px-3 text-sm font-bold text-[#151a21]"
            >
              {t('common.close')}
            </button>
          </div>
        ) : null}
        <iframe
          title="Hotmix Radio"
          src={ONTBIJTHUISJE_HOTMIX_URL}
          className={open ? 'min-h-0 w-full flex-1 border-0 bg-white' : 'h-full w-full border-0'}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          sandbox={HOTMIX_FRAME_SANDBOX}
        />
      </div>
    </div>,
    document.body,
  )
}
