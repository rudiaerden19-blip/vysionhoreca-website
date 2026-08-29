import { NextRequest, NextResponse } from 'next/server'
import { authorizeKassaTerminalTenant } from '@/lib/kassa-payment-terminal-server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  let body: {
    tenant_slug?: string
    sumup_api_key?: string
    sumup_merchant_code?: string
    mollie_api_key?: string
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const auth = await authorizeKassaTerminalTenant(request, body.tenant_slug || '')
  if (!auth.ok) return auth.response

  const patch: Record<string, string | null> = {}
  if (typeof body.sumup_api_key === 'string') {
    patch.sumup_api_key = body.sumup_api_key.trim() || null
  }
  if (typeof body.sumup_merchant_code === 'string') {
    patch.sumup_merchant_code = body.sumup_merchant_code.trim() || null
  }
  if (typeof body.mollie_api_key === 'string') {
    patch.mollie_api_key = body.mollie_api_key.trim() || null
  }
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const { error } = await auth.supabase
    .from('tenant_settings')
    .update(patch)
    .eq('tenant_slug', auth.tenantSlug)

  if (error) {
    console.error('[kassa/payment-terminal/keys]', error)
    return NextResponse.json({ ok: false, error: 'server' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
