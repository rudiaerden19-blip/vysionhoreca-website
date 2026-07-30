import { createServerSupabaseClient } from '@/lib/supabase-server'
import { auditAllTenantsZReports } from '@/lib/z-report-audit'

const LIVE = process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.NEXT_PUBLIC_SUPABASE_URL

describe('z-report-audit live (productie DB)', () => {
  if (!LIVE) {
    it.skip('SUPABASE_SERVICE_ROLE_KEY niet gezet — skip live audit', () => {})
    return
  }

  it('audit mei/juni 2026 alle tenants — output JSON', async () => {
    const client = createServerSupabaseClient()
    const report = await auditAllTenantsZReports(client, ['2026-05', '2026-06'])
    // eslint-disable-next-line no-console
    console.log('\n=== Z-RAPPORT AUDIT ===\n', JSON.stringify(report, null, 2))
    expect(report.tenantCount).toBeGreaterThan(0)
  }, 600000)
})
