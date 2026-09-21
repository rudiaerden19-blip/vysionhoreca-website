'use client'

import { useMemo, useState } from 'react'
import { authFetch } from '@/lib/auth-headers'
import { useLanguage } from '@/i18n'
import type { Order } from '@/lib/admin-api-order-helpers'
import {
  canonicalKassaCashCardMethod,
  orderAllowsKassaCashCardCorrection,
  type KassaCashCardMethod,
} from '@/lib/z-report-correct-payment'

function brusselsClock(iso?: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleTimeString('nl-BE', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Brussels',
    })
  } catch {
    return '—'
  }
}

function euro(n: number): string {
  return `€${n.toFixed(2).replace('.', ',')}`
}

export default function ZReportChangePaymentPanel({
  tenantSlug,
  orders,
  onCorrected,
}: {
  tenantSlug: string
  orders: Order[]
  onCorrected: () => void
}) {
  const { t } = useLanguage()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState<{
    id: string
    number: string
    total: number
    from: KassaCashCardMethod
    to: KassaCashCardMethod
  } | null>(null)

  const rows = useMemo(
    () =>
      [...orders].sort(
        (a, b) => String(a.created_at || '').localeCompare(String(b.created_at || '')),
      ),
    [orders],
  )

  if (rows.length === 0) return null

  const labelFor = (method: string | null | undefined) => {
    const canon = canonicalKassaCashCardMethod(method)
    if (canon === 'CASH') return t('zReport.cashPaid')
    if (canon === 'CARD') return t('zReport.cardPaid')
    return t('zReport.payOther')
  }

  const openModal = (order: Order) => {
    const from = canonicalKassaCashCardMethod(order.payment_method)
    if (!order.id || !from) return
    setError('')
    setModal({
      id: order.id,
      number: String(order.order_number ?? '—'),
      total: Number(order.total) || 0,
      from,
      to: from === 'CARD' ? 'CASH' : 'CARD',
    })
  }

  const confirm = async () => {
    if (!modal) return
    setBusyId(modal.id)
    setError('')
    try {
      const res = await authFetch('/api/admin/z-report/correct-payment', {
        method: 'POST',
        body: JSON.stringify({
          tenantSlug,
          orderId: modal.id,
          toMethod: modal.to,
        }),
      })
      const json = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        setError(json.error || t('zReport.changePaymentError'))
        return
      }
      setModal(null)
      onCorrected()
    } catch {
      setError(t('zReport.changePaymentError'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden print:hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900">{t('zReport.receiptsToday')}</h3>
        <p className="text-sm text-gray-500 mt-1">{t('zReport.changePaymentHint')}</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-600">
              <th className="px-4 py-2 font-medium">{t('zReport.receiptCol')}</th>
              <th className="px-4 py-2 font-medium">{t('zReport.timeCol')}</th>
              <th className="px-4 py-2 font-medium text-right">{t('zReport.amountCol')}</th>
              <th className="px-4 py-2 font-medium">{t('zReport.paymentCol')}</th>
              <th className="px-4 py-2 font-medium text-right">{t('zReport.actionCol')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => {
              const can = orderAllowsKassaCashCardCorrection(order)
              const canon = canonicalKassaCashCardMethod(order.payment_method)
              return (
                <tr key={order.id || String(order.order_number)} className="border-t border-gray-100">
                  <td className="px-4 py-2.5 font-medium tabular-nums">{order.order_number ?? '—'}</td>
                  <td className="px-4 py-2.5 text-gray-600">{brusselsClock(order.created_at)}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums">{euro(Number(order.total) || 0)}</td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        canon === 'CASH'
                          ? 'bg-emerald-100 text-emerald-800'
                          : canon === 'CARD'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {labelFor(order.payment_method)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {can ? (
                      <button
                        type="button"
                        onClick={() => openModal(order)}
                        disabled={busyId === order.id}
                        className="text-sm font-semibold text-blue-700 hover:text-blue-900 disabled:opacity-50"
                      >
                        {t('zReport.changePayment')}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h4 className="text-lg font-bold text-gray-900">
              {t('zReport.changePaymentTitle')} · {t('zReport.receiptCol')} {modal.number}
            </h4>
            <p className="mt-1 text-sm text-gray-600">
              {t('zReport.changePaymentNow')}: {labelFor(modal.from)} · {euro(modal.total)}
            </p>
            <p className="mt-4 text-sm font-medium text-gray-800">{t('zReport.changePaymentChoose')}</p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(['CARD', 'CASH'] as const).map((method) => {
                const selected = modal.to === method
                return (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setModal({ ...modal, to: method })}
                    className={`rounded-xl border-2 px-3 py-3 text-sm font-semibold ${
                      selected
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 bg-white text-gray-800'
                    }`}
                  >
                    {method === 'CASH' ? t('zReport.changePaymentCash') : t('zReport.changePaymentCard')}
                    {modal.from === method ? ` ${t('zReport.changePaymentCurrent')}` : ''}
                  </button>
                )
              })}
            </div>
            <p className="mt-3 text-xs text-gray-500">{t('zReport.changePaymentHint')}</p>
            {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setModal(null)
                  setError('')
                }}
                className="rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-semibold text-gray-800"
              >
                {t('zReport.changePaymentCancel')}
              </button>
              <button
                type="button"
                onClick={() => void confirm()}
                disabled={busyId === modal.id || modal.to === modal.from}
                className="rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white disabled:bg-gray-300"
              >
                {t('zReport.changePaymentConfirm')}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
