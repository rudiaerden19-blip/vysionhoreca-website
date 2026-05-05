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
      {/* Alleen pijl: onder typische adresbalk / tabstrip, naar echte browsersluitknop boven */}
      {/* Geen nep-kruisje (anders tikken gebruikers fout op een knop die niets doet). */}
      <div
        className="pointer-events-none fixed z-[245] flex flex-col items-end"
        style={{
          top: 'calc(env(safe-area-inset-top, 0px) + 2px)',
          right: 'max(2px, env(safe-area-inset-right, 0px))',
        }}
        aria-hidden
      >
        <svg
          viewBox="0 0 64 112"
          className="h-24 w-[3.25rem] text-orange-400 drop-shadow-[0_2px_6px_rgba(0,0,0,.5)] motion-safe:animate-[pulse_2s_ease-in-out_infinite] sm:h-28 sm:w-14"
          fill="none"
        >
          <path
            d="M32 106 L32 36"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
          />
          <path
            d="M8 54 L32 26 L56 54"
            stroke="currentColor"
            strokeWidth="6"
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
