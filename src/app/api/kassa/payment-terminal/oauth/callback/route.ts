import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabaseClient } from '@/lib/supabase-server'
import { VYSION_CANONICAL_ORIGIN } from '@/lib/vysion-site'
import { exchangeTerminalOauthCode, verifyTerminalOauthState } from '@/lib/kassa-payment-terminal-oauth'

export const dynamic = 'force-dynamic'

function backToBetaling(tenant: string, pin: 'ok' | 'err', reason?: string) {
  const origin = (process.env.NEXT_PUBLIC_SITE_URL || VYSION_CANONICAL_ORIGIN).replace(/\/$/, '')
  const u = new URL(`${origin}/shop/${encodeURIComponent(tenant)}/admin/betaling`)
  u.searchParams.set('pin', pin)
  if (reason) u.searchParams.set('pin_err', reason.slice(0, 80))
  return NextResponse.redirect(u.toString())
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code')?.trim() || ''
  const stateRaw = request.nextUrl.searchParams.get('state')?.trim() || ''
  const oauthError = request.nextUrl.searchParams.get('error')?.trim()
  const state = verifyTerminalOauthState(stateRaw)
  if (!state) {
    const origin = (process.env.NEXT_PUBLIC_SITE_URL || VYSION_CANONICAL_ORIGIN).replace(/\/$/, '')
    return NextResponse.redirect(`${origin}/login`)
  }
  if (oauthError || !code) {
    return backToBetaling(state.tenant, 'err', oauthError || 'cancelled')
  }

  const exchanged = await exchangeTerminalOauthCode(state.provider, code)
  if (!exchanged.ok) {
    return backToBetaling(state.tenant, 'err', exchanged.error)
  }

  const supabase = getServerSupabaseClient()
  if (!supabase) {
    return backToBetaling(state.tenant, 'err', 'server_config')
  }

  const patch: Record<string, string | null> = {}
  if (state.provider === 'stripe') {
    patch.stripe_terminal_access_token = exchanged.accessToken
  } else if (state.provider === 'sumup') {
    patch.sumup_api_key = exchanged.accessToken
    if (exchanged.merchantCode) patch.sumup_merchant_code = exchanged.merchantCode
    if (exchanged.refreshToken) patch.sumup_oauth_refresh_token = exchanged.refreshToken
  } else {
    patch.mollie_api_key = exchanged.accessToken
    if (exchanged.refreshToken) patch.mollie_oauth_refresh_token = exchanged.refreshToken
  }

  let { error } = await supabase.from('tenant_settings').update(patch).eq('tenant_slug', state.tenant)
  if (error && /42703|does not exist|schema cache/i.test(error.message || '')) {
    const fallback: Record<string, string | null> = {}
    if (state.provider === 'stripe') fallback.stripe_secret_key = exchanged.accessToken
    else if (state.provider === 'sumup') {
      fallback.sumup_api_key = exchanged.accessToken
      if (exchanged.merchantCode) fallback.sumup_merchant_code = exchanged.merchantCode
    } else fallback.mollie_api_key = exchanged.accessToken
    const retry = await supabase.from('tenant_settings').update(fallback).eq('tenant_slug', state.tenant)
    error = retry.error
  }
  if (error) {
    console.error('[terminal-oauth] save', error)
    return backToBetaling(state.tenant, 'err', 'save_failed')
  }

  return backToBetaling(state.tenant, 'ok')
}
