'use client'

import { useLanguage } from '@/i18n'
import {
  KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
  kassaPosButtonClass,
} from '@/lib/kassa-pos-surface'

export type KassaStaffSalesPickRow = { id: string; name: string; hasOpenSession: boolean }

/** Verkoop-knop: alleen ingeklokte namen — geen in-/uitklok. */
export function KassaStaffSalesPickModal({
  open,
  listLoading,
  staffList,
  busy,
  onClose,
  onPickStaff,
}: {
  open: boolean
  listLoading: boolean
  staffList: KassaStaffSalesPickRow[]
  busy: boolean
  onClose: () => void
  onPickStaff: (row: KassaStaffSalesPickRow) => void
}) {
  const { t } = useLanguage()
  if (!open) return null

  const clockedIn = staffList.filter((s) => s.hasOpenSession)

  return (
    <div
      className="fixed inset-0 z-[62] flex items-center justify-center bg-black/60 p-3 sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden rounded-2xl border border-black text-white shadow-2xl ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="kassa-staff-sales-pick-title"
        data-testid="kassa-staff-sales-pick"
      >
        <div className="flex items-center justify-between gap-3 border-b border-black/40 px-5 py-4">
          <h2 id="kassa-staff-sales-pick-title" className="font-bold text-xl text-white">
            {t('staffClock.salesPickTitle')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-white/80 hover:bg-white/10"
            aria-label={t('staffClock.close')}
          >
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-3 overflow-y-auto p-5">
          {listLoading && staffList.length === 0 ? (
            <div className="py-12 text-center text-white/80">{t('staffClock.loadingList')}</div>
          ) : clockedIn.length === 0 ? (
            <div className="py-10 text-center text-sm font-medium text-white/85">
              {t('staffClock.salesPickNoClockedIn')}
            </div>
          ) : (
            clockedIn.map((s) => (
              <button
                key={s.id}
                type="button"
                disabled={busy}
                onClick={() => onPickStaff(s)}
                className={`w-full min-h-[52px] break-words px-4 py-3 text-left text-base font-bold ${kassaPosButtonClass(false)}`}
              >
                {s.name}
              </button>
            ))
          )}
        </div>
        <div className="border-t border-black/40 p-4">
          <button
            type="button"
            onClick={onClose}
            className={`w-full min-h-[44px] font-bold ${kassaPosButtonClass(false)}`}
          >
            {t('staffClock.close')}
          </button>
        </div>
      </div>
    </div>
  )
}
