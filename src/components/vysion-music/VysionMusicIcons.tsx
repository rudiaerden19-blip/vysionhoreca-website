import type { SVGProps } from 'react'

type VmIconProps = SVGProps<SVGSVGElement> & {
  strokeWidth?: number
}

const defaults = {
  xmlns: 'http://www.w3.org/2000/svg',
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

export function VmSettings({ strokeWidth = 2.35, className, ...rest }: VmIconProps) {
  return (
    <svg {...defaults} strokeWidth={strokeWidth} className={className} {...rest}>
      <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

export function VmSkipBack({ strokeWidth = 2.35, className, ...rest }: VmIconProps) {
  return (
    <svg {...defaults} strokeWidth={strokeWidth} className={className} {...rest}>
      <path d="M17.971 4.285A2 2 0 0 1 21 6v12a2 2 0 0 1-3.029 1.715l-9.997-5.998a2 2 0 0 1-.003-3.432z" />
      <path d="M3 20V4" />
    </svg>
  )
}

export function VmSkipForward({ strokeWidth = 2.35, className, ...rest }: VmIconProps) {
  return (
    <svg {...defaults} strokeWidth={strokeWidth} className={className} {...rest}>
      <path d="M21 4v16" />
      <path d="M6.029 4.285A2 2 0 0 0 3 6v12a2 2 0 0 0 3.029 1.715l9.997-5.998a2 2 0 0 0 .003-3.432z" />
    </svg>
  )
}

export function VmPause({ strokeWidth = 2.35, className, ...rest }: VmIconProps) {
  return (
    <svg {...defaults} strokeWidth={strokeWidth} className={className} {...rest}>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  )
}

export function VmPlay({ filled, strokeWidth = 2.35, className, ...rest }: VmIconProps & { filled?: boolean }) {
  if (filled) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className} {...rest}>
        <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
      </svg>
    )
  }
  return (
    <svg {...defaults} strokeWidth={strokeWidth} className={className} {...rest}>
      <path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z" />
    </svg>
  )
}

export function VmStop({ strokeWidth = 2.35, className, ...rest }: VmIconProps) {
  return (
    <svg {...defaults} strokeWidth={strokeWidth} className={className} {...rest}>
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  )
}

export function VmEllipsisVertical({ strokeWidth = 2.35, className, ...rest }: VmIconProps) {
  return (
    <svg {...defaults} strokeWidth={strokeWidth} className={className} {...rest}>
      <circle cx="12" cy="5" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" />
    </svg>
  )
}
