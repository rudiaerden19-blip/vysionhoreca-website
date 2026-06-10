'use client'

import { useState } from 'react'
import { useLanguage } from '@/i18n'
import { authFetch } from '@/lib/auth-headers'
import { RetailLoyaltyPassShare } from '@/components/retail-loyalty/RetailLoyaltyPassShare'
import type { RetailLoyaltyMemberPublic } from '@/lib/retail-loyalty/types'

type SearchHit = {
  customer: {
    id: string
    name: string
    email: string
    phone: string | null
    address: string | null
    postal_code: string | null
    city: string | null
  }
  loyaltyMember: RetailLoyaltyMemberPublic | null
}

type SearchPhase = 'idle' | 'searching' | 'done'

export function RetailLoyaltyNewPassPanel({
  tenant,
  onCreated,
}: {
  tenant: string
  onCreated: () => void | Promise<void>
}) {
  const { t } = useLanguage()
  const [searchQuery, setSearchQuery] = useState('')
  const [searchPhase, setSearchPhase] = useState<SearchPhase>('idle')
  const [results, setResults] = useState<SearchHit[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null)
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)

  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')

  const [creating, setCreating] = useState(false)
  const [lastCreatedCode, setLastCreatedCode] = useState<string | null>(null)
  const [lastCreatedDisplayName, setLastCreatedDisplayName] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  const selectedHit = results.find((r) => r.customer.id === selectedCustomerId) ?? null

  function applyHitToForm(hit: SearchHit) {
    setSelectedCustomerId(hit.customer.id)
    setShowNewCustomerForm(false)
    setName(hit.customer.name)
    setEmail(hit.customer.email)
    setPhone(hit.customer.phone ?? '')
    const addrParts = [hit.customer.address, hit.customer.postal_code, hit.customer.city].filter(
      Boolean,
    )
    setAddress(addrParts.join(', '))
    if (hit.loyaltyMember) {
      setLastCreatedCode(hit.loyaltyMember.card_code)
    } else {
      setLastCreatedCode(null)
    }
  }

  async function runSearch() {
    const q = searchQuery.trim()
    if (q.length < 2) return
    setSearchPhase('searching')
    setFeedback(null)
    setLastCreatedCode(null)
    setSelectedCustomerId(null)
    setShowNewCustomerForm(false)
    try {
      const res = await authFetch(
        `/api/retail/loyalty/customer-search?tenant=${encodeURIComponent(tenant)}&q=${encodeURIComponent(q)}`,
      )
      const json = (await res.json()) as { ok?: boolean; results?: SearchHit[] }
      const list = json.ok && Array.isArray(json.results) ? json.results : []
      setResults(list)
      if (list.length === 0) {
        setShowNewCustomerForm(true)
        if (q.includes('@')) setEmail(q)
        else if (/^[\d+\s()-]+$/.test(q)) setPhone(q)
        else setName(q)
      } else if (list.length === 1) {
        applyHitToForm(list[0])
      }
    } finally {
      setSearchPhase('done')
    }
  }

  function resetNewPassForm(keepSuccess?: { cardCode: string; displayName?: string }) {
    setSearchQuery('')
    setSearchPhase('idle')
    setResults([])
    setSelectedCustomerId(null)
    setShowNewCustomerForm(false)
    setName('')
    setAddress('')
    setPhone('')
    setEmail('')
    if (keepSuccess) {
      setLastCreatedCode(keepSuccess.cardCode)
    } else {
      setLastCreatedCode(null)
    }
  }

  async function savePass(sendEmail: boolean, opts?: { resendExistingPass?: boolean }) {
    if (!name.trim()) {
      alert(t('retailLoyalty.newPassNameRequired'))
      return
    }
    if (!email.trim()) {
      alert(t('retailLoyalty.newPassEmailRequired'))
      return
    }
    setCreating(true)
    setFeedback(null)
    try {
      const res = await authFetch('/api/retail/loyalty/members', {
        method: 'POST',
        body: JSON.stringify({
          tenantSlug: tenant,
          display_name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim(),
          address: address.trim() || undefined,
          shop_customer_id: selectedCustomerId ?? undefined,
          sendPassEmail: sendEmail,
          resendExistingPass: opts?.resendExistingPass === true,
        }),
      })
      const json = (await res.json()) as {
        ok?: boolean
        member?: { card_code: string }
        emailSent?: boolean
        warning?: string
        error?: string
      }
      if (!json.ok || !json.member) {
        if (json.error === 'email_has_active_pass') {
          alert(t('retailLoyalty.emailAlreadyHasPass'))
        } else if (json.error === 'smtp_not_configured') {
          alert(t('retailLoyalty.emailNotConfigured'))
        } else {
          alert(t('retailLoyalty.createError'))
        }
        return
      }
      const savedName = name.trim()
      resetNewPassForm({ cardCode: json.member.card_code, displayName: savedName })
      setLastCreatedDisplayName(savedName)
      if (json.warning === 'smtp_not_configured' || json.error === 'smtp_not_configured') {
        setFeedback(t('retailLoyalty.emailNotConfigured'))
      } else if (json.warning === 'existing_pass_mailed' || json.error === 'existing_pass_mailed') {
        setFeedback(t('retailLoyalty.existingPassMailed'))
      } else if (json.warning === 'email_send_failed' || json.error === 'email_send_failed') {
        setFeedback(t('retailLoyalty.passEmailFailed'))
      } else if (sendEmail && json.emailSent) {
        setFeedback(t('retailLoyalty.passEmailSent'))
      } else if (sendEmail && !json.emailSent) {
        setFeedback(t('retailLoyalty.passEmailFailed'))
      }
      await onCreated()
    } finally {
      setCreating(false)
    }
  }

  const notFound =
    searchPhase === 'done' && searchQuery.trim().length >= 2 && results.length === 0

  return (
    <section className="mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-lg font-semibold">{t('retailLoyalty.newPassTitle')}</h2>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              void runSearch()
            }
          }}
          placeholder={t('retailLoyalty.customerSearchPlaceholder')}
          className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm"
        />
        <button
          type="button"
          disabled={searchPhase === 'searching' || searchQuery.trim().length < 2}
          onClick={() => void runSearch()}
          className="rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-900 disabled:opacity-50"
        >
          {searchPhase === 'searching'
            ? t('retailLoyalty.customerSearching')
            : t('retailLoyalty.customerSearch')}
        </button>
      </div>

      {results.length > 1 ? (
        <ul className="mb-4 divide-y divide-gray-100 rounded-lg border border-gray-100">
          {results.map((hit) => (
            <li key={hit.customer.id}>
              <button
                type="button"
                onClick={() => applyHitToForm(hit)}
                className={`flex w-full flex-col items-start px-3 py-2.5 text-left text-sm hover:bg-gray-50 ${
                  selectedCustomerId === hit.customer.id ? 'bg-emerald-50' : ''
                }`}
              >
                <span className="font-semibold text-gray-900">{hit.customer.name}</span>
                <span className="text-xs text-gray-600">{hit.customer.email}</span>
                {hit.loyaltyMember ? (
                  <span className="mt-0.5 text-xs font-medium text-emerald-700">
                    {t('retailLoyalty.customerHasPass')}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {notFound ? (
        <p className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-900">
          {t('retailLoyalty.customerNotFound')}
        </p>
      ) : null}

      {selectedHit && !showNewCustomerForm && !notFound ? (
        <p className="mb-3 text-sm text-gray-600">
          {selectedHit.loyaltyMember
            ? t('retailLoyalty.customerExistingPass')
            : t('retailLoyalty.customerFoundNoPass')}
        </p>
      ) : null}

      {(searchPhase === 'done' && searchQuery.trim().length >= 2) ||
      selectedCustomerId ||
      showNewCustomerForm ? (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-gray-700">{t('retailLoyalty.fieldName')}</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-gray-700">{t('retailLoyalty.fieldAddress')}</span>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">{t('retailLoyalty.fieldPhone')}</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-gray-700">{t('retailLoyalty.fieldEmail')}</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={creating}
              onClick={() => void savePass(true)}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {creating ? t('retailLoyalty.creating') : t('retailLoyalty.createPassAndEmail')}
            </button>
            <button
              type="button"
              disabled={creating}
              onClick={() => void savePass(false)}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-800 disabled:opacity-50"
            >
              {t('retailLoyalty.createPassOnly')}
            </button>
            {selectedHit?.loyaltyMember ? (
              <button
                type="button"
                disabled={creating || !email.trim()}
                onClick={() => void savePass(true, { resendExistingPass: true })}
                className="rounded-lg border border-emerald-600 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900 disabled:opacity-50"
              >
                {t('retailLoyalty.resendPassEmail')}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-500">{t('retailLoyalty.customerSearchHint')}</p>
      )}

      {feedback ? <p className="mt-2 text-sm text-emerald-700">{feedback}</p> : null}

      {lastCreatedCode ? (
        <div className="mt-4">
          <RetailLoyaltyPassShare
            tenantSlug={tenant}
            cardCode={lastCreatedCode}
            displayName={lastCreatedDisplayName ?? undefined}
            pointsBalance={selectedHit?.loyaltyMember?.points_balance ?? 0}
          />
        </div>
      ) : null}
      <p className="mt-2 text-xs text-gray-500">{t('retailLoyalty.cardCodeHint')}</p>
    </section>
  )
}
