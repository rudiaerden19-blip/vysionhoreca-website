'use client'

import { createPortal } from 'react-dom'

type Props = {
  hint: string
  onStop: () => void
  stopLabel: string
  barcodePreview?: string
  onTapFocus?: () => void
  tapFocusLabel?: string
  torchAvailable?: boolean
  torchOn?: boolean
  onTorchToggle?: () => void
  torchOnLabel?: string
  torchOffLabel?: string
  onPhotoScan?: () => void
  photoScanLabel?: string
}

function CornerBracket({ className }: { className: string }) {
  return (
    <span
      className={`absolute h-10 w-10 border-[4px] border-emerald-400 sm:h-12 sm:w-12 ${className}`}
      aria-hidden
    />
  )
}

/** Volledig scherm viewfinder — hele camera beeld is scanzone. */
export function RetailBarcodeScannerFullscreen({
  hint,
  onStop,
  stopLabel,
  barcodePreview,
  onTapFocus,
  tapFocusLabel,
  torchAvailable,
  torchOn,
  onTorchToggle,
  torchOnLabel,
  torchOffLabel,
  onPhotoScan,
  photoScanLabel,
}: Props) {
  if (typeof document === 'undefined') return null

  return createPortal(
    <>
      <button
        type="button"
        aria-label={tapFocusLabel}
        className="fixed inset-0 z-[805] touch-manipulation bg-transparent"
        onClick={() => onTapFocus?.()}
      />

      <div className="pointer-events-none fixed inset-0 z-[810] flex flex-col" aria-hidden>
        <CornerBracket className="left-[3%] top-[max(3%,env(safe-area-inset-top))] rounded-tl-md border-r-0 border-b-0" />
        <CornerBracket className="right-[3%] top-[max(3%,env(safe-area-inset-top))] rounded-tr-md border-b-0 border-l-0" />
        <CornerBracket className="bottom-[max(3%,env(safe-area-inset-bottom))] left-[3%] rounded-bl-md border-r-0 border-t-0" />
        <CornerBracket className="bottom-[max(3%,env(safe-area-inset-bottom))] right-[3%] rounded-br-md border-l-0 border-t-0" />

        <div className="absolute inset-x-[6%] top-1/2 h-px -translate-y-1/2 bg-white/20" />
        <div className="animate-retail-barcode-scan-line absolute inset-x-[4%] top-[18%] h-1 rounded-full bg-red-500 shadow-[0_0_14px_3px_rgba(239,68,68,0.9)]" />

        <p className="absolute inset-x-4 bottom-[max(4.5rem,calc(env(safe-area-inset-bottom)+3rem))] text-center text-sm font-semibold leading-snug text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] sm:text-base">
          {hint}
        </p>
      </div>

      <div className="fixed inset-x-0 top-0 z-[820] flex items-start justify-between gap-2 px-3 pb-2 pt-[max(0.5rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onStop}
          className="shrink-0 rounded-xl border border-white/30 bg-black/55 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm touch-manipulation active:bg-black/75"
        >
          {stopLabel}
        </button>
        {barcodePreview ? (
          <div className="min-w-0 max-w-[55%] rounded-xl border border-emerald-400/50 bg-black/55 px-3 py-2 font-mono text-sm tabular-nums text-emerald-300 backdrop-blur-sm">
            {barcodePreview}
          </div>
        ) : null}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-[820] flex flex-wrap items-center justify-center gap-2 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {torchAvailable ? (
          <button
            type="button"
            onClick={onTorchToggle}
            className="rounded-xl border border-white/30 bg-black/55 px-4 py-2.5 text-sm font-bold text-white backdrop-blur-sm touch-manipulation active:bg-black/75"
          >
            {torchOn ? torchOffLabel : torchOnLabel}
          </button>
        ) : null}
        {onPhotoScan ? (
          <button
            type="button"
            onClick={onPhotoScan}
            className="rounded-xl border border-emerald-400/60 bg-emerald-950/70 px-4 py-2.5 text-sm font-bold text-emerald-100 backdrop-blur-sm touch-manipulation active:bg-emerald-950"
          >
            {photoScanLabel}
          </button>
        ) : null}
      </div>
    </>,
    document.body,
  )
}
