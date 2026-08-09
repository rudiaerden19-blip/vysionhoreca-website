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
  KASSA_POS_BTN_SHAPE,
  KASSA_POS_MENU_RECESS_TRAY_CLASS,
  kassaPosButtonClass,
} from '@/lib/kassa-pos-surface'
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
  KASSA_DARK_CARD_SHELL,
  KASSA_DARK_CARD_HEAD,
  KASSA_DARK_MUTED,
  KASSA_DARK_NEW_RING,
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
  appearance?: 'light' | 'dark'
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
  appearance = 'light',
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
  const dark = appearance === 'dark'
  const cardShell = dark ? KASSA_DARK_CARD_SHELL : SHOP_DISPLAY_CARD_SHELL
  const cardHead = dark ? KASSA_DARK_CARD_HEAD : SHOP_DISPLAY_CARD_HEAD
  const newRing = dark ? KASSA_DARK_NEW_RING : SHOP_DISPLAY_NEW_CARD_RING
  const muted = dark ? KASSA_DARK_MUTED : SHOP_DISPLAY_MUTED
  const substrip = dark
    ? 'border-b border-white/10 bg-black/25 text-center text-sm font-medium text-white/90'
    : SHOP_DISPLAY_SUBSTRIP
  const recess = dark
    ? `${KASSA_POS_BTN_SHAPE} ${KASSA_POS_MENU_RECESS_TRAY_CLASS}`
    : `${SHOP_DISPLAY_BTN_SHAPE} ${SHOP_DISPLAY_RECESS}`
  const statusBadge = dark
    ? 'rounded-md border border-white/20 bg-white/10 px-2 py-1 text-xs font-semibold uppercase text-white'
    : SHOP_DISPLAY_STATUS_BADGE
  const itemDivider = dark ? 'border-b border-white/10 pb-2 last:border-0' : SHOP_DISPLAY_ITEM_ROW_DIVIDER
  const optionLine = dark ? 'border-l-2 border-white/25 pl-2 text-white/80' : SHOP_DISPLAY_OPTION_LINE
  const dineInStrip = dark
    ? 'border-b border-sky-500/30 bg-sky-950/40 px-3 py-1.5 text-center text-xs font-bold text-sky-200 sm:text-sm'
    : SHOP_DISPLAY_DINE_IN_STRIP
  const footer = dark ? 'border-t border-black/40 bg-black/20 p-3' : SHOP_DISPLAY_CARD_FOOTER
  const btn = dark ? `${kassaPosButtonClass(false)} touch-manipulation font-semibold text-[#f0f0f0]` : SHOP_DISPLAY_BTN
  const btnAccent = dark ? `${kassaPosButtonClass(true)} touch-manipulation font-bold` : SHOP_DISPLAY_BTN_ACCENT
  const nameClass = dark ? 'truncate font-semibold text-white' : 'truncate font-semibold text-gray-900'
  const itemNameClass = dark ? 'text-sm font-semibold leading-snug text-white' : 'text-sm font-semibold leading-snug text-gray-900'
  const noteLabelClass = dark ? 'mb-0.5 text-xs font-semibold uppercase tracking-wide text-white/50' : 'mb-0.5 text-xs font-semibold uppercase tracking-wide text-gray-500'
  const noteBodyClass = dark ? 'text-sm text-white/90' : 'text-sm text-gray-800'
  const itemNoteClass = dark ? 'mt-0.5 text-sm font-medium text-white/70' : 'mt-0.5 text-sm font-medium text-gray-600'
  const onlineTitleClass = dark ? 'text-sm font-bold text-white' : 'text-sm font-bold text-gray-900'
  const headText = dark ? 'text-lg font-bold tabular-nums text-white' : 'text-lg font-bold tabular-nums'

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
      className={`cursor-pointer overflow-hidden transition-all ${cardShell} ${
        isNew ? newRing : dark ? 'hover:brightness-[1.04]' : 'hover:shadow-lg'
      }`}
      onClick={onOpen}
    >
      <div className={`${cardHead} flex items-center justify-between px-4 py-2.5 ${dark ? 'text-white' : ''}`}>
        <span className={headText}>#{order.order_number}</span>
        <span className={`max-w-[55%] text-right text-xs font-semibold uppercase leading-tight tracking-wide ${statusBadge}`}>
          {headerStatus}
        </span>
      </div>

      {isWebshopOrder(order) ? (
        <div className={`px-3 py-2 ${substrip}`}>
          <div className={onlineTitleClass}>{onlineOrderLabel}</div>
          <div className={`mt-1 text-xs leading-snug sm:text-sm ${muted}`}>
            {orderTypeLabel(order.order_type)}
            {schedLine ? ` · ${schedLine}` : ''}
          </div>
        </div>
      ) : (
        <>
          <div className={substrip}>{orderTypeLabelShort(order)}</div>
          {dineInSeat && (
            <div className={dineInStrip}>
              {dineInSeat}
            </div>
          )}
          {(order.scheduled_date || order.scheduled_time) && (
            <div className={`px-3 py-2 text-sm font-medium ${substrip}`}>
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
          <span className={nameClass}>{order.customer_name}</span>
          <span className={`ml-2 shrink-0 text-xs tabular-nums ${muted}`}>{timeSince}</span>
        </div>

        <div
          className={`max-h-[min(20rem,48vh)] space-y-2 overflow-y-auto overscroll-y-contain px-2 py-1 [scrollbar-gutter:stable] ${recess}`}
        >
          {order.items?.map((item: unknown, i: number) => {
            const label = orderItemDisplayName(item)
            const optLines = orderItemDisplayOptionLines(item)
            const qty = Number((item as { quantity?: unknown }).quantity) || 1
            const noteRaw = (item as { notes?: unknown }).notes
            const noteStr = noteRaw != null && String(noteRaw).trim() !== '' ? String(noteRaw) : ''
            return (
              <div key={i} className={`flex items-start gap-3 ${itemDivider}`}>
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center text-sm font-bold ${btn} !py-0`}
                >
                  {qty}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={itemNameClass}>{label}</p>
                  {optLines.map((line, j) => (
                    <p
                      key={j}
                      className={`mt-0.5 text-sm font-medium ${optionLine}`}
                    >
                      + {line}
                    </p>
                  ))}
                  {noteStr ? (
                    <p className={itemNoteClass}>Opmerking: {noteStr}</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>

        {order.customer_notes && (
          <div className={`mt-3 p-2 ${recess}`}>
            <p className={noteLabelClass}>Opmerking</p>
            <p className={noteBodyClass}>{order.customer_notes}</p>
          </div>
        )}
      </div>

      <div className={`flex gap-2 ${footer}`}>
        <button type="button" onClick={onPrint} className={`flex-1 ${btn}`}>
          {printLabel}
        </button>
        <button type="button" onClick={onReady} className={`flex-1 ${btnAccent}`}>
          {readyLabel}
        </button>
      </div>
    </motion.div>
  )
}
