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
  SHOP_DISPLAY_CARD_FOOTER,
  SHOP_DISPLAY_CARD_HEAD,
  SHOP_DISPLAY_CARD_SHELL,
  SHOP_DISPLAY_BTN_SHAPE,
  SHOP_DISPLAY_DINE_IN_STRIP,
  SHOP_DISPLAY_ITEM_ROW_DIVIDER,
  SHOP_DISPLAY_MUTED,
  SHOP_DISPLAY_NEW_CARD_RING,
  SHOP_DISPLAY_OPTION_LINE,
  SHOP_DISPLAY_RECESS,
  SHOP_DISPLAY_STATUS_BADGE,
  SHOP_DISPLAY_BTN,
  SHOP_DISPLAY_BTN_ACCENT,
  SHOP_DISPLAY_SUBSTRIP,
} from '@/lib/shop-display-surface'

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
      className={`cursor-pointer overflow-hidden transition-all ${SHOP_DISPLAY_CARD_SHELL} ${
        isNew ? SHOP_DISPLAY_NEW_CARD_RING : 'hover:shadow-lg'
      }`}
      onClick={onOpen}
    >
      <div className={`${SHOP_DISPLAY_CARD_HEAD} flex items-center justify-between px-4 py-2.5`}>
        <span className="text-lg font-bold tabular-nums">#{order.order_number}</span>
        <span className={`max-w-[55%] text-right text-xs font-semibold uppercase leading-tight tracking-wide ${SHOP_DISPLAY_STATUS_BADGE}`}>
          {headerStatus}
        </span>
      </div>

      {isWebshopOrder(order) ? (
        <div className={`px-3 py-2 ${SHOP_DISPLAY_SUBSTRIP}`}>
          <div className="text-sm font-bold text-gray-900">{onlineOrderLabel}</div>
          <div className={`mt-1 text-xs leading-snug sm:text-sm ${SHOP_DISPLAY_MUTED}`}>
            {orderTypeLabel(order.order_type)}
            {schedLine ? ` · ${schedLine}` : ''}
          </div>
        </div>
      ) : (
        <>
          <div className={SHOP_DISPLAY_SUBSTRIP}>{orderTypeLabelShort(order)}</div>
          {dineInSeat && (
            <div className={SHOP_DISPLAY_DINE_IN_STRIP}>
              {dineInSeat}
            </div>
          )}
          {(order.scheduled_date || order.scheduled_time) && (
            <div className={`px-3 py-2 text-sm font-medium ${SHOP_DISPLAY_SUBSTRIP}`}>
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
          <span className="truncate font-semibold text-gray-900">{order.customer_name}</span>
          <span className={`ml-2 shrink-0 text-xs tabular-nums ${SHOP_DISPLAY_MUTED}`}>{timeSince}</span>
        </div>

        <div
          className={`max-h-[min(20rem,48vh)] space-y-2 overflow-y-auto overscroll-y-contain px-2 py-1 [scrollbar-gutter:stable] ${SHOP_DISPLAY_BTN_SHAPE} ${SHOP_DISPLAY_RECESS}`}
        >
          {order.items?.map((item: unknown, i: number) => {
            const label = orderItemDisplayName(item)
            const optLines = orderItemDisplayOptionLines(item)
            const qty = Number((item as { quantity?: unknown }).quantity) || 1
            const noteRaw = (item as { notes?: unknown }).notes
            const noteStr = noteRaw != null && String(noteRaw).trim() !== '' ? String(noteRaw) : ''
            return (
              <div key={i} className={`flex items-start gap-3 ${SHOP_DISPLAY_ITEM_ROW_DIVIDER}`}>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center text-sm font-bold ${SHOP_DISPLAY_BTN} !py-0`}
                >
                  {qty}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug text-gray-900">{label}</p>
                  {optLines.map((line, j) => (
                    <p
                      key={j}
                      className={`mt-0.5 text-sm font-medium ${SHOP_DISPLAY_OPTION_LINE}`}
                    >
                      + {line}
                    </p>
                  ))}
                  {noteStr ? (
                    <p className="mt-0.5 text-sm font-medium text-gray-600">Opmerking: {noteStr}</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        {order.customer_notes && (
          <div className={`mt-3 p-2 ${SHOP_DISPLAY_BTN_SHAPE} ${SHOP_DISPLAY_RECESS}`}>
            <p className="mb-0.5 text-xs font-semibold uppercase tracking-wide text-gray-500">Opmerking</p>
            <p className="text-sm text-gray-800">{order.customer_notes}</p>
          </div>
        )}
      </div>

      <div className={`flex gap-2 ${SHOP_DISPLAY_CARD_FOOTER}`}>
        <button type="button" onClick={onPrint} className={`flex-1 ${SHOP_DISPLAY_BTN}`}>
          {printLabel}
        </button>
        <button type="button" onClick={onReady} className={`flex-1 ${SHOP_DISPLAY_BTN_ACCENT}`}>
          {readyLabel}
        </button>
      </div>
    </motion.div>
  )
}
