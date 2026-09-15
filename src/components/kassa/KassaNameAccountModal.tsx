'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/i18n'
import { adminDb } from '@/lib/admin-db-client'
import {
  mergeIntoTabLines,
  nameTabCustomerKey,
  summarizeOpenNameTabs,
  type KassaNameTabLine,
  type KassaNameTabRow,
} from '@/lib/kassa-name-account'
import { normalizeOnAccountCustomerName as normName } from '@/lib/kassa-on-account'
import type { KassaCartItem } from '@/lib/kassa-cart-types'

type Props = {
  tenant: string
  cart: KassaCartItem[]
  cartTotalIncl: number
  onClose: () => void
  onCommitted: () => void
}

export default function KassaNameAccountModal({
  tenant,
  cart,
  cartTotalIncl,
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

  const pickExisting = (personName: string) => {
    setConfirmName(personName)
    setName(personName)
  }

  return (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        role="dialog"
        aria-labelledby="kassa-name-account-title"
      >
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 id="kassa-name-account-title" className="text-lg font-bold text-gray-900">
            {t('kassaNameAccount.modalTitle')}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {t('kassaNameAccount.modalHint')} (€ {cartTotalIncl.toFixed(2).replace('.', ',')})
          </p>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <label className="block text-sm font-medium text-gray-700">
            {t('kassaOnAccount.name')}
            <input
              type="text"
              className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-3 text-base"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setConfirmName(null)
              }}
              autoComplete="off"
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
                {(name ? nameMatches : openList).map((item) => (
                  <li key={item.name}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-3 text-left hover:bg-gray-50"
                      onClick={() => pickExisting(item.name)}
                    >
                      <span className="font-medium text-gray-900">{item.name}</span>
                      <span className="tabular-nums text-red-700">
                        € {item.remaining.toFixed(2).replace('.', ',')}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {confirmName ? (
            <p className="rounded-xl bg-amber-50 px-3 py-3 text-sm text-amber-950">
              {t('kassaNameAccount.addToAccountConfirm').replace('{name}', confirmName)}
            </p>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

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
            disabled={saving || cart.length === 0}
            className="flex-1 rounded-xl bg-[#3C4D6B] py-3 font-semibold text-white disabled:opacity-50"
            onClick={() => {
              const target = confirmName ?? normName(name)
              if (confirmName) void commitToName(target)
              else if (openList.some((x) => nameTabCustomerKey(x.name) === nameTabCustomerKey(name))) {
                setConfirmName(normName(name))
              } else void commitToName(name)
            }}
          >
            {confirmName
              ? t('kassaNameAccount.addToAccountButton')
              : t('kassaOnAccount.add')}
          </button>
        </div>
      </div>
    </div>
  )
}
