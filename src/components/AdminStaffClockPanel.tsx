'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLanguage } from '@/i18n'
import {
  appLocaleToBcp47,
  getSavedLanPrinterIp,
  printStaffSalesSummaryReceipt,
  type StaffSalesSummaryReceiptBusiness,
} from '@/lib/print-receipt-html'

type StaffRow = { id: string; name: string; hasOpenSession: boolean }

type PinModal = { staffId: string; staffName: string; action: 'in' | 'out' }

type SummaryState = {
  staffName: string
  total: number
  orderCount: number
  orders: { order_number: number; total: number }[]
}

type Props = {
  tenantSlug: string
  /** Toon derde knop «Verkoop» (kassa); admin-pagina linkt naar kassa. */
  showSalesButton?: boolean
  kassaHref?: string | null
  onStartSales?: (staff: { id: string; name: string }) => void
  /** Koptekst op afgedrukt dagoverzicht (zaak). */
  receiptBusiness?: StaffSalesSummaryReceiptBusiness
  /** BTW-% voor thermische bon via print-proxy (zelfde als kassa). */
  btwPercentage?: number
}

export function AdminStaffClockPanel({
  tenantSlug,
  showSalesButton = false,
  kassaHref,
  onStartSales,
  receiptBusiness,
  btwPercentage = 6,
}: Props) {
  const { t, locale } = useLanguage()
  const [staffList, setStaffList] = useState<StaffRow[]>([])
  const [listLoading, setListLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [pinModal, setPinModal] = useState<PinModal | null>(null)
  const [pinInput, setPinInput] = useState('')
  const [pinError, setPinError] = useState<string | null>(null)
  const [summary, setSummary] = useState<SummaryState | null>(null)

  const staffClockErrorText = useCallback(
    (code: string) => {
      const key = `staffClock.errors.${code}`
      const msg = t(key)
      return msg === key ? t('staffClock.errors.unknown') : msg
    },
    [t]
  )

  const loadList = useCallback(
    async (opts?: { background?: boolean }) => {
      if (!opts?.background) setListLoading(true)
      try {
        const res = await fetch(`/api/kassa/staff-clock?tenant_slug=${encodeURIComponent(tenantSlug)}`)
        const data = (await res.json()) as { ok?: boolean; staff?: StaffRow[] }
        if (data.ok && data.staff) setStaffList(data.staff)
        else if (!opts?.background) setStaffList([])
      } catch {
        if (!opts?.background) setStaffList([])
      } finally {
        if (!opts?.background) setListLoading(false)
      }
    },
    [tenantSlug]
  )

  const submitPin = async () => {
    const modal = pinModal
    if (!modal) return
    const pin = pinInput.trim()
    if (!pin) {
      setPinError(t('staffClock.pinRequired'))
      return
    }
    setBusy(true)
    setPinError(null)
    try {
      const res = await fetch('/api/kassa/staff-clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenant_slug: tenantSlug,
          staff_id: modal.staffId,
          pin,
          action: modal.action,
        }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        error?: string
        staffName?: string
        summary?: { total: number; order_count: number; orders: { order_number: number; total: number }[] }
      }
      if (data.ok) {
        setPinModal(null)
        setPinInput('')
        if (modal.action === 'out' && data.summary !== undefined) {
          setSummary({
            staffName: data.staffName || modal.staffName,
            total: data.summary.total,
            orderCount: data.summary.order_count,
            orders: data.summary.orders || [],
          })
        }
        void loadList({ background: true })
      } else {
        setPinError(staffClockErrorText(data.error || 'unknown'))
      }
    } catch {
      setPinError(t('staffClock.errors.server'))
    }
    setBusy(false)
  }

  const kassaLink = useMemo(() => kassaHref || `/shop/${tenantSlug}/admin/kassa`, [kassaHref, tenantSlug])

  const printSalesSummary = async () => {
    if (!summary) return
    const introLine = t('staffClock.summaryIntro').replace('{name}', summary.staffName)
    const printedLine = t('staffClock.summaryReceiptPrinted').replace(
      '{date}',
      new Date().toLocaleString(appLocaleToBcp47(locale), {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    )
    await printStaffSalesSummaryReceipt({
      savedPrinterIp: getSavedLanPrinterIp(tenantSlug),
      btwPercentage,
      business: receiptBusiness,
      labels: {
        docTitle: `${t('staffClock.summaryTitle')} — ${summary.staffName}`,
        heading: t('staffClock.summaryTitle'),
        introLine,
        totalLabel: t('staffClock.summaryTotalLabel'),
        orderCountLine: t('staffClock.summaryOrderCount').replace('{count}', String(summary.orderCount)),
        columnAmount: t('staffClock.summaryAmount'),
        noOrdersLine: t('staffClock.noOrdersToday'),
        printedLine,
      },
      total: summary.total,
      orders: summary.orders,
      staffName: summary.staffName,
      summaryHeading: t('staffClock.summaryTitle'),
      introLine,
      printedLine,
    })
  }

  useEffect(() => {
    void loadList()
  }, [loadList])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-gray-900">{t('staffClock.modalTitle')}</h2>
      <p className="mt-1 text-sm text-gray-600">{t('inklokkenPage.clockIntro')}</p>

      <div className="mt-5 space-y-4">
        {listLoading && staffList.length === 0 ? (
          <div className="py-10 text-center text-gray-500">{t('staffClock.loadingList')}</div>
        ) : staffList.length === 0 ? (
          <div className="py-10 text-center text-gray-500">{t('staffClock.noStaff')}</div>
        ) : (
          staffList.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-gray-200 bg-gray-50/80 p-4 sm:p-5 flex flex-col gap-4"
            >
              <div className="min-w-0 space-y-1">
                <p className="font-bold text-gray-900 text-base sm:text-lg break-words leading-snug">{s.name}</p>
                {s.hasOpenSession ? (
                  <p className="text-sm font-semibold text-emerald-600">{t('staffClock.statusClockedIn')}</p>
                ) : (
                  <p className="text-sm text-gray-500">{t('staffClock.statusClockedOut')}</p>
                )}
              </div>
              <div
                className={`grid w-full gap-3 ${showSalesButton ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}
              >
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setPinModal({ staffId: s.id, staffName: s.name, action: 'in' })
                    setPinInput('')
                    setPinError(null)
                  }}
                  className="min-h-[44px] touch-manipulation rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-50 [-webkit-tap-highlight-color:transparent]"
                >
                  {t('staffClock.clockInCode')}
                </button>
                <button
                  type="button"
                  disabled={busy || !s.hasOpenSession}
                  onClick={() => {
                    setPinModal({ staffId: s.id, staffName: s.name, action: 'out' })
                    setPinInput('')
                    setPinError(null)
                  }}
                  className="min-h-[44px] touch-manipulation rounded-xl bg-[#3C4D6B] px-4 py-3 text-sm font-bold text-white hover:bg-[#2D3A52] disabled:opacity-40 disabled:grayscale [-webkit-tap-highlight-color:transparent]"
                >
                  {t('staffClock.clockOutCode')}
                </button>
                {showSalesButton && (
                  <button
                    type="button"
                    disabled={!s.hasOpenSession}
                    onClick={() => {
                      if (onStartSales) onStartSales({ id: s.id, name: s.name })
                    }}
                    className="min-h-[44px] touch-manipulation rounded-xl bg-amber-500 px-4 py-3 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-40 disabled:grayscale [-webkit-tap-highlight-color:transparent]"
                    title={s.hasOpenSession ? t('staffClock.salesHint') : t('staffClock.salesNeedsClock')}
                  >
                    {t('staffClock.sales')}
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {!showSalesButton && (
        <p className="mt-4 text-center text-sm text-gray-500">
          <Link href={kassaLink} className="font-semibold text-blue-600 underline hover:text-blue-800">
            {t('inklokkenPage.goToKassaSales')}
          </Link>
        </p>
      )}

      {pinModal && (
        <div className="fixed inset-0 z-[120] flex touch-manipulation items-center justify-center bg-black/50 p-4 [-webkit-tap-highlight-color:transparent]">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl flex flex-col gap-3">
            <p className="font-bold text-gray-900">
              {(pinModal.action === 'in' ? t('staffClock.pinTitleIn') : t('staffClock.pinTitleOut')).replace(
                '{name}',
                pinModal.staffName
              )}
            </p>
            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 12))}
              placeholder={t('staffClock.pinPlaceholder')}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-lg font-mono tracking-widest"
            />
            {pinError && <p className="text-sm font-medium text-red-600">{pinError}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setPinModal(null)}
                className="flex-1 rounded-xl bg-gray-100 py-2.5 font-semibold text-gray-700"
              >
                {t('staffClock.cancel')}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void submitPin()}
                className="flex-1 rounded-xl bg-[#3C4D6B] py-2.5 font-bold text-white disabled:opacity-50"
              >
                {t('staffClock.confirmPin')}
              </button>
            </div>
          </div>
        </div>
      )}

      {summary && (
        <div className="fixed inset-0 z-[125] flex touch-manipulation items-center justify-center bg-black/50 p-4 [-webkit-tap-highlight-color:transparent]">
          <div className="flex max-h-[85vh] w-full max-w-md flex-col gap-4 overflow-hidden rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900">{t('staffClock.summaryTitle')}</h2>
            <p className="text-sm text-gray-600">{t('staffClock.summaryIntro').replace('{name}', summary.staffName)}</p>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-sm font-medium text-emerald-800">{t('staffClock.summaryTotalLabel')}</p>
              <p className="text-3xl font-black text-emerald-700">€{summary.total.toFixed(2)}</p>
              <p className="mt-1 text-xs text-emerald-700">
                {t('staffClock.summaryOrderCount').replace('{count}', String(summary.orderCount))}
              </p>
            </div>
            {summary.orders.length > 0 ? (
              <div className="max-h-48 flex-1 overflow-y-auto rounded-xl border border-gray-100">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-gray-50">
                    <tr>
                      <th className="p-2 text-left font-semibold text-gray-700">#</th>
                      <th className="p-2 text-right font-semibold text-gray-700">{t('staffClock.summaryAmount')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.orders.map((o) => (
                      <tr key={o.order_number} className="border-t border-gray-100">
                        <td className="p-2 font-mono">{o.order_number}</td>
                        <td className="p-2 text-right font-medium">€{o.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-2 text-center text-sm text-gray-500">{t('staffClock.noOrdersToday')}</p>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => void printSalesSummary()}
                className="flex-1 min-h-[44px] rounded-xl border-2 border-[#3C4D6B] bg-white py-3 font-bold text-[#3C4D6B] hover:bg-slate-50"
              >
                {t('staffClock.summaryPrint')}
              </button>
              <button
                type="button"
                onClick={() => setSummary(null)}
                className="flex-1 min-h-[44px] rounded-xl bg-[#3C4D6B] py-3 font-bold text-white hover:bg-[#2D3A52]"
              >
                {t('staffClock.summaryClose')}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => void loadList()}
        className="mt-4 w-full rounded-xl border border-gray-200 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
      >
        {t('inklokkenPage.refreshList')}
      </button>
    </div>
  )
}
