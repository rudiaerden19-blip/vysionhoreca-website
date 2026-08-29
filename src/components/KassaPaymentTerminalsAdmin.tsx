'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { authFetch } from '@/lib/auth-headers'
import { useLanguage } from '@/i18n'
import type { KassaPaymentTerminalPublic, KassaTerminalProvider } from '@/lib/kassa-payment-terminal'

type ReadyMap = { stripe: boolean; sumup: boolean; mollie: boolean }

const BRANDS: { id: KassaTerminalProvider; name: string }[] = [
  { id: 'stripe', name: 'Stripe' },
  { id: 'sumup', name: 'SumUp' },
  { id: 'mollie', name: 'Mollie' },
]

export function KassaPaymentTerminalsAdmin({ tenantSlug }: { tenantSlug: string }) {
  const { t } = useLanguage()
  const search = useSearchParams()
  const [terminals, setTerminals] = useState<KassaPaymentTerminalPublic[]>([])
  const [providers, setProviders] = useState<ReadyMap>({ stripe: false, sumup: false, mollie: false })
  const [connect, setConnect] = useState<ReadyMap>({ stripe: false, sumup: false, mollie: false })
  const [tableReady, setTableReady] = useState(true)
  const [provider, setProvider] = useState<KassaTerminalProvider>('stripe')
  const [label, setLabel] = useState('')
  const [regCode, setRegCode] = useState('')
  const [remoteId, setRemoteId] = useState('')
  const [remote, setRemote] = useState<{ id: string; label: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const pinFlash = search.get('pin')
  const pinErr = search.get('pin_err')

  const load = useCallback(async () => {
    const res = await authFetch(
      `/api/kassa/payment-terminal?tenant_slug=${encodeURIComponent(tenantSlug)}`,
    )
    const json = (await res.json()) as {
      ok?: boolean
      terminals?: KassaPaymentTerminalPublic[]
      providers?: ReadyMap
      connect?: ReadyMap
      table_ready?: boolean
    }
    if (!res.ok || !json.ok) return
    setTerminals(json.terminals ?? [])
    if (json.providers) setProviders(json.providers)
    if (json.connect) setConnect(json.connect)
    setTableReady(json.table_ready !== false)
  }, [tenantSlug])

  useEffect(() => {
    void load()
  }, [load])

  const connectedProviders = useMemo(
    () => BRANDS.filter((b) => providers[b.id]).map((b) => b.id),
    [providers],
  )

  useEffect(() => {
    if (connectedProviders.length === 1) setProvider(connectedProviders[0])
  }, [connectedProviders])

  const startOauth = async (p: KassaTerminalProvider) => {
    setBusy(true)
    setErr('')
    const res = await authFetch(
      `/api/kassa/payment-terminal/oauth/start?tenant_slug=${encodeURIComponent(tenantSlug)}&provider=${p}`,
    )
    const json = (await res.json()) as { ok?: boolean; url?: string; error?: string }
    setBusy(false)
    if (!res.ok || !json.ok || !json.url) {
      setErr(
        json.error === 'oauth_app_missing'
          ? t('adminPages.betaling.terminalsOauthMissing')
          : t('adminPages.betaling.terminalsSaveFailed'),
      )
      return
    }
    window.location.assign(json.url)
  }

  const disconnect = async (p: KassaTerminalProvider) => {
    setBusy(true)
    setErr('')
    const res = await authFetch('/api/kassa/payment-terminal', {
      method: 'POST',
      body: JSON.stringify({ tenant_slug: tenantSlug, provider: p, action: 'disconnect' }),
    })
    setBusy(false)
    if (!res.ok) {
      setErr(t('adminPages.betaling.terminalsSaveFailed'))
      return
    }
    void load()
  }

  const loadRemote = async () => {
    setBusy(true)
    setErr('')
    const res = await authFetch('/api/kassa/payment-terminal', {
      method: 'POST',
      body: JSON.stringify({ tenant_slug: tenantSlug, action: 'list_remote', provider }),
    })
    const json = (await res.json()) as { ok?: boolean; readers?: { id: string; label: string }[]; error?: string }
    setBusy(false)
    if (!res.ok || !json.ok) {
      setErr(json.error || t('adminPages.betaling.terminalsSaveFailed'))
      return
    }
    setRemote(json.readers ?? [])
  }

  const pair = async () => {
    setBusy(true)
    setErr('')
    const res = await authFetch('/api/kassa/payment-terminal', {
      method: 'POST',
      body: JSON.stringify({
        tenant_slug: tenantSlug,
        provider,
        label,
        registration_code: regCode,
        external_id: remoteId,
        action: remoteId ? 'attach' : undefined,
      }),
    })
    const json = (await res.json()) as { ok?: boolean; error?: string }
    setBusy(false)
    if (!res.ok || !json.ok) {
      setErr(json.error || t('adminPages.betaling.terminalsSaveFailed'))
      return
    }
    setRegCode('')
    setRemoteId('')
    setLabel('')
    void load()
  }

  const remove = async (id: string) => {
    const res = await authFetch(
      `/api/kassa/payment-terminal?tenant_slug=${encodeURIComponent(tenantSlug)}&id=${encodeURIComponent(id)}`,
      { method: 'DELETE' },
    )
    if (res.ok) void load()
  }

  return (
    <div className="mt-6 bg-white rounded-2xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('adminPages.betaling.terminalsTitle')}</h2>
      <p className="text-sm text-gray-500 mb-6">{t('adminPages.betaling.terminalsIntro')}</p>

      {pinFlash === 'ok' && (
        <p className="mb-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
          {t('adminPages.betaling.terminalsOauthOk')}
        </p>
      )}
      {pinFlash === 'err' && (
        <p className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {t('adminPages.betaling.terminalsOauthFail')}
          {pinErr ? ` (${pinErr})` : ''}
        </p>
      )}

      {!tableReady && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('adminPages.betaling.terminalsTableMissing')}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-3 mb-8">
        {BRANDS.map((b) => {
          const linked = providers[b.id]
          const canOauth = connect[b.id] || (b.id === 'stripe' && linked)
          return (
            <div key={b.id} className="rounded-2xl border border-gray-100 p-4 flex flex-col gap-3">
              <p className="font-semibold text-gray-900">{b.name}</p>
              <p className={`text-xs font-medium ${linked ? 'text-green-700' : 'text-gray-400'}`}>
                {linked
                  ? t('adminPages.betaling.terminalsLinked')
                  : t('adminPages.betaling.terminalsNotLinked')}
              </p>
              {linked ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void disconnect(b.id)}
                  className="mt-auto rounded-xl bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700"
                >
                  {t('adminPages.betaling.terminalsUnlinkAccount')}
                </button>
              ) : (
                <button
                  type="button"
                  disabled={busy || !canOauth}
                  onClick={() => void startOauth(b.id)}
                  className="mt-auto rounded-xl bg-black px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {t('adminPages.betaling.terminalsConnect').replace('{brand}', b.name)}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {connectedProviders.length > 0 && (
        <div className="border-t border-gray-100 pt-6 space-y-3">
          <p className="text-sm font-medium text-gray-800">{t('adminPages.betaling.terminalsAdd')}</p>
          {connectedProviders.length > 1 && (
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value as KassaTerminalProvider)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
            >
              {connectedProviders.map((id) => (
                <option key={id} value={id}>
                  {BRANDS.find((b) => b.id === id)?.name}
                </option>
              ))}
            </select>
          )}
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('adminPages.betaling.terminalsLabelPh')}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
          />
          {provider === 'stripe' && (
            <input
              value={regCode}
              onChange={(e) => setRegCode(e.target.value)}
              placeholder={t('adminPages.betaling.terminalsPairCodePh')}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
            />
          )}
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => void loadRemote()}
              className="px-4 py-2 rounded-xl bg-gray-100 text-sm font-medium"
            >
              {t('adminPages.betaling.terminalsListRemote')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void pair()}
              className="px-4 py-2 rounded-xl bg-[#3C4D6B] text-white text-sm font-semibold"
            >
              {t('adminPages.betaling.terminalsPair')}
            </button>
          </div>
          {remote.length > 0 && (
            <select
              value={remoteId}
              onChange={(e) => setRemoteId(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
            >
              <option value="">{t('adminPages.betaling.terminalsPickRemote')}</option>
              {remote.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.label}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {err && <p className="mt-4 text-sm text-red-600">{err}</p>}

      <ul className="mt-8 space-y-2">
        {terminals.length === 0 ? (
          <li className="text-sm text-gray-400">{t('adminPages.betaling.terminalsEmpty')}</li>
        ) : (
          terminals.map((term) => (
            <li
              key={term.id}
              className="flex items-center justify-between rounded-xl border border-gray-100 px-4 py-3"
            >
              <div>
                <p className="font-medium text-gray-900">{term.label}</p>
                <p className="text-xs uppercase text-gray-400">{term.provider}</p>
              </div>
              <button
                type="button"
                onClick={() => void remove(term.id)}
                className="text-sm text-red-600 hover:underline"
              >
                {t('adminPages.betaling.terminalsRemove')}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  )
}
