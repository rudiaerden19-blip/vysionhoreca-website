'use client'

import { useLanguage } from '@/i18n'
import { StaffClockPinPortal } from '@/components/staff-clock/StaffClockPinPortal'

export type KassaStaffClockRow = { id: string; name: string; hasOpenSession: boolean }

export type KassaStaffPinState = { staffId: string; staffName: string; action: 'in' | 'out' }

export type KassaStaffSummaryState = {
  staffName: string
  total: number
  orderCount: number
  orders: { order_number: number; total: number }[]
}

/** Personeelsklok: lijst + gedeelde PIN-portal (document.body, focus, Enter = bevestigen). */
export function KassaStaffClockModal({
  open,
  listLoading,
  staffList,
  busy,
  pinModal,
  pinInput,
  pinError,
  onClose,
  onPinInputChange,
  onStartClockIn,
  onStartClockOut,
  onSales,
  onPinCancel,
  onPinConfirm,
}: {
  open: boolean
  listLoading: boolean
  staffList: KassaStaffClockRow[]
  busy: boolean
  pinModal: KassaStaffPinState | null
  pinInput: string
  pinError: string | null
  onClose: () => void
  onPinInputChange: (value: string) => void
  onStartClockIn: (row: KassaStaffClockRow) => void
  onStartClockOut: (row: KassaStaffClockRow) => void
  onSales: (row: KassaStaffClockRow) => void
  onPinCancel: () => void
  onPinConfirm: () => void
}) {
  const { t } = useLanguage()

  if (!open) return null

  const pinTitle =
    pinModal &&
    (pinModal.action === 'in' ? t('staffClock.pinTitleIn') : t('staffClock.pinTitleOut')).replace(
      '{name}',
      pinModal.staffName,
    )

  return (
    <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden z-[61]">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h2 className="font-bold text-xl text-gray-900">{t('staffClock.modalTitle')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl text-gray-500"
            aria-label={t('staffClock.close')}
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {listLoading && staffList.length === 0 ? (
            <div className="py-12 text-center text-gray-500">{t('staffClock.loadingList')}</div>
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onStartClockIn(s)}
                    className="min-h-[44px] py-3 px-4 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {t('staffClock.clockInCode')}
                  </button>
                  <button
                    type="button"
                    disabled={busy || !s.hasOpenSession}
                    onClick={() => onStartClockOut(s)}
                    className="min-h-[44px] py-3 px-4 rounded-xl bg-[#3C4D6B] text-white text-sm font-bold hover:bg-[#2D3A52] disabled:opacity-40 disabled:grayscale"
                  >
                    {t('staffClock.clockOutCode')}
                  </button>
                  <button
                    type="button"
                    disabled={!s.hasOpenSession}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSales(s)
                    }}
                    className="min-h-[44px] py-3 px-4 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 disabled:opacity-40 disabled:grayscale"
                    title={s.hasOpenSession ? t('staffClock.salesHint') : t('staffClock.salesNeedsClock')}
                  >
                    {t('staffClock.sales')}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="border-t border-gray-100 p-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] py-3 rounded-xl bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
          >
            {t('staffClock.close')}
          </button>
        </div>
      </div>

      <StaffClockPinPortal
        open={Boolean(pinModal)}
        titleId="kassa-staff-pin-title"
        title={pinTitle || ''}
        placeholder={t('staffClock.pinPlaceholder')}
        pinValue={pinInput}
        onPinChange={onPinInputChange}
        pinError={pinError}
        busy={busy}
        cancelLabel={t('staffClock.cancel')}
        confirmLabel={t('staffClock.confirmPin')}
        onCancel={onPinCancel}
        onConfirm={onPinConfirm}
      />
    </div>
  )
}

export function KassaStaffSalesSummaryModal({
  summary,
  onPrint,
  onClose,
}: {
  summary: KassaStaffSummaryState
  onPrint: () => void
  onClose: () => void
}) {
  const { t } = useLanguage()

  return (
    <div className="fixed inset-0 bg-black/60 z-[65] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 flex flex-col gap-4 max-h-[85vh] overflow-hidden">
        <h2 className="font-bold text-xl text-gray-900">{t('staffClock.summaryTitle')}</h2>
        <p className="text-gray-600 text-sm">{t('staffClock.summaryIntro').replace('{name}', summary.staffName)}</p>
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-center">
          <p className="text-sm text-emerald-800 font-medium">{t('staffClock.summaryTotalLabel')}</p>
          <p className="text-3xl font-black text-emerald-700">€{summary.total.toFixed(2)}</p>
          <p className="text-xs text-emerald-700 mt-1">
            {t('staffClock.summaryOrderCount').replace('{count}', String(summary.orderCount))}
          </p>
        </div>
        {summary.orders.length > 0 && (
          <div className="flex-1 overflow-y-auto border border-gray-100 rounded-xl max-h-48">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-semibold text-gray-700">#</th>
                  <th className="text-right p-2 font-semibold text-gray-700">{t('staffClock.summaryAmount')}</th>
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
        )}
        {summary.orders.length === 0 && (
          <p className="text-sm text-gray-500 text-center py-2">{t('staffClock.noOrdersToday')}</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onPrint}
            className="flex-1 min-h-[44px] py-3 rounded-xl border-2 border-[#3C4D6B] bg-white text-[#3C4D6B] font-bold hover:bg-slate-50"
          >
            {t('staffClock.summaryPrint')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] py-3 rounded-xl bg-[#3C4D6B] text-white font-bold hover:bg-[#2D3A52]"
          >
            {t('staffClock.summaryClose')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function KassaProductStaffGatePopup({ open, onDismiss }: { open: boolean; onDismiss: () => void }) {
  const { t } = useLanguage()
  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center bg-black/50 p-4"
      onClick={onDismiss}
      role="presentation"
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="product-staff-gate-title"
      >
        <p id="product-staff-gate-title" className="text-center text-base font-semibold leading-snug text-gray-900">
          {t('staffClock.productTapRequiresStaff')}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-5 w-full min-h-[48px] rounded-xl bg-[#3C4D6B] font-bold text-white transition-colors hover:bg-[#2D3A52]"
        >
          {t('staffClock.close')}
        </button>
      </div>
    </div>
  )
}
