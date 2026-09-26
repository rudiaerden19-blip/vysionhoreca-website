'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/i18n'
import { authFetch } from '@/lib/auth-headers'
import { RetailLoyaltyPassShare } from '@/components/retail-loyalty/RetailLoyaltyPassShare'
import { RetailLoyaltyNewPassPanel } from '@/components/retail-loyalty/RetailLoyaltyNewPassPanel'
import type { RetailLoyaltyMemberPos } from '@/lib/retail-loyalty/types'
import {
  retailCardHolderMatchesQuery,
  splitCustomerFullName,
} from '@/lib/retail-loyalty/card-holder-search'
import { ControlledNumberInput } from '@/components/ControlledNumberInput'

type CardFileMember = RetailLoyaltyMemberPos & { is_active: boolean }

type Settings = {
  enabled: boolean
  points_per_euro: number
  min_order_total_for_points: number
  redeem_enabled: boolean
  redeem_points_per_euro: number
}

function MemberManagePanel({
  tenant,
  member,
  onUpdated,
}: {
  tenant: string
  member: CardFileMember
  onUpdated: () => void | Promise<void>
}) {
  const { t } = useLanguage()
  const initialName = splitCustomerFullName(member.customer_name || member.display_name)
  const [firstName, setFirstName] = useState(initialName.firstName)
  const [lastName, setLastName] = useState(initialName.lastName)
  const [phone, setPhone] = useState(member.phone ?? '')
  const [email, setEmail] = useState(member.email ?? '')
  const [street, setStreet] = useState(member.customer_address ?? '')
  const [postalCode, setPostalCode] = useState(member.customer_postal_code ?? '')
  const [city, setCity] = useState(member.customer_city ?? '')
  const [btwNumber, setBtwNumber] = useState(member.customer_btw_number ?? '')
  const [saving, setSaving] = useState(false)
  const [adjustDelta, setAdjustDelta] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [adjustBusy, setAdjustBusy] = useState(false)

  useEffect(() => {
    const parts = splitCustomerFullName(member.customer_name || member.display_name)
    setFirstName(member.first_name?.trim() || parts.firstName)
    setLastName(member.last_name?.trim() || parts.lastName)
    setPhone(member.phone ?? '')
    setEmail(member.email ?? '')
    setStreet(member.customer_address ?? '')
    setPostalCode(member.customer_postal_code ?? '')
    setCity(member.customer_city ?? '')
    setBtwNumber(member.customer_btw_number ?? '')
  }, [
    member.id,
    member.customer_name,
    member.display_name,
    member.first_name,
    member.last_name,
    member.phone,
    member.email,
    member.customer_address,
    member.customer_postal_code,
    member.customer_city,
    member.customer_btw_number,
  ])

  async function saveMember() {
    setSaving(true)
    try {
      const res = await authFetch('/api/retail/loyalty/members', {
        method: 'PATCH',
        body: JSON.stringify({
          tenantSlug: tenant,
          memberId: member.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          phone: phone.trim() || null,
          email: email.trim() || null,
          address: street.trim() || null,
          postal_code: postalCode.trim() || null,
          city: city.trim() || null,
          btw_number: btwNumber.trim() || null,
        }),
      })
      const json = (await res.json()) as { ok?: boolean }
      if (!json.ok) alert(t('retailLoyalty.memberSaveError'))
      else await onUpdated()
    } finally {
      setSaving(false)
    }
  }

  async function setActive(next: boolean) {
    if (
      !next &&
      !window.confirm(t('retailLoyalty.deactivateConfirm'))
    ) {
      return
    }
    setSaving(true)
    try {
      const res = await authFetch('/api/retail/loyalty/members', {
        method: 'PATCH',
        body: JSON.stringify({
          tenantSlug: tenant,
          memberId: member.id,
          is_active: next,
        }),
      })
      const json = (await res.json()) as { ok?: boolean }
      if (!json.ok) alert(t('retailLoyalty.memberSaveError'))
      else await onUpdated()
    } finally {
      setSaving(false)
    }
  }

  async function applyAdjust() {
    const delta = parseInt(adjustDelta.trim(), 10)
    if (!Number.isFinite(delta) || delta === 0) return
    setAdjustBusy(true)
    try {
      const res = await authFetch('/api/retail/loyalty/adjust', {
        method: 'POST',
        body: JSON.stringify({
          tenantSlug: tenant,
          memberId: member.id,
          pointsDelta: delta,
          note: adjustNote.trim() || undefined,
        }),
      })
      const json = (await res.json()) as { ok?: boolean; error?: string }
      if (!json.ok) {
        alert(t('retailLoyalty.adjustError'))
        return
      }
      setAdjustDelta('')
      setAdjustNote('')
      await onUpdated()
    } finally {
      setAdjustBusy(false)
    }
  }

  return (
    <div className="mt-3 space-y-4 rounded-lg border border-gray-100 bg-gray-50/80 p-3">
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t('retailLoyalty.editMemberTitle')}
        </p>
        <div className="mb-2 grid gap-2 sm:grid-cols-2">
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder={t('retailLoyalty.fieldFirstName')}
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder={t('retailLoyalty.fieldLastName')}
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder={t('retailLoyalty.fieldStreet')}
            className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            type="text"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            placeholder={t('retailLoyalty.fieldPostalCode')}
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder={t('retailLoyalty.fieldCity')}
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <input
            type="text"
            value={btwNumber}
            onChange={(e) => setBtwNumber(e.target.value)}
            placeholder={t('retailLoyalty.fieldBtwNumber')}
            className="rounded-lg border px-3 py-2 text-sm sm:col-span-2"
          />
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('retailLoyalty.fieldPhone')}
            className="rounded-lg border px-3 py-2 text-sm"
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('retailLoyalty.fieldEmail')}
            className="rounded-lg border px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveMember()}
          className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
        >
          {saving ? t('retailLoyalty.saving') : t('retailLoyalty.saveMember')}
        </button>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
          {t('retailLoyalty.adjustPointsTitle')}
        </p>
        <div className="mb-2 flex flex-wrap gap-2">
          <input
            type="text"
            inputMode="numeric"
            value={adjustDelta}
            onChange={(e) => setAdjustDelta(e.target.value)}
            placeholder={t('retailLoyalty.adjustPointsDeltaPlaceholder')}
            className="w-28 rounded-lg border px-3 py-2 text-sm font-mono"
          />
          <input
            type="text"
            value={adjustNote}
            onChange={(e) => setAdjustNote(e.target.value)}
            placeholder={t('retailLoyalty.adjustPointsNotePlaceholder')}
            className="min-w-[10rem] flex-1 rounded-lg border px-3 py-2 text-sm"
          />
          <button
            type="button"
            disabled={adjustBusy}
            onClick={() => void applyAdjust()}
            className="rounded-lg border border-amber-600 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 disabled:opacity-50"
          >
            {adjustBusy ? t('retailLoyalty.saving') : t('retailLoyalty.adjustPointsApply')}
          </button>
        </div>
        <p className="text-[11px] text-gray-500">{t('retailLoyalty.adjustPointsHint')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {member.is_active ? (
          <button
            type="button"
            disabled={saving}
            onClick={() => void setActive(false)}
            className="rounded-lg border border-red-300 bg-white px-3 py-2 text-xs font-semibold text-red-800"
          >
            {t('retailLoyalty.deactivatePass')}
          </button>
        ) : (
          <button
            type="button"
            disabled={saving}
            onClick={() => void setActive(true)}
            className="rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900"
          >
            {t('retailLoyalty.reactivatePass')}
          </button>
        )}
      </div>
    </div>
  )
}

export default function RetailLoyaltyAdminPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const baseUrl = `/shop/${params.tenant}/admin`
  const [settings, setSettings] = useState<Settings>({
    enabled: true,
    points_per_euro: 1,
    min_order_total_for_points: 0,
    redeem_enabled: true,
    redeem_points_per_euro: 100,
  })
  const [members, setMembers] = useState<CardFileMember[]>([])
  const [memberQuery, setMemberQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [expandedPassId, setExpandedPassId] = useState<string | null>(null)
  const [managePassId, setManagePassId] = useState<string | null>(null)
  const [showInactive, setShowInactive] = useState(false)
  const [deletingMemberId, setDeletingMemberId] = useState<string | null>(null)
  const [mailingMemberId, setMailingMemberId] = useState<string | null>(null)

  const loadMembers = useCallback(async () => {
    const res = await authFetch(
      `/api/retail/loyalty/members?tenant=${encodeURIComponent(params.tenant)}&includeInactive=1`,
    )
    const json = (await res.json()) as { ok?: boolean; members?: CardFileMember[] }
    if (res.ok && json.ok && Array.isArray(json.members)) {
      setMembers(json.members)
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
          redeem_enabled: sJson.settings.redeem_enabled !== false,
          redeem_points_per_euro: Number(sJson.settings.redeem_points_per_euro) || 100,
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

  const visibleMembers = useMemo(
    () =>
      members.filter((member) => {
        if (!showInactive && !member.is_active) return false
        return retailCardHolderMatchesQuery(member, memberQuery)
      }),
    [members, memberQuery, showInactive],
  )

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
          redeem_enabled: settings.redeem_enabled,
          redeem_points_per_euro: Math.max(1, settings.redeem_points_per_euro || 100),
        }),
      })
      const json = (await res.json()) as { ok?: boolean }
      if (!json.ok) alert(t('retailLoyalty.saveError'))
    } finally {
      setSavingSettings(false)
    }
  }

  async function deleteMember(member: CardFileMember) {
    const label = member.display_name?.trim() || member.card_code
    if (!window.confirm(t('retailLoyalty.deletePassConfirm').replace('{name}', label))) {
      return
    }
    setDeletingMemberId(member.id)
    try {
      const res = await authFetch('/api/retail/loyalty/members', {
        method: 'DELETE',
        body: JSON.stringify({ tenantSlug: params.tenant, memberId: member.id }),
      })
      const json = (await res.json()) as { ok?: boolean }
      if (!json.ok) {
        alert(t('retailLoyalty.deletePassError'))
        return
      }
      if (managePassId === member.id) setManagePassId(null)
      if (expandedPassId === member.id) setExpandedPassId(null)
      await loadMembers()
    } finally {
      setDeletingMemberId(null)
    }
  }

  async function mailPassBarcode(member: CardFileMember) {
    if (!member.id) return
    setMailingMemberId(member.id)
    try {
      const res = await authFetch('/api/retail/loyalty/send-pass-email', {
        method: 'POST',
        body: JSON.stringify({ tenantSlug: params.tenant, memberId: member.id }),
      })
      const json = (await res.json()) as { ok?: boolean; error?: string }
      if (!json.ok) {
        if (json.error === 'smtp_not_configured') {
          alert(t('retailLoyalty.emailNotConfigured'))
        } else if (json.error === 'member_no_email') {
          alert(t('retailLoyalty.memberNoEmail'))
        } else {
          alert(t('retailLoyalty.passEmailFailed'))
        }
        return
      }
      alert(t('retailLoyalty.passEmailSent'))
    } finally {
      setMailingMemberId(null)
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

      <RetailLoyaltyNewPassPanel tenant={params.tenant} onCreated={loadMembers} />

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
            <ControlledNumberInput
              value={settings.points_per_euro}
              onChange={(n) => setSettings((s) => ({ ...s, points_per_euro: n }))}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">{t('retailLoyalty.minOrderTotal')}</span>
            <ControlledNumberInput
              value={settings.min_order_total_for_points}
              onChange={(n) =>
                setSettings((s) => ({
                  ...s,
                  min_order_total_for_points: n,
                }))
              }
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </label>
        </div>
        <label className="mb-3 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={settings.redeem_enabled}
            onChange={(e) => setSettings((s) => ({ ...s, redeem_enabled: e.target.checked }))}
          />
          {t('retailLoyalty.redeemEnabled')}
        </label>
        <label className="mb-3 block text-sm">
          <span className="font-medium">{t('retailLoyalty.redeemPointsPerEuro')}</span>
          <ControlledNumberInput
            integer
            emptyWhenZero
            value={settings.redeem_points_per_euro}
            onChange={(n) =>
              setSettings((s) => ({
                ...s,
                redeem_points_per_euro: n,
              }))
            }
            className="mt-1 w-full rounded-lg border px-3 py-2 sm:max-w-xs"
          />
          <span className="mt-1 block text-xs text-gray-500">{t('retailLoyalty.redeemPointsPerEuroHint')}</span>
        </label>
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
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">{t('retailLoyalty.membersManageTitle')}</h2>
          <label className="flex items-center gap-2 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            {t('retailLoyalty.showInactive')}
          </label>
        </div>
        <input
          type="search"
          value={memberQuery}
          onChange={(e) => setMemberQuery(e.target.value)}
          placeholder={t('retailLoyalty.memberFileSearch')}
          className="mb-3 w-full rounded-lg border px-3 py-2 text-sm"
        />
        {loading ? (
          <p className="text-sm text-gray-500">{t('retailLoyalty.loading')}</p>
        ) : members.length === 0 ? (
          <p className="text-sm text-gray-500">{t('retailLoyalty.noMembers')}</p>
        ) : visibleMembers.length === 0 ? (
          <p className="text-sm text-gray-500">{t('retailKassaPage.customersEmpty')}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {visibleMembers.map((m) => {
              const place = [m.customer_address, m.customer_postal_code, m.customer_city]
                .filter(Boolean)
                .join(', ')
              return (
              <li key={m.id} className="py-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {(m.customer_name || m.display_name)?.trim() || t('retailLoyalty.unnamed')}
                      {!m.is_active ? (
                        <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-700">
                          {t('retailLoyalty.passInactive')}
                        </span>
                      ) : null}
                    </p>
                    <p className="font-mono text-xs text-gray-600">{m.card_code}</p>
                    {place ? <p className="text-xs text-gray-500">{place}</p> : null}
                    {m.customer_btw_number ? (
                      <p className="text-xs text-gray-500">
                        {t('retailKassaPage.customersVat')}: {m.customer_btw_number}
                      </p>
                    ) : null}
                    {m.phone ? <p className="text-xs text-gray-500">{m.phone}</p> : null}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-3 py-1 font-bold text-amber-900">
                      {m.points_balance} {t('retailLoyalty.pointsShort')}
                    </span>
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800"
                      onClick={() =>
                        setManagePassId((id) => (id === m.id ? null : m.id))
                      }
                    >
                      {managePassId === m.id
                        ? t('retailLoyalty.hideManagePass')
                        : t('retailLoyalty.managePass')}
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-800"
                      onClick={() =>
                        setExpandedPassId((id) => (id === m.id ? null : m.id))
                      }
                    >
                      {expandedPassId === m.id
                        ? t('retailLoyalty.hidePassBarcode')
                        : t('retailLoyalty.showPassBarcode')}
                    </button>
                    <button
                      type="button"
                      disabled={mailingMemberId === m.id}
                      className="rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 disabled:opacity-50"
                      onClick={() => void mailPassBarcode(m)}
                    >
                      {mailingMemberId === m.id
                        ? t('retailLoyalty.mailingPass')
                        : t('retailLoyalty.mailPassBarcode')}
                    </button>
                    <button
                      type="button"
                      disabled={deletingMemberId === m.id}
                      className="rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-800 disabled:opacity-50"
                      onClick={() => void deleteMember(m)}
                    >
                      {deletingMemberId === m.id
                        ? t('retailLoyalty.deletingPass')
                        : t('retailLoyalty.deletePass')}
                    </button>
                  </div>
                </div>
                {managePassId === m.id ? (
                  <MemberManagePanel
                    tenant={params.tenant}
                    member={m}
                    onUpdated={loadMembers}
                  />
                ) : null}
                {expandedPassId === m.id ? (
                  <div className="mt-3">
                    <RetailLoyaltyPassShare
                      tenantSlug={params.tenant}
                      cardCode={m.card_code}
                      displayName={m.display_name}
                      pointsBalance={m.points_balance}
                      compact
                    />
                  </div>
                ) : null}
              </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
