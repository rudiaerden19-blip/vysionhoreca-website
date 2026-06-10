'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/i18n'
import { authFetch } from '@/lib/auth-headers'
import { adminDb } from '@/lib/admin-db-client'
import type { RetailLoyaltyMember } from '@/lib/retail-loyalty/types'

type Settings = {
  enabled: boolean
  points_per_euro: number
  min_order_total_for_points: number
}

export default function RetailLoyaltyAdminPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const baseUrl = `/shop/${params.tenant}/admin`
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    points_per_euro: 1,
    min_order_total_for_points: 0,
  })
  const [members, setMembers] = useState<RetailLoyaltyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [lastCreatedCode, setLastCreatedCode] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    const res = await adminDb.select<RetailLoyaltyMember[]>('retail_loyalty_members', {
      tenantSlug: params.tenant,
      select: 'id, tenant_slug, card_code, display_name, phone, points_balance, is_active',
      match: { is_active: true },
      order: { column: 'created_at', ascending: false },
      limit: 500,
    })
    if (res.ok && Array.isArray(res.data)) {
      setMembers(res.data)
    }
  }, [params.tenant])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const sRes = await authFetch(
        `/api/retail/loyalty/settings?tenant=${encodeURIComponent(params.tenant)}`,
      )
      const sJson = (await sRes.json()) as { ok?: boolean; settings?: Settings }
      if (sJson.ok && sJson.settings) {
        setSettings({
          enabled: sJson.settings.enabled,
          points_per_euro: Number(sJson.settings.points_per_euro) || 1,
          min_order_total_for_points: Number(sJson.settings.min_order_total_for_points) || 0,
        })
      }
      await loadMembers()
    } finally {
      setLoading(false)
    }
  }, [params.tenant, loadMembers])

  useEffect(() => {
    void load()
  }, [load])

  async function saveSettings() {
    setSavingSettings(true)
    try {
      const res = await authFetch('/api/retail/loyalty/settings', {
        method: 'POST',
        body: JSON.stringify({
          tenantSlug: params.tenant,
          enabled: settings.enabled,
          points_per_euro: settings.points_per_euro,
          min_order_total_for_points: settings.min_order_total_for_points,
        }),
      })
      const json = (await res.json()) as { ok?: boolean }
      if (!json.ok) alert(t('retailLoyalty.saveError'))
    } finally {
      setSavingSettings(false)
    }
  }

  async function createMember() {
    setCreating(true)
    setLastCreatedCode(null)
    try {
      const res = await authFetch('/api/retail/loyalty/members', {
        method: 'POST',
        body: JSON.stringify({
          tenantSlug: params.tenant,
          display_name: newName.trim() || undefined,
          phone: newPhone.trim() || undefined,
        }),
      })
      const json = (await res.json()) as { ok?: boolean; member?: { card_code: string } }
      if (!json.ok || !json.member) {
        alert(t('retailLoyalty.createError'))
        return
      }
      setLastCreatedCode(json.member.card_code)
      setNewName('')
      setNewPhone('')
      await loadMembers()
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl p-4 sm:p-6">
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link
          href={`${baseUrl}/retail-kassa`}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← {t('retailLoyalty.backToPos')}
        </Link>
        <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t('retailLoyalty.title')}</h1>
      </div>

      <p className="mb-6 text-sm text-gray-600">{t('retailLoyalty.intro')}</p>

      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">{t('retailLoyalty.newPassTitle')}</h2>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <input
            type="text"
            placeholder={t('retailLoyalty.namePlaceholder')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <input
            type="tel"
            placeholder={t('retailLoyalty.phonePlaceholder')}
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={creating}
          onClick={() => void createMember()}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {creating ? t('retailLoyalty.creating') : t('retailLoyalty.createPass')}
        </button>
        {lastCreatedCode ? (
          <p className="mt-4 rounded-lg bg-emerald-50 p-3 font-mono text-lg font-bold text-emerald-900">
            {t('retailLoyalty.cardCodeLabel')}: {lastCreatedCode}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-gray-500">{t('retailLoyalty.cardCodeHint')}</p>
      </section>

      <section className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">{t('retailLoyalty.settingsTitle')}</h2>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
          />
          {t('retailLoyalty.enabled')}
        </label>
        <div className="mb-3 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium">{t('retailLoyalty.pointsPerEuro')}</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={settings.points_per_euro}
              onChange={(e) =>
                setSettings((s) => ({ ...s, points_per_euro: parseFloat(e.target.value) || 0 }))
              }
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">{t('retailLoyalty.minOrderTotal')}</span>
            <input
              type="number"
              min={0}
              step={0.01}
              value={settings.min_order_total_for_points}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  min_order_total_for_points: parseFloat(e.target.value) || 0,
                }))
              }
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
        </div>
        <button
          type="button"
          disabled={savingSettings}
          onClick={() => void saveSettings()}
          className="rounded-lg bg-black px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {savingSettings ? t('retailLoyalty.saving') : t('retailLoyalty.saveSettings')}
        </button>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-semibold">{t('retailLoyalty.membersTitle')}</h2>
        {loading ? (
          <p className="text-sm text-gray-500">{t('retailLoyalty.loading')}</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-gray-500">{t('retailLoyalty.noMembers')}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {members.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <div>
                  <p className="font-semibold text-gray-900">
                    {m.display_name?.trim() || t('retailLoyalty.unnamed')}
                  </p>
                  <p className="font-mono text-xs text-gray-600">{m.card_code}</p>
                  {m.phone ? <p className="text-xs text-gray-500">{m.phone}</p> : null}
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-900">
                  {m.points_balance} {t('retailLoyalty.pointsShort')}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
