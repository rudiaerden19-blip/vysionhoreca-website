'use client'

import QRCode from '@/components/QRCode'
import { KLANTSCHERM_NL } from '@/lib/klantscherm-nl-copy'

type Props = {
  amount: number
  qrCheckoutUrl: string
  status: 'pending' | 'paid' | 'failed'
}

export function KlantschermQrPayView({ amount, qrCheckoutUrl, status }: Props) {
  const formatMoney = (n: number) =>
    new Intl.NumberFormat('nl-BE', { style: 'currency', currency: 'EUR' }).format(n)

  if (status === 'paid') {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-black px-6 py-10 text-center">
        <p className="text-[clamp(2rem,6vw,3.5rem)] font-black text-emerald-400">
          {KLANTSCHERM_NL.qrPaymentSuccess}
        </p>
        <p className="mt-4 text-2xl font-bold tabular-nums text-white sm:text-3xl">
          {formatMoney(amount)}
        </p>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-black px-6 py-10 text-center">
        <p className="max-w-xl text-[clamp(1.5rem,4.5vw,2.5rem)] font-bold leading-snug text-red-400">
          {KLANTSCHERM_NL.qrPaymentFailed}
        </p>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-black px-4 py-8 text-center">
      <div className="mt-2 scale-[min(1,calc(72vw/420))] origin-center sm:scale-100">
        <QRCode url={qrCheckoutUrl} size={420} className="mx-auto shadow-2xl ring-4 ring-white/10" />
      </div>
      <p className="mt-8 text-[clamp(1.75rem,4vw,2.75rem)] font-black tabular-nums text-white">
        {formatMoney(amount)}
      </p>
      <p className="mt-6 max-w-2xl text-[clamp(1.1rem,2.8vw,1.65rem)] font-semibold leading-snug text-white/90">
        {KLANTSCHERM_NL.qrHint}
      </p>
    </div>
  )
}
