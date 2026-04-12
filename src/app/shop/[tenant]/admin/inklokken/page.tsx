'use client'

import { useLanguage } from '@/i18n'
import PinGate from '@/components/PinGate'
import { AdminStaffClockPanel } from '@/components/AdminStaffClockPanel'
import { getTenantSettings, saveTenantKassaStaffClockEnabled } from '@/lib/admin-api'
import type { StaffSalesSummaryReceiptBusiness } from '@/lib/print-receipt-html'
import { useEffect, useState } from 'react'

export default function InklokkenPage({ params }: { params: { tenant: string } }) {
  const { t } = useLanguage()
  const tenant = params.tenant
  const [kassaClockEnabled, setKassaClockEnabled] = useState(false)
  const [kassaClockLoading, setKassaClockLoading] = useState(true)
  const [kassaClockSaving, setKassaClockSaving] = useState(false)
  const [receiptBusiness, setReceiptBusiness] = useState<StaffSalesSummaryReceiptBusiness | undefined>()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setKassaClockLoading(true)
      const s = await getTenantSettings(tenant)
      if (!cancelled) {
        setKassaClockEnabled(!!s?.kassa_staff_clock_enabled)
        if (s) {
          setReceiptBusiness({
            name: s.business_name,
            address: s.address,
            postalCode: s.postal_code,
            city: s.city,
            phone: s.phone,
          })
        } else {
          setReceiptBusiness(undefined)
        }
        setKassaClockLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tenant])

  async function toggleKassaClock() {
    const next = !kassaClockEnabled
    setKassaClockSaving(true)
    const res = await saveTenantKassaStaffClockEnabled(tenant, next)
    setKassaClockSaving(false)
    if (res.ok) {
      setKassaClockEnabled(next)
    } else {
      alert(res.error || t('adminPages.common.saveFailed'))
    }
  }

  return (
    <PinGate tenant={tenant}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">⏰ {t('inklokkenPage.title')}</h1>
          <p className="mt-1 text-gray-500">{t('inklokkenPage.subtitle')}</p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-gray-900">{t('personeelPage.kassaClock.title')}</h2>
              <p className="mt-1 text-sm text-gray-600">{t('personeelPage.kassaClock.description')}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {kassaClockLoading ? (
                <span className="text-sm text-gray-400">…</span>
              ) : (
                <>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={kassaClockEnabled}
                    disabled={kassaClockSaving}
                    onClick={() => void toggleKassaClock()}
                    className={`relative h-8 w-14 rounded-full transition-colors duration-200 disabled:opacity-50 ${
                      kassaClockEnabled ? 'bg-emerald-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform duration-200 ${
                        kassaClockEnabled ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-medium text-gray-700">{t('personeelPage.kassaClock.toggle')}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {kassaClockEnabled ? (
          <AdminStaffClockPanel tenantSlug={tenant} showSalesButton={false} receiptBusiness={receiptBusiness} />
        ) : (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
            {t('inklokkenPage.disabledHint')}
          </div>
        )}
      </div>
    </PinGate>
  )
}
