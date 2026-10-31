'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/i18n'
import { authFetch } from '@/lib/auth-headers'
import { getBelgiumDateString } from '@/lib/belgium-date-bounds'
import { staffSalesVisibleRange, type StaffSalesDayLine } from '@/lib/kassa-staff-sales-day'

type Props = {
  tenantSlug: string
  refreshToken: number
}

function euro(amount: number): string {
  return `€${amount.toFixed(2)}`
}

export function StaffSalesDayList({ tenantSlug, refreshToken }: Props) {
  const { t } = useLanguage()
  const today = getBelgiumDateString()
  const initialRange = staffSalesVisibleRange(today)
  const [date, setDate] = useState(today)
  const [minDate, setMinDate] = useState(initialRange.minYmd)
  const [maxDate, setMaxDate] = useState(initialRange.maxYmd)
  const [lines, setLines] = useState<StaffSalesDayLine[]>([])
  const [dayTotal, setDayTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setFailed(false)
      try {
        const params = new URLSearchParams({ tenant_slug: tenantSlug, date })
        const res = await authFetch(`/api/kassa/staff-sales?${params.toString()}`)
        const data = (await res.json()) as {
          ok?: boolean
          minDate?: string
          maxDate?: string
          lines?: StaffSalesDayLine[]
          dayTotal?: number
        }
        if (cancelled) return
        if (!res.ok || !data.ok || !data.lines) {
          setFailed(true)
          setLines([])
          setDayTotal(0)
          return
        }
        if (data.minDate) setMinDate(data.minDate)
        if (data.maxDate) setMaxDate(data.maxDate)
        setLines(data.lines)
        setDayTotal(Number(data.dayTotal) || 0)
      } catch {
        if (!cancelled) {
          setFailed(true)
          setLines([])
          setDayTotal(0)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [tenantSlug, date, refreshToken])

  return (
    <section className="mt-6 border-t border-gray-200 pt-5" data-testid="staff-sales-day-list">
      <h3 className="text-lg font-bold text-gray-900">{t('inklokkenPage.salesTitle')}</h3>
      <p className="mt-1 text-sm text-gray-500">{t('inklokkenPage.salesHint')}</p>
      <label className="mt-4 block text-sm font-medium text-gray-700">
        {t('inklokkenPage.salesDate')}
        <input
          type="date"
          min={minDate}
          max={maxDate}
          value={date}
          onChange={(event) => {
            const next = event.target.value
            if (next) setDate(next)
          }}
          className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-base text-gray-900"
        />
      </label>

      {loading ? (
        <p className="mt-4 text-sm text-gray-500">{t('staffClock.loadingList')}</p>
      ) : failed ? (
        <p className="mt-4 text-sm text-red-600">{t('inklokkenPage.salesLoadFail')}</p>
      ) : lines.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">{t('inklokkenPage.salesEmpty')}</p>
      ) : (
        <div className="mt-4 overflow-hidden rounded-xl border border-gray-200">
          <ul>
            {lines.map((line) => (
              <li
                key={line.staffId}
                className="flex items-center justify-between gap-3 border-b border-gray-100 px-3 py-3 last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">
                    {line.name || t('inklokkenPage.salesUnknownStaff')}
                  </p>
                  <p className="text-xs text-gray-500">
                    {t('staffClock.summaryOrderCount').replace('{count}', String(line.orderCount))}
                  </p>
                </div>
                <p className="shrink-0 text-base font-bold text-gray-900">{euro(line.total)}</p>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between gap-3 bg-gray-50 px-3 py-3">
            <p className="font-semibold text-gray-800">{t('inklokkenPage.salesDayTotal')}</p>
            <p className="font-black text-gray-900">{euro(dayTotal)}</p>
          </div>
        </div>
      )}
    </section>
  )
}
