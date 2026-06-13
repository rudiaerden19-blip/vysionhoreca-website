'use client'

import React from 'react'

type Props = {
  withHardware: boolean
  onChange: (withHardware: boolean) => void
  labelWithout: string
  labelWith: string
  className?: string
}

export function PricingHardwareToggle({
  withHardware,
  onChange,
  labelWithout,
  labelWith,
  className = '',
}: Props) {
  return (
    <div
      className={`bg-white border border-gray-200 p-1 rounded-full inline-flex items-center shadow-home-float max-w-full flex-wrap justify-center ${className}`}
      role="group"
      aria-label={`${labelWithout} / ${labelWith}`}
    >
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold transition-all ${
          !withHardware ? 'bg-accent text-white shadow-home-float': 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {labelWithout}
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`px-5 sm:px-6 py-2.5 sm:py-3 rounded-full text-sm sm:text-base font-semibold transition-all ${
          withHardware ? 'bg-accent text-white shadow-home-float': 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {labelWith}
      </button>
    </div>
  )
}
