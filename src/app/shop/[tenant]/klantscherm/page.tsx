import { Suspense } from 'react'
import { KlantschermClient } from './KlantschermClient'

export default function KlantschermPage({ params }: { params: { tenant: string } }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[100dvh] items-center justify-center bg-black">
          <span className="h-10 w-10 animate-pulse rounded-full bg-white/25" aria-hidden />
        </div>
      }
    >
      <KlantschermClient tenant={params.tenant} />
    </Suspense>
  )
}
