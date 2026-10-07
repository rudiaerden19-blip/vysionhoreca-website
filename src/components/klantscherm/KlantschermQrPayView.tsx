'use client'

import { useLayoutEffect, useState } from 'react'
import QRCode from '@/components/QRCode'
import { KLANTSCHERM_NL } from '@/lib/klantscherm-nl-copy'
import { KlantschermDisplayShell } from '@/components/klantscherm/KlantschermDisplayShell'

type Props = {
  amount: number
  qrPayload: string
  iban?: string
  beneficiaryName?: string
  status: 'loading' | 'ready' | 'failed'
  failureMessage?: string
}

export function KlantschermQrPayView({
  amount,
  qrPayload,
  beneficiaryName,
  status,
  failureMessage,
}: Props) {
  const [qrSize, setQrSize] = useState(300)
  useLayoutEffect(() => {
    setQrSize(Math.min(340, Math.max(240, Math.round(window.innerWidth * 0.28))))
  }, [])

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(n)

  if (status === 'failed') {
    return (
      <KlantschermDisplayShell className="items-center justify-center px-6 text-center">
        <p className="max-w-xl text-[clamp(1.5rem,4.5vw,2.5rem)] font-bold leading-snug text-red-300">
          {failureMessage || KLANTSCHERM_NL.qrPaymentFailed}
        </p>
      </KlantschermDisplayShell>
    )
  }

  if (status === 'loading' || !qrPayload) {
    return (
      <KlantschermDisplayShell className="items-center justify-center px-6 text-center">
        <p className="text-xl font-semibold text-white/85 sm:text-2xl">QR laden…</p>
      </KlantschermDisplayShell>
    )
  }

  return (
    <KlantschermDisplayShell className="items-center justify-center px-4 py-8 text-center">
      <div className="flex max-w-lg flex-col items-center">
        <div
          className="shrink-0 rounded-[1.35rem] bg-white p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] ring-2 ring-white/30"
          style={{ width: qrSize + 32 }}
        >
          <QRCode url={qrPayload} size={qrSize} bankScan className="mx-auto" />
        </div>
        <p className="mt-10 text-[clamp(2rem,5.5vw,3.25rem)] font-black tabular-nums tracking-tight text-white">
          {formatMoney(amount)}
        </p>
        {beneficiaryName ? (
          <p className="mt-4 text-[clamp(1.25rem,3vw,1.85rem)] font-semibold text-white/95">
            {beneficiaryName}
          </p>
        ) : null}
      </div>
    </KlantschermDisplayShell>
  )
}
