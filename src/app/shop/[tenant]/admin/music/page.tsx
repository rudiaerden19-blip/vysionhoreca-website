'use client'

import { useEffect, useState } from 'react'
import { VysionMusicClient } from '@/components/vysion-music/VysionMusicClient'
import { getTenantSettings } from '@/lib/admin-api'

export default function VysionMusicPage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const kassaHref = `/shop/${tenant}/admin/kassa`
  const [businessName, setBusinessName] = useState(tenant)

  useEffect(() => {
    void getTenantSettings(tenant).then((s) => {
      const bn = s?.business_name?.trim()
      if (bn) setBusinessName(bn)
    })
  }, [tenant])

  return <VysionMusicClient tenant={tenant} businessName={businessName} kassaHref={kassaHref} />
}
