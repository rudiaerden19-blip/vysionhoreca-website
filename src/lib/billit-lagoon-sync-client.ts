'use client'

import { authFetch } from '@/lib/auth-headers'
import { isBillitLagoonPilotTenant } from '@/lib/billit-lagoon-pilot'

/** Na Z-sluiting: Billit sync op achtergrond (blokkeert kassa/Z-UI niet). */
export function fireBillitLagoonZDaySync(tenantSlug: string, reportDate: string): void {
  if (!isBillitLagoonPilotTenant(tenantSlug)) return
  void authFetch('/api/integrations/billit/sync-z-day', {
    method: 'POST',
    body: JSON.stringify({ tenantSlug: tenantSlug.trim(), reportDate }),
  }).catch(() => {
    /* sync-fout staat in billit_sync_log + eventueel later opnieuw proberen */
  })
}
