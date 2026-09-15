'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'
import { adminDb } from '@/lib/admin-db-client'
import {
  mergeIntoTabLines,
  nameTabCustomerKey,
  summarizeOpenNameTabs,
  tabOpenTotalIncl,
  type KassaNameTabLine,
  type KassaNameTabRow,
} from '@/lib/kassa-name-account'
import { registerKassaNameTabPayment } from '@/lib/kassa-name-account-payment'
import { normalizeOnAccountCustomerName as normName } from '@/lib/kassa-on-account'
import type { KassaCartItem, KassaPaymentMethod } from '@/lib/kassa-cart-types'

type Props = {
  tenant: string
  cart: KassaCartItem[]
  cartTotalIncl: number
  staffId?: string | null
  onClose: () => void
  onCommitted: () => void
}

export default function KassaNameAccountModal({
  tenant,
  cart,
  cartTotalIncl,
  staffId,
  onClose,
  onCommitted,
}: Props) {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [tabs, setTabs] = useState<KassaNameTabRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmName, setConfirmName] = useState<string | null>(null)
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payMethod, setPayMethod] = useState<KassaPaymentMethod>('CASH')
  const nameInputRef = useRef<HTMLInputElement>(null)

  const focusNameInput = useCallback(() => {
    const el = nameInputRef.current
    if (!el) return
    el.focus({ preventScroll: false })
    try {
      el.setSelectionRange(el.value.length, el.value.length)
    } catch {
      /* ignore */
    }
  }, [])

  useEffect(() => {
    const id = window.setTimeout(() => focusNameInput(), 120)
    return () => window.clearTimeout(id)
  }, [focusNameInput])

  const loadTabs = useCallback(async () => {
    setLoading(true)
    const res = await adminDb.select<KassaNameTabRow[]>('kassa_name_tabs', {
      tenantSlug: tenant,
      match: { tenant_slug: tenant },
      limit: 200,
    })
    setLoading(false)
    if (!res.ok) {
      setError(t('kassaNameAccount.loadFailed'))
      setTabs([])
      return
    }
    setTabs(Array.isArray(res.data) ? res.data : [])
  }, [tenant, t])

  useEffect(() => {
    void loadTabs()
  }, [loadTabs])

  const openList = useMemo(() => summarizeOpenNameTabs(tabs), [tabs])

  const nameMatches = useMemo(() => {
    const q = nameTabCustomerKey(name)
    if (!q) return openList
    return openList.filter((x) => nameTabCustomerKey(x.name).includes(q))
  }, [name, openList])

  const selectedTab = useMemo(
    () => tabs.find((r) => r.id === selectedTabId) ?? null,
    [tabs, selectedTabId],
  )

  const selectedOpen = useMemo(() => {
    if (!selectedTab) return 0
    return tabOpenTotalIncl((selectedTab.items ?? []) as KassaNameTabLine[])
  }, [selectedTab])

  useEffect(() => {
    if (selectedTab && selectedOpen > 0) {
      setPayAmount(selectedOpen.toFixed(2))
    }
  }, [selectedTab, selectedOpen])

  const resolveTabForName = (personName: string) => {
    const key = nameTabCustomerKey(personName)
    return tabs.find((r) => r.customer_key === key || nameTabCustomerKey(r.customer_name) === key) ?? null
  }

  const pickExisting = (personName: string, tabId: string) => {
    setName(personName)
    setSelectedTabId(tabId)
    setError(null)
    if (cart.length > 0) {
      setConfirmName(personName)
    } else {
      setConfirmName(null)
    }
  }

  const commitToName = async (rawName: string) => {
    const displayName = normName(rawName)
    if (!displayName) {
      setError(t('kassaNameAccount.nameRequired'))
      return
    }
    if (cart.length === 0) {
      setError(t('kassaNameAccount.cartEmpty'))
      return
    }
    setSaving(true)
    setError(null)
    const key = nameTabCustomerKey(displayName)
    const existing = tabs.find((r) => r.customer_key === key)
    const prevItems = (existing?.items ?? []) as KassaNameTabLine[]
    const merged = mergeIntoTabLines(prevItems, cart)

    const payload = {
      tenant_slug: tenant,
      customer_name: displayName,
      customer_key: key,
      items: merged,
      updated_at: new Date().toISOString(),
    }

    const res = existing?.id
      ? await adminDb.update('kassa_name_tabs', payload, { id: existing.id, tenant_slug: tenant }, { tenantSlug: tenant })
      : await adminDb.insert('kassa_name_tabs', payload, { tenantSlug: tenant })

    setSaving(false)
    if (!res.ok) {
      setError(t('kassaNameAccount.saveFailed'))
      return
    }
    setConfirmName(null)
    onCommitted()
    onClose()
  }

  const registerPayment = async () => {
    const tab = selectedTab ?? resolveTabForName(name)
    if (!tab) {
      setError(t('kassaNameAccount.pickPayer'))
      return
    }
    const amount = parseFloat(payAmount.replace(',', '.'))
    setSaving(true)
    setError(null)
    const res = await registerKassaNameTabPayment({
      tenantSlug: tenant,
      tab,
      amountEur: amount,
      paymentMethod: payMethod,
      staffId,
    })
    setSaving(false)
    if (!res.ok) {
      if (res.error === 'amount_too_high') setError(t('kassaNameAccount.amountTooHigh'))
      else if (res.error === 'invalid_amount') setError(t('kassaNameAccount.invalidAmount'))
      else if (res.error === 'tab_already_settled') setError(t('kassaNameAccount.tabAlreadySettled'))
      else setError(res.error || t('kassaNameAccount.payFailed'))
      if (res.error === 'tab_already_settled') {
        setSelectedTabId(null)
        void loadTabs()
      }
      return
    }
    setSelectedTabId(null)
    setPayAmount('')
    await loadTabs()
    onCommitted()
    onClose()
  }

  const cartHasItems = cart.length > 0
  const showPayPanel = selectedTab != null && selectedOpen > 0.001
  const money = (n: number) => `€ ${n.toFixed(2).replace('.', ',')}`

  return (
    <div
      className="fixed inset-0 z-[250] flex items-end justify-center bg-black/50 p-4 sm:items-center"
      data-vysion-modal-overlay
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl [color-scheme:light]"
        data-vysion-light-form
        role="dialog"
        aria-labelledby="kassa-name-account-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 id="kassa-name-account-title" className="text-lg font-bold text-gray-900">
            {t('kassaNameAccount.modalTitle')}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {cartHasItems
              ? `${t('kassaNameAccount.modalHint')} (${money(cartTotalIncl)})`
              : t('kassaNameAccount.modalHintPay')}
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            {t('kassaOnAccount.name')}
            <input
              ref={nameInputRef}
              type="text"
              inputMode="text"
              enterKeyHint="done"
              autoComplete="name"
              autoCorrect="off"
              autoCapitalize="words"
              spellCheck={false}
              className="vysion-light-form-field mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 placeholder:text-gray-400"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setConfirmName(null)
                const row = resolveTabForName(e.target.value)
                setSelectedTabId(row?.id ?? null)
              }}
              onFocus={focusNameInput}
              onPointerDown={(e) => {
                e.stopPropagation()
                requestAnimationFrame(() => focusNameInput())
              }}
            />
          </label>

          <div>
            <p className="text-sm font-semibold text-gray-800">{t('kassaNameAccount.openListTitle')}</p>
            {loading ? (
              <p className="text-sm text-gray-500 mt-2">{t('kassaOnAccount.loading')}</p>
            ) : openList.length === 0 ? (
              <p className="text-sm text-gray-500 mt-2">{t('kassaOnAccount.quickListEmpty')}</p>
            ) : (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-gray-200 divide-y">
                {(name ? nameMatches : openList).map((item) => {
                  const active = item.id === selectedTabId
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`flex w-full items-center justify-between px-3 py-3 text-left ${
                          active ? 'bg-teal-50 ring-1 ring-inset ring-teal-200' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => pickExisting(item.name, item.id)}
                      >
                        <span className="font-medium text-gray-900">{item.name}</span>
                        <span className="tabular-nums font-semibold text-red-700">{money(item.remaining)}</span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {showPayPanel ? (
            <div className="rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-4 space-y-3">
              <p className="text-sm font-semibold text-teal-950">
                {t('kassaNameAccount.paySectionTitle').replace('{name}', selectedTab!.customer_name)}
                {' — '}
                <span className="tabular-nums">{money(selectedOpen)}</span>
              </p>
              <label className="block text-sm font-medium text-gray-800">
                {t('kassaNameAccount.payAmount')}
                <input
                  type="text"
                  inputMode="decimal"
                  className="vysion-light-form-field mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-900"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              </label>
              <div className="flex gap-2">
                {(['CASH', 'CARD'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPayMethod(m)}
                    className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${
                      payMethod === m ? 'bg-[#3C4D6B] text-white' : 'bg-white text-gray-800 border border-gray-200'
                    }`}
                  >
                    {m === 'CASH' ? t('kassaApp.payCash') : t('kassaApp.payCard')}
                  </button>
                ))}
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void registerPayment()}
                className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white disabled:opacity-50"
              >
                {t('kassaNameAccount.registerPayment')}
              </button>
            </div>
          ) : null}

          {confirmName && cartHasItems ? (
            <p className="rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-950">
              {t('kassaNameAccount.addToAccountConfirm').replace('{name}', confirmName)}
            </p>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        {cartHasItems ? (
          <div className="flex gap-2 border-t border-gray-100 px-5 py-4">
            <button
              type="button"
              className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-800"
              onClick={onClose}
              disabled={saving}
            >
              {t('kassaApp.cancel')}
            </button>
            <button
              type="button"
              disabled={saving}
              className="flex-1 rounded-xl bg-[#3C4D6B] py-3 font-semibold text-white disabled:opacity-50"
              onClick={() => {
                const target = confirmName ?? normName(name)
                if (confirmName) void commitToName(target)
                else if (openList.some((x) => nameTabCustomerKey(x.name) === nameTabCustomerKey(name))) {
                  setConfirmName(normName(name))
                } else void commitToName(name)
              }}
            >
              {confirmName ? t('kassaNameAccount.addToAccountButton') : t('kassaOnAccount.add')}
            </button>
          </div>
        ) : (
          <div className="border-t border-gray-100 px-5 py-4">
            <button
              type="button"
              className="w-full rounded-xl border border-gray-300 py-3 font-semibold text-gray-800"
              onClick={onClose}
              disabled={saving}
            >
              {t('kassaApp.cancel')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
