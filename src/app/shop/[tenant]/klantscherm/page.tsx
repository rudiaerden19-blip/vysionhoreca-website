import { Suspense } from 'react'
import { KlantschermClient } from './KlantschermClient'

export default function KlantschermPage({ params }: { params: { tenant: string } }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] w-full items-center justify-center bg-black">
          <span className="h-12 w-12 animate-pulse rounded-full bg-white/25 sm:h-14 sm:w-14" aria-hidden />
        </div>
      }
    >
      <KlantschermClient tenant={params.tenant} />
    </Suspense>
  )
}
