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
 * Zelfde kassapagina, venster op de Hotmix-home. Geen aparte browsertab.
 * Geen sandbox: anders blokkeert de browser Hotmix-cookies (inlog blijft op «Inloggen» staan).
 * Na inloggen even «Vernieuwen» — Hotmix ververst de sessie niet altijd in een iframe.
 */
export function KassaHotmixRadioOverlay({ open, onClose }: Props) {
  const { t } = useLanguage()
  const [started, setStarted] = useState(false)
  const [hostReady, setHostReady] = useState(false)
  const [frameGeneration, setFrameGeneration] = useState(0)

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
            ? 'flex h-full max-h-[calc(100vh-2rem)] w-full max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl bg-[#151a21] shadow-2xl'
            : 'h-full w-full'
        }
      >
        {open ? (
          <div className="flex shrink-0 items-center justify-between gap-2 px-3 py-2">
            <p className="min-w-0 truncate text-sm font-bold text-white sm:text-base">Hotmix Radio</p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                data-testid="kassa-hotmix-refresh"
                title={t('kassaApp.hotmixRefreshHint')}
                onClick={() => setFrameGeneration((n) => n + 1)}
                className="min-h-[2.25rem] rounded-lg border border-white/25 bg-white/10 px-3 text-sm font-semibold text-white hover:bg-white/20"
              >
                {t('common.refresh')}
              </button>
              <button
                type="button"
                onClick={onClose}
                data-testid="kassa-hotmix-close"
                className="min-h-[2.25rem] shrink-0 rounded-lg bg-white px-3 text-sm font-bold text-[#151a21]"
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        ) : null}
        <iframe
          key={frameGeneration}
          title="Hotmix Radio"
          src={ONTBIJTHUISJE_HOTMIX_URL}
          className={open ? 'min-h-0 w-full flex-1 border-0 bg-white' : 'h-full w-full border-0'}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture; storage-access *"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    </div>,
    document.body,
  )
}
