'use client'

import { useMemo } from 'react'
import { buildEan13BarcodeSvg } from '@/lib/retail-loyalty/ean13-barcode-svg'

export function RetailLoyaltyPassBarcode({
  cardCode,
  className = '',
  large = false,
  showCodeText = true,
}: {
  cardCode: string
  className?: string
  large?: boolean
  /** Winkelpas op telefoon: alleen strepen, geen cijfers onder de barcode. */
  showCodeText?: boolean
}) {
  const svg = useMemo(
    () =>
      buildEan13BarcodeSvg(cardCode, {
        moduleWidth: large ? 3 : 2,
        barHeight: large ? 112 : 80,
        showCodeText,
      }),
    [cardCode, large, showCodeText],
  )
  if (!svg) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {cardCode}
      </p>
    )
  }
  return (
    <div
      className={`inline-block max-w-full overflow-x-auto rounded-lg bg-white p-3 shadow-inner ${className}`}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
