'use client'

import { motion } from 'framer-motion'
import { isWebshopOrder } from '@/lib/admin-api'
import { formatOrderScheduleDetail } from '@/lib/format-order-schedule'
import { adminDineInSeatAuditLine } from '@/lib/admin-order-display'
import {
  orderItemDisplayName,
  orderItemDisplayOptionLines,
} from '@/lib/order-items-display'
import {
  KASSA_POS_MENU_RECESS_TRAY_CLASS,
  KASSA_POS_BTN_SHAPE,
  kassaPosButtonClass,
} from '@/lib/kassa-pos-surface'

export const KITCHEN_POS_BTN = `${kassaPosButtonClass(false)} touch-manipulation font-semibold text-[#f0f0f0]`
export const KITCHEN_POS_BTN_ACCENT = `${kassaPosButtonClass(true)} touch-manipulation font-bold`
export const KITCHEN_CARD_SHELL = `${KASSA_POS_BTN_SHAPE} border border-[#2a2a2a] ${KASSA_POS_MENU_RECESS_TRAY_CLASS} text-[#f0f0f0]`
export const KITCHEN_CARD_HEAD =
  'border-b border-black/40 bg-[linear-gradient(180deg,#1c1c1c_0%,#101010_48%,#060606_100%)]'
export const KITCHEN_MUTED = 'text-white/70'
export const KITCHEN_SUBSTRIP =
  'border-b border-white/10 bg-black/25 text-center text-sm font-medium text-white/90'

export type KitchenStyleOrder = {
  id: string
  order_number: string
  customer_name: string
  order_type: string
  status: string
  items?: unknown[]
  customer_notes?: string
  created_at: string
  scheduled_date?: string
  scheduled_time?: string
  table_number?: string | number | null
  floor_plan_zone?: string | null
}

type Props = {
  order: KitchenStyleOrder
  locale: string
  isNew?: boolean
  headerStatus: string
  onlineOrderLabel: string
  orderTypeLabel: (orderType: string) => string
  orderTypeLabelShort: (order: Pick<KitchenStyleOrder, 'order_type' | 'scheduled_date' | 'scheduled_time' | 'table_number' | 'floor_plan_zone'>) => string
  timeSince: string
  printLabel: string
  readyLabel: string
  t: (key: string) => string
  onOpen: () => void
  onPrint: (e: React.MouseEvent) => void
  onReady: (e: React.MouseEvent) => void
}

export function KitchenStyleOrderCard({
  order,
  locale,
  isNew,
  headerStatus,
  onlineOrderLabel,
  orderTypeLabel,
  orderTypeLabelShort,
  timeSince,
  printLabel,
  readyLabel,
  t,
  onOpen,
  onPrint,
  onReady,
}: Props) {
  const schedLine = isWebshopOrder(order)
    ? formatOrderScheduleDetail(
        { scheduled_date: order.scheduled_date, scheduled_time: order.scheduled_time },
        locale,
      )
    : null
  const dineInSeat = adminDineInSeatAuditLine(order, t)

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`cursor-pointer overflow-hidden transition-all ${KITCHEN_CARD_SHELL} ${
        isNew
          ? 'shadow-[0_0_0_2px_rgba(90,159,212,0.75),0_8px_24px_rgba(0,0,0,0.45)]'
          : 'hover:brightness-[1.04]'
      }`}
      onClick={onOpen}
    >
      <div className={`${KITCHEN_CARD_HEAD} flex items-center justify-between px-4 py-2.5 text-white`}>
        <span className="text-lg font-bold tabular-nums">#{order.order_number}</span>
        <span
          className={`max-w-[55%] text-right text-xs font-semibold uppercase leading-tight tracking-wide ${KITCHEN_POS_BTN} border border-white/25 px-2 py-1`}
        >
          {headerStatus}
        </span>
      </div>

      {isWebshopOrder(order) ? (
        <div className={`px-3 py-2 ${KITCHEN_SUBSTRIP}`}>
          <div className="text-sm font-bold text-white">{onlineOrderLabel}</div>
          <div className={`mt-1 text-xs leading-snug sm:text-sm ${KITCHEN_MUTED}`}>
            {orderTypeLabel(order.order_type)}
            {schedLine ? ` · ${schedLine}` : ''}
          </div>
        </div>
      ) : (
        <>
          <div className={KITCHEN_SUBSTRIP}>{orderTypeLabelShort(order)}</div>
          {dineInSeat && (
            <div className="border-b border-[#5a9fd4]/30 bg-[#5a9fd4]/10 px-3 py-1.5 text-center text-xs font-bold text-[#b8d4ef] sm:text-sm">
              {dineInSeat}
            </div>
          )}
          {(order.scheduled_date || order.scheduled_time) && (
            <div className={`px-3 py-2 text-sm font-medium ${KITCHEN_SUBSTRIP}`}>
              {order.scheduled_date
                ? new Date(order.scheduled_date).toLocaleDateString('nl-BE', {
                    day: '2-digit',
                    month: '2-digit',
                  })
                : ''}
              {order.scheduled_time ? ` om ${order.scheduled_time}` : ''}
            </div>
          )}
        </>
      )}

      <div className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="truncate font-semibold">{order.customer_name}</span>
          <span className={`ml-2 shrink-0 text-xs tabular-nums ${KITCHEN_MUTED}`}>{timeSince}</span>
        </div>

        <div
          className={`max-h-[min(20rem,48vh)] space-y-2 overflow-y-auto overscroll-y-contain px-2 py-1 [scrollbar-gutter:stable] ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_RECESS_TRAY_CLASS}`}
        >
          {order.items?.map((item: unknown, i: number) => {
            const label = orderItemDisplayName(item)
            const optLines = orderItemDisplayOptionLines(item)
            const qty = Number((item as { quantity?: unknown }).quantity) || 1
            const noteRaw = (item as { notes?: unknown }).notes
            const noteStr = noteRaw != null && String(noteRaw).trim() !== '' ? String(noteRaw) : ''
            return (
              <div key={i} className="flex items-start gap-3 border-b border-white/10 pb-2 last:border-0">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center text-sm font-bold ${KITCHEN_POS_BTN}`}
                >
                  {qty}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-white">{label}</p>
                  {optLines.map((line, j) => (
                    <p
                      key={j}
                      className="mt-0.5 border-l-2 border-white/20 pl-2 text-sm font-medium text-white/85"
                    >
                      + {line}
                    </p>
                  ))}
                  {noteStr ? (
                    <p className="mt-0.5 text-sm font-medium text-white/75">Opmerking: {noteStr}</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        {order.customer_notes && (
          <div className={`mt-3 p-2 ${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_RECESS_TRAY_CLASS}`}>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-white/60">Opmerking</p>
            <p className="text-sm text-white/90">{order.customer_notes}</p>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-black/40 bg-black/20 p-3">
        <button type="button" onClick={onPrint} className={`flex-1 py-3 ${KITCHEN_POS_BTN}`}>
          {printLabel}
        </button>
        <button type="button" onClick={onReady} className={`flex-1 py-3 ${KITCHEN_POS_BTN_ACCENT}`}>
          {readyLabel}
        </button>
      </div>
    </motion.div>
  )
}
