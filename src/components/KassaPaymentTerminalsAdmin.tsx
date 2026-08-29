'use client'

import { useCallback, useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-headers'
import { useLanguage } from '@/i18n'
import type { KassaPaymentTerminalPublic, KassaTerminalProvider } from '@/lib/kassa-payment-terminal'

type ProvidersReady = { stripe: boolean; sumup: boolean; mollie: boolean }

export function KassaPaymentTerminalsAdmin({ tenantSlug }: { tenantSlug: string }) {
  const { t } = useLanguage()
  const [terminals, setTerminals] = useState<KassaPaymentTerminalPublic[]>([])
  const [providers, setProviders] = useState<ProvidersReady>({
    stripe: false,
    sumup: false,
    mollie: false,
  })
  const [tableReady, setTableReady] = useState(true)
  const [sumupKey, setSumupKey] = useState('')
  const [sumupMerchant, setSumupMerchant] = useState('')
  const [mollieKey, setMollieKey] = useState('')
  const [savingKeys, setSavingKeys] = useState(false)
  const [keysSaved, setKeysSaved] = useState(false)
  const [provider, setProvider] = useState<KassaTerminalProvider>('stripe')
  const [label, setLabel] = useState('')
  const [regCode, setRegCode] = useState('')
  const [remoteId, setRemoteId] = useState('')
  const [remote, setRemote] = useState<{ id: string; label: string }[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  const load = useCallback(async () => {
    const res = await authFetch(
      `/api/kassa/payment-terminal?tenant_slug=${encodeURIComponent(tenantSlug)}`,
    )
    const json = (await res.json()) as {
      ok?: boolean
      terminals?: KassaPaymentTerminalPublic[]
      providers?: ProvidersReady
      table_ready?: boolean
    }
    if (!res.ok || !json.ok) return
    setTerminals(json.terminals ?? [])
    if (json.providers) setProviders(json.providers)
    setTableReady(json.table_ready !== false)
  }, [tenantSlug])

  useEffect(() => {
    void load()
  }, [load])

  const saveKeys = async () => {
    setSavingKeys(true)
    setErr('')
    const res = await authFetch('/api/kassa/payment-terminal/keys', {
      method: 'POST',
      body: JSON.stringify({
        tenant_slug: tenantSlug,
        sumup_api_key: sumupKey || undefined,
        sumup_merchant_code: sumupMerchant || undefined,
        mollie_api_key: mollieKey || undefined,
      }),
    })
    setSavingKeys(false)
    if (!res.ok) {
      setErr(t('adminPages.betaling.terminalsSaveFailed'))
      return
    }
    setSumupKey('')
    setMollieKey('')
    setKeysSaved(true)
    setTimeout(() => setKeysSaved(false), 2000)
    void load()
  }

  const loadRemote = async () => {
    setBusy(true)
    setErr('')
    const res = await authFetch('/api/kassa/payment-terminal', {
      method: 'POST',
      body: JSON.stringify({
        tenant_slug: tenantSlug,
        action: 'list_remote',
        provider,
      }),
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

      {!tableReady && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('adminPages.betaling.terminalsTableMissing')}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SumUp API key</label>
          <input
            type="password"
            value={sumupKey}
            onChange={(e) => setSumupKey(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono"
            placeholder={providers.sumup ? '••••' : ''}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SumUp merchant code</label>
          <input
            type="text"
            value={sumupMerchant}
            onChange={(e) => setSumupMerchant(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">Mollie API key</label>
          <input
            type="password"
            value={mollieKey}
            onChange={(e) => setMollieKey(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono"
            placeholder={providers.mollie ? '••••' : 'live_…'}
          />
        </div>
      </div>
      <p className="text-xs text-gray-400 mb-4">{t('adminPages.betaling.terminalsStripeHint')}</p>
      <button
        type="button"
        onClick={() => void saveKeys()}
        disabled={savingKeys}
        className={`mb-8 w-full sm:w-auto px-5 py-3 rounded-xl font-semibold text-white ${
          keysSaved ? 'bg-green-500' : 'bg-black hover:bg-neutral-900'
        }`}
      >
        {keysSaved ? t('adminPages.common.saved') : t('adminPages.betaling.terminalsSaveKeys')}
      </button>

      <div className="border-t border-gray-100 pt-6 space-y-3">
        <p className="text-sm font-medium text-gray-800">{t('adminPages.betaling.terminalsAdd')}</p>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value as KassaTerminalProvider)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm"
        >
          <option value="stripe">Stripe Terminal</option>
          <option value="sumup">SumUp</option>
          <option value="mollie">Mollie</option>
        </select>
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
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-mono"
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
                {r.label} ({r.id})
              </option>
            ))}
          </select>
        )}
      </div>

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
