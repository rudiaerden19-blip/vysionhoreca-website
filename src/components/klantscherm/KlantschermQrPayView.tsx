'use client'

import QRCode from '@/components/QRCode'
import { KLANTSCHERM_NL } from '@/lib/klantscherm-nl-copy'

function formatIbanDisplay(iban: string): string {
  const n = iban.replace(/\s/g, '').toUpperCase()
  return n.replace(/(.{4})/g, '$1 ').trim()
}

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
  iban,
  beneficiaryName,
  status,
  failureMessage,
}: Props) {
  const formatMoney = (n: number) =>
    new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(n)

  if (status === 'failed') {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-black px-6 py-10 text-center">
        <p className="max-w-xl text-[clamp(1.5rem,4.5vw,2.5rem)] font-bold leading-snug text-red-400">
          {failureMessage || KLANTSCHERM_NL.qrPaymentFailed}
        </p>
      </div>
    )
  }

  if (status === 'loading' || !qrPayload) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-black px-6 py-10 text-center">
        <p className="text-xl font-semibold text-white/80 sm:text-2xl">QR laden…</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-black px-4 py-8 text-center">
      <div className="mt-2 scale-[min(1,calc(72vw/420))] origin-center sm:scale-100">
        <QRCode url={qrPayload} size={420} className="mx-auto shadow-2xl ring-4 ring-white/10" />
      </div>
      <p className="mt-8 text-[clamp(1.75rem,4vw,2.75rem)] font-black tabular-nums text-white">
        {formatMoney(amount)}
      </p>
      {beneficiaryName ? (
        <p className="mt-3 max-w-2xl text-lg font-semibold text-white/90 sm:text-xl">{beneficiaryName}</p>
      ) : null}
      {iban ? (
        <p className="mt-2 font-mono text-base tabular-nums text-white/75 sm:text-lg">
          {KLANTSCHERM_NL.qrAccountLabel}: {formatIbanDisplay(iban)}
        </p>
      ) : null}
      <p className="mt-6 max-w-2xl text-[clamp(1.1rem,2.8vw,1.65rem)] font-semibold leading-snug text-white/90">
        {KLANTSCHERM_NL.qrHint}
      </p>
      <p className="mt-4 max-w-2xl text-[clamp(1.05rem,2.5vw,1.45rem)] font-bold text-emerald-300/95">
        {KLANTSCHERM_NL.qrShowPhone}
      </p>
    </div>
  )
}
