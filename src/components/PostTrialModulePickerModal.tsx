'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  TENANT_MODULE_IDS,
  TENANT_MODULE_LABELS,
  type TenantModuleId,
  getStarterEnabledModulesRecord,
} from '@/lib/tenant-modules'
import { authFetch } from '@/lib/auth-headers'

const LOCKED: TenantModuleId[] = ['kassa', 'instellingen', 'account']

interface PostTrialModulePickerModalProps {
  tenantSlug: string
  open: boolean
  onConfirmed: () => void
}

export default function PostTrialModulePickerModal({
  tenantSlug,
  open,
  onConfirmed,
}: PostTrialModulePickerModalProps) {
  const [toggles, setToggles] = useState<Record<TenantModuleId, boolean>>(() => ({
    ...getStarterEnabledModulesRecord(),
    kassa: true,
    instellingen: true,
    account: true,
  }))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!open) return null

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    const enabled_modules = TENANT_MODULE_IDS.reduce(
      (acc, id) => {
        acc[id] = LOCKED.includes(id) ? true : !!toggles[id]
        return acc
      },
      {} as Record<string, boolean>
    )

    const res = await authFetch('/api/tenant/confirm-modules', {
      method: 'POST',
      body: JSON.stringify({ tenantSlug, enabled_modules }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setSaving(false)
      setError((data as { error?: string }).error || 'Opslaan mislukt')
      return
    }
    setSaving(false)
    onConfirmed()
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/60">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">Je proefperiode is afgelopen</h2>
          <p className="text-gray-600 text-sm mt-2">
            Kies welke onderdelen van het platform je wilt blijven gebruiken. Je kunt later upgraden via{' '}
            <Link
              href={`/shop/${tenantSlug}/admin/abonnement`}
              className="text-orange-600 font-semibold hover:underline"
            >
              Abonnement
            </Link>
            .
          </p>
        </div>
        <div className="p-6 space-y-3">
          {TENANT_MODULE_IDS.map((id) => {
            const locked = LOCKED.includes(id)
            return (
              <label
                key={id}
                className={`flex items-start gap-3 p-3 rounded-xl border ${
                  locked ? 'border-gray-200 bg-gray-50' : 'border-gray-200 hover:bg-gray-50/80'
                }`}
              >
                <input
                  type="checkbox"
                  className="mt-1 w-4 h-4"
                  checked={!!toggles[id]}
                  disabled={locked}
                  onChange={(e) => setToggles((prev) => ({ ...prev, [id]: e.target.checked }))}
                />
                <span className="text-sm text-gray-800">
                  {TENANT_MODULE_LABELS[id]}
                  {locked && (
                    <span className="block text-xs text-gray-500 mt-0.5">Altijd inbegrepen</span>
                  )}
                </span>
              </label>
            )
          })}
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
        <div className="p-6 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold disabled:opacity-50"
          >
            {saving ? 'Bezig…' : 'Mijn keuze bevestigen'}
          </button>
        </div>
      </div>
    </div>
  )
}
