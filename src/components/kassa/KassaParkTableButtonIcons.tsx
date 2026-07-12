/** Printer-icoon voor «Voeg toe aan tafel» + bon (keuken/kassa). */
export function KassaPrinterPrintIcon({ className = 'h-4 w-4 shrink-0' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9V3h12v6" />
      <rect x="6" y="13" width="12" height="8" rx="1" />
      <path d="M6 17H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
    </svg>
  )
}

/** Printer met streep = naar tafel zonder keukenbon (logica ongewijzigd: kassabon). */
export function KassaPrinterNoKitchenIcon({ className = 'h-4 w-4 shrink-0' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 9V3h12v6" />
      <rect x="6" y="13" width="12" height="8" rx="1" />
      <path d="M6 17H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <path d="M3 3l18 18" />
    </svg>
  )
}
