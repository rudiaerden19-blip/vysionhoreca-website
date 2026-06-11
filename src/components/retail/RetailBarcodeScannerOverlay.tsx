'use client'

type Props = {
  hint: string
}

function CornerBracket({ className }: { className: string }) {
  return (
    <span
      className={`absolute h-6 w-6 border-[3px] border-emerald-400 ${className}`}
      aria-hidden
    />
  )
}

/** Viewfinder over live camera — kader, scanlijn en middenpunt (EAN). */
export function RetailBarcodeScannerOverlay({ hint }: Props) {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center"
      aria-hidden
    >
      <div className="relative w-[min(94%,20rem)] max-w-full aspect-[2.35/1]">
        <div
          className="absolute inset-0 rounded-md shadow-[0_0_0_9999px_rgba(0,0,0,0.52)]"
          aria-hidden
        />
        <CornerBracket className="left-0 top-0 rounded-tl-sm border-r-0 border-b-0" />
        <CornerBracket className="right-0 top-0 rounded-tr-sm border-b-0 border-l-0" />
        <CornerBracket className="bottom-0 left-0 rounded-bl-sm border-r-0 border-t-0" />
        <CornerBracket className="bottom-0 right-0 rounded-br-sm border-l-0 border-t-0" />

        <div className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-white/25" aria-hidden />

        <div className="animate-retail-barcode-scan-line absolute inset-x-2 top-[10%] h-[3px] rounded-full bg-red-500 shadow-[0_0_10px_2px_rgba(239,68,68,0.85)]" />

        <div className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.9)] ring-2 ring-white/40" />
      </div>

      <p className="mt-4 max-w-[18rem] px-3 text-center text-xs font-semibold leading-snug text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] sm:text-sm">
        {hint}
      </p>
    </div>
  )
}
