'use client'

/** Aan/uit-schuif voor module-instellingen (admin + superadmin). */
export function ModuleToggleSlider({
  checked,
  disabled,
  onChange,
  ariaLabel,
}: {
  checked: boolean
  disabled?: boolean
  onChange: (next: boolean) => void
  ariaLabel?: string
}) {
  const off = disabled === true
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      aria-disabled={off}
      tabIndex={off ? -1 : 0}
      onClick={() => {
        if (off) return
        onChange(!checked)
      }}
      onKeyDown={(e) => {
        if (off) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onChange(!checked)
        }
      }}
      className={[
        'relative h-8 w-14 shrink-0 rounded-full transition-colors',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#58CCFF] focus-visible:ring-offset-2',
        checked ? 'bg-emerald-500' : 'bg-gray-300',
        off ? 'cursor-default opacity-60' : 'cursor-pointer',
      ].join(' ')}
    >
      <span
        aria-hidden
        className={[
          'pointer-events-none absolute left-1 top-1 block h-6 w-6 rounded-full bg-white shadow-md',
          'transition-transform duration-200 ease-out',
          checked ? 'translate-x-6' : 'translate-x-0',
        ].join(' ')}
      />
    </button>
  )
}
