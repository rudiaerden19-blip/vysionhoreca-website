import { NextRequest, NextResponse } from 'next/server'
import { authorizeKassaTerminalTenant } from '@/lib/kassa-payment-terminal-server'
import { isKassaTerminalProvider } from '@/lib/kassa-payment-terminal'
import {
  buildTerminalAuthorizeUrl,
  signTerminalOauthState,
  terminalOauthAppsReady,
} from '@/lib/kassa-payment-terminal-oauth'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const tenant_slug = request.nextUrl.searchParams.get('tenant_slug')?.trim() || ''
  const providerRaw = request.nextUrl.searchParams.get('provider')?.trim() || ''
  const auth = await authorizeKassaTerminalTenant(request, tenant_slug)
  if (!auth.ok) return auth.response
  if (!isKassaTerminalProvider(providerRaw)) {
    return NextResponse.json({ ok: false, error: 'bad_provider' }, { status: 400 })
  }
  if (!terminalOauthAppsReady()[providerRaw]) {
    return NextResponse.json({ ok: false, error: 'oauth_app_missing' }, { status: 503 })
  }
  const state = signTerminalOauthState(auth.tenantSlug, providerRaw)
  if (!state) {
    return NextResponse.json({ ok: false, error: 'oauth_state_secret_missing' }, { status: 503 })
  }
  const url = buildTerminalAuthorizeUrl(providerRaw, state)
  if (!url) {
    return NextResponse.json({ ok: false, error: 'oauth_app_missing' }, { status: 503 })
  }
  return NextResponse.json({ ok: true, url })
}
