'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLanguage } from '@/i18n'
import { adminDb } from '@/lib/admin-db-client'
import {
  isNameTabContextColumnError,
  mergeIntoTabLines,
  nameTabCustomerKey,
  nameTabFullSavePayload,
  nameTabItemsOnlyPayload,
  resolveNameTabOrderContext,
  summarizeOpenNameTabs,
  tabOpenTotalIncl,
  type KassaNameTabLine,
  type KassaNameTabRow,
} from '@/lib/kassa-name-account'
import { registerKassaNameTabPayment } from '@/lib/kassa-name-account-payment'
import {
  fetchKassaNameTabs,
  getCachedKassaNameTabs,
  invalidateKassaNameTabsCache,
  prefetchKassaNameTabs,
  setCachedKassaNameTabs,
} from '@/lib/kassa-name-tabs-cache'
import type { MenuCategory, MenuProduct, TenantSettings } from '@/lib/admin-api'
import { normalizeOnAccountCustomerName as normName } from '@/lib/kassa-on-account'
import type {
  KassaCartItem,
  KassaLastOrderReceipt,
  KassaPaymentMethod,
  KassaRegisterOrderType,
} from '@/lib/kassa-cart-types'
import type { FloorPlanZone } from '@/lib/kassa-floor-plan-zone'
import {
  formatOpenAmountForInput,
  nameAccountModalSessionOnOpen,
  nameAccountOpenListVisible,
  nameAccountGrandOpenTotal,
  nameAccountOpenTotalDisplay,
  parseOpenAmountInput,
} from '@/lib/kassa-name-account-modal-ui'

type Props = {
  open: boolean
  tenant: string
  catalog?: {
    settings: TenantSettings | null
    categories: MenuCategory[]
    products: MenuProduct[]
  }
  cart: KassaCartItem[]
  cartTotalIncl: number
  orderType: KassaRegisterOrderType
  tableNumber?: string
  floorPlanZone?: FloorPlanZone
  staffId?: string | null
  onClose: () => void
  onCommitted: () => void
  /** Na betaling: bon tonen/afdrukken via kassa (success-modal). */
  onPaymentSuccess?: (receipt: KassaLastOrderReceipt) => void
}

