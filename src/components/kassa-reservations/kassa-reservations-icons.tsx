type ChevronProps = {
  className?: string
  size?: number
}

export function KassaResChevronLeft({ className, size = 22 }: ChevronProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export function KassaResChevronRight({ className, size = 22 }: ChevronProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

/** Sleep-handvat op reservatiebalk (tijdlijn). */
export function KassaResGripVertical({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 10 16"
      fill="currentColor"
      className={className}
      aria-hidden
    >
      <circle cx="3" cy="3" r="1.35" />
      <circle cx="7" cy="3" r="1.35" />
      <circle cx="3" cy="8" r="1.35" />
      <circle cx="7" cy="8" r="1.35" />
      <circle cx="3" cy="13" r="1.35" />
      <circle cx="7" cy="13" r="1.35" />
    </svg>
  )
}

export function KassaResCloseIcon({ className, size = 22 }: ChevronProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M18 6L6 18M6 6l12 12"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
      />
    </svg>
  )
}

/** Altijd zichtbaar sluit-kruis (fallback waar Lucide/SVG faalt in WebView). */
export function KassaResCloseButtonLabel({ className }: { className?: string }) {
  return (
    <span
      className={`select-none text-[1.35rem] font-semibold leading-none text-gray-900 ${className ?? ''}`}
      aria-hidden
    >
      ✕
    </span>
  )
}
