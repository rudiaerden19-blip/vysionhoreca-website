'use client'

import { RetailKassaPosClient } from '@/components/retail-kassa/RetailKassaPosClient'

export default function RetailKassaPage({ params }: { params: { tenant: string } }) {
  return <RetailKassaPosClient tenant={params.tenant} />
}