export default function KassaNameAccountModal({
  open,
  tenant,
  catalog,
  cart,
  cartTotalIncl,
  orderType,
  tableNumber = '',
  floorPlanZone,
  staffId,
  onClose,
  onCommitted,
  onPaymentSuccess,
}: Props) {
  const { t } = useLanguage()
  const [name, setName] = useState('')
  const [tabs, setTabs] = useState<KassaNameTabRow[]>(() => getCachedKassaNameTabs(tenant) ?? [])
  const [loading, setLoading] = useState(() => getCachedKassaNameTabs(tenant) == null)
  const [listRefreshing, setListRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmName, setConfirmName] = useState<string | null>(null)
  const [selectedTabId, setSelectedTabId] = useState<string | null>(null)
  const [payAmount, setPayAmount] = useState('')
  const [payAmountEdited, setPayAmountEdited] = useState(false)
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
    prefetchKassaNameTabs(tenant)
  }, [tenant])

  useEffect(() => {
    if (!open) return
    const fresh = nameAccountModalSessionOnOpen()
    setName(fresh.name)
    setSelectedTabId(fresh.selectedTabId)
    setConfirmName(fresh.confirmName)
    setPayAmount(fresh.payAmount)
    setError(fresh.error)
    setPayAmountEdited(false)
  }, [open, focusNameInput])

  const loadTabs = useCallback(
    async (opts?: { silent?: boolean }) => {
      const hasCache = getCachedKassaNameTabs(tenant) != null
      if (!opts?.silent && !hasCache) setLoading(true)
      else setListRefreshing(true)
      const res = await fetchKassaNameTabs(tenant, { force: true })
      setLoading(false)
      setListRefreshing(false)
      if (!res.ok) {
        setError(t('kassaNameAccount.loadFailed'))
        if (!hasCache) setTabs([])
        return
      }
      setTabs(res.tabs)
      setError(null)
    },
    [tenant, t],
  )

  useEffect(() => {
    if (!open) return
    const cached = getCachedKassaNameTabs(tenant)
    if (cached) {
      setTabs(cached)
      setLoading(false)
      void loadTabs({ silent: true })
    } else {
      void loadTabs()
    }
  }, [open, tenant, loadTabs])

  const openList = useMemo(() => summarizeOpenNameTabs(tabs), [tabs])

  const visibleOpenList = useMemo(
    () => nameAccountOpenListVisible(name, openList),
    [name, openList],
  )

  const selectedTab = useMemo(
    () => tabs.find((r) => r.id === selectedTabId) ?? null,
    [tabs, selectedTabId],
  )

  const payerOpenTotal = useMemo(
    () => nameAccountOpenTotalDisplay(name, selectedTabId, openList),
    [name, selectedTabId, openList],
  )

  const grandOpenTotal = useMemo(() => nameAccountGrandOpenTotal(openList), [openList])

  const resolveTabForName = (personName: string) => {
    const key = nameTabCustomerKey(personName)
    return tabs.find((r) => r.customer_key === key || nameTabCustomerKey(r.customer_name) === key) ?? null
  }

  const pickExisting = (personName: string, tabId: string, remaining: number) => {
    setName(personName)
    setSelectedTabId(tabId)
    setPayAmountEdited(false)
    setPayAmount(remaining > 0.001 ? formatOpenAmountForInput(remaining) : '')
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

    const updatedAt = new Date().toISOString()
    const ctx = resolveNameTabOrderContext({
      id: existing?.id ?? '',
      tenant_slug: tenant,
      customer_name: displayName,
      customer_key: key,
      items: merged,
      order_type: orderType,
      table_number: tableNumber.trim() || null,
      floor_plan_zone: floorPlanZone ?? null,
    })
    const fullPayload = nameTabFullSavePayload(merged, ctx, updatedAt, displayName, key, tenant)
    const itemsOnly = nameTabItemsOnlyPayload(merged, updatedAt)

    const writeTab = async () => {
      if (existing?.id) {
        let res = await adminDb.update(
          'kassa_name_tabs',
          fullPayload,
          { id: existing.id, tenant_slug: tenant },
          { tenantSlug: tenant },
        )
        if (!res.ok && isNameTabContextColumnError(res.error)) {
          res = await adminDb.update(
            'kassa_name_tabs',
            itemsOnly,
            { id: existing.id, tenant_slug: tenant },
            { tenantSlug: tenant },
          )
        }
        return res
      }
      let res = await adminDb.insert('kassa_name_tabs', fullPayload, { tenantSlug: tenant })
      if (!res.ok && isNameTabContextColumnError(res.error)) {
        res = await adminDb.insert(
          'kassa_name_tabs',
          {
            tenant_slug: tenant,
            customer_name: displayName,
            customer_key: key,
            ...itemsOnly,
          },
          { tenantSlug: tenant },
        )
      }
      return res
    }

    const res = await writeTab()

    setSaving(false)
    if (!res.ok) {
      setError(t('kassaNameAccount.saveFailed'))
      return
    }
    invalidateKassaNameTabsCache(tenant)
    setConfirmName(null)
    onCommitted()
    onClose()
    void fetchKassaNameTabs(tenant, { force: true })
  }

  const registerPayment = async () => {
    const tab = selectedTab ?? resolveTabForName(name)
    if (!tab) {
      setError(t('kassaNameAccount.pickPayer'))
      return
    }
    const rawPay = payAmountEdited
      ? payAmount
      : payerOpenTotal > 0.001
        ? formatOpenAmountForInput(payerOpenTotal)
        : payAmount
    const amount = parseOpenAmountInput(rawPay)
    setSaving(true)
    setError(null)
    const res = await registerKassaNameTabPayment({
      tenantSlug: tenant,
      tab,
      amountEur: amount,
      paymentMethod: payMethod,
      staffId,
      catalog,
    })
    setSaving(false)
    if (!res.ok) {
      if (res.error === 'amount_too_high') setError(t('kassaNameAccount.amountTooHigh'))
      else if (res.error === 'invalid_amount') setError(t('kassaNameAccount.invalidAmount'))
      else if (res.error === 'tab_already_settled') setError(t('kassaNameAccount.tabAlreadySettled'))
      else if (res.error === 'amount_not_allocatable') setError(t('kassaNameAccount.amountNotAllocatable'))
      else setError(res.error || t('kassaNameAccount.payFailed'))
      if (res.error === 'tab_already_settled') {
        setSelectedTabId(null)
        void loadTabs()
      }
      return
    }
    invalidateKassaNameTabsCache(tenant)
    const tabId = res.tabId ?? tab.id
    const tabCleared = res.tabCleared === true
    const nextTabs = tabCleared
      ? tabs.filter((r) => r.id !== tabId)
      : tabs.map((r) =>
          r.id === tabId
            ? {
                ...r,
                items: (res.nextTabItems ?? r.items) as KassaNameTabLine[],
                updated_at: new Date().toISOString(),
              }
            : r,
        )
    setTabs(nextTabs)
    setCachedKassaNameTabs(tenant, nextTabs)

    onCommitted()
    if (res.receipt && onPaymentSuccess) {
      onPaymentSuccess(res.receipt)
    }

    setSelectedTabId(null)
    setName('')
    setPayAmount('')
    setPayAmountEdited(false)
    onClose()
    void fetchKassaNameTabs(tenant, { force: true })
  }

  const cartHasItems = cart.length > 0
  const showPayPanel = !cartHasItems && payerOpenTotal > 0.001 && !!normName(name)
  const money = (n: number) => `€ ${n.toFixed(2).replace('.', ',')}`
  const hasPayerSelected = payerOpenTotal > 0.001 && !!normName(name)
  const payerPayFieldValue = payAmountEdited
    ? payAmount
    : payerOpenTotal > 0.001
      ? formatOpenAmountForInput(payerOpenTotal)
      : ''

  if (!open) return null

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
          <div className="flex flex-wrap items-end gap-3">
            <label className="block min-w-[12rem] flex-1 text-sm font-medium text-gray-700">
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
                  const next = e.target.value
                  setName(next)
                  setConfirmName(null)
                  setPayAmountEdited(false)
                  const row = resolveTabForName(next)
                  const tabId = row?.id ?? null
                  setSelectedTabId(tabId)
                  const total = nameAccountOpenTotalDisplay(next, tabId, openList)
                  setPayAmount(total > 0.001 ? formatOpenAmountForInput(total) : '')
                }}
                onFocus={focusNameInput}
                onPointerDown={(e) => {
                  e.stopPropagation()
                  requestAnimationFrame(() => focusNameInput())
                }}
              />
            </label>
            <label className="block w-32 shrink-0 text-sm font-medium text-gray-700 sm:w-36">
              {t('kassaNameAccount.openBalanceLabel')}
              <input
                type="text"
                readOnly
                tabIndex={-1}
                className="vysion-light-form-field mt-1 w-full cursor-default rounded-xl border border-red-200 bg-red-50/80 px-3 py-3 text-base tabular-nums font-semibold text-red-800"
                value={formatOpenAmountForInput(grandOpenTotal)}
                aria-label={t('kassaNameAccount.openBalanceLabel')}
              />
            </label>
          </div>

          <p className="text-sm text-gray-600">{t('kassaNameAccount.openGrandTotalHint')}</p>

          <div>
            <p className="text-sm font-semibold text-gray-800">
              {t('kassaNameAccount.openListTitle')}
              {listRefreshing ? (
                <span className="ml-2 text-xs font-normal text-gray-400">{t('kassaNameAccount.listRefreshing')}</span>
              ) : null}
            </p>
            {loading ? (
              <p className="text-sm text-gray-500 mt-2">{t('kassaOnAccount.loading')}</p>
            ) : openList.length === 0 ? (
              <p className="text-sm text-gray-500 mt-2">{t('kassaOnAccount.quickListEmpty')}</p>
            ) : (
              <ul className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-gray-200 divide-y">
                {visibleOpenList.map((item) => {
                  const active = item.id === selectedTabId
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        className={`flex w-full items-center justify-between px-3 py-3 text-left ${
                          active ? 'bg-teal-50 ring-1 ring-inset ring-teal-200' : 'hover:bg-gray-50'
                        }`}
                        onClick={() => pickExisting(item.name, item.id, item.remaining)}
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

          {!hasPayerSelected && openList.length > 0 && !cartHasItems ? (
            <p className="text-sm text-gray-500">{t('kassaNameAccount.openBalancePickHint')}</p>
          ) : null}

          {showPayPanel ? (
            <div className="rounded-xl border border-teal-200 bg-teal-50/80 px-3 py-4 space-y-3">
              <p className="text-sm font-semibold text-teal-950">
                {t('kassaNameAccount.paySectionTitle').replace('{name}', normName(name))}
                {' — '}
                <span className="tabular-nums">{money(payerOpenTotal)}</span>
              </p>
              <label className="block text-sm font-medium text-gray-800">
                {t('kassaNameAccount.payAmount')}
                <input
                  type="text"
                  inputMode="decimal"
                  className="vysion-light-form-field mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-base text-gray-900 tabular-nums"
                  value={payerPayFieldValue}
                  onChange={(e) => {
                    setPayAmountEdited(true)
                    setPayAmount(e.target.value)
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                />
              </label>
              <p className="text-xs text-teal-900/90">{t('kassaNameAccount.openBalancePayHint')}</p>
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
