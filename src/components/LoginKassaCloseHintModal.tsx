'use client'

import { useLanguage } from '@/i18n'

export function LoginKassaCloseHintModal({
  open,
  onDismiss,
}: {
  open: boolean
  onDismiss: () => void
}) {
  const { t } = useLanguage()
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[240] flex items-center justify-center bg-black/55 p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={t('login.kassaCloseHint.message')}
    >
      {/* Voorbeeld sluitknop + pijl: wijst naar echte browsersluitknop rechtsboven */}
      <div
        className="pointer-events-none fixed right-3 top-[max(0.5rem,env(safe-area-inset-top))] z-[245] flex flex-col items-end gap-1 sm:right-6 sm:top-6 sm:gap-2"
        aria-hidden
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-md border-2 border-white/90 bg-zinc-800/95 shadow-lg sm:h-10 sm:w-10">
          <svg viewBox="0 0 24 24" className="size-[1.125rem] text-white sm:size-5" fill="none" aria-hidden>
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
        <svg
          viewBox="0 0 56 72"
          className="-mt-1 h-[4.25rem] w-[3.25rem] text-orange-400 drop-shadow-[0_2px_4px_rgba(0,0,0,.45)] motion-safe:animate-[pulse_2.2s_ease-in-out_infinite] sm:h-[5rem] sm:w-[3.75rem]"
          fill="none"
          aria-hidden
        >
          <path
            d="M8 64 C 20 44, 28 28, 44 12"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M30 16 L44 12 L40 26"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      </div>

      <div className="relative z-[2] w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
        <p className="text-base leading-relaxed text-gray-800 sm:text-lg">
          {t('login.kassaCloseHint.message')}
        </p>
        <div className="mt-8 flex justify-end">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl bg-accent px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-accent/90 active:scale-[0.98]"
          >
            {t('login.kassaCloseHint.understood')}
          </button>
        </div>
      </div>
    </div>
  )
}
