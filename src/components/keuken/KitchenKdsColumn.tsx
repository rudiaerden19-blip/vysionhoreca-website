'use client'

import { isWebshopOrder } from '@/lib/admin-api'
import { formatOrderScheduleDetail } from '@/lib/format-order-schedule'
import { adminDineInSeatAuditLine } from '@/lib/admin-order-display'
import {
  orderItemDisplayName,
  orderItemDisplayOptionLines,
} from '@/lib/order-items-display'
import type { KitchenStyleOrder } from '@/components/shop-display/KitchenStyleOrderCard'

type Props = {
  order: KitchenStyleOrder
  locale: string
  now: Date
  accent: string
  isNew?: boolean
  headerStatus: string
  onlineOrderLabel: string
  orderTypeLabel: (orderType: string) => string
  orderTypeLabelShort: (order: Pick<KitchenStyleOrder, 'order_type'>) => string
  printLabel: string
  readyLabel: string
  t: (key: string) => string
  onOpen: () => void
  onPrint: (e: React.MouseEvent) => void
  onReady: (e: React.MouseEvent) => void
}

function formatElapsed(createdAt: string, now: Date): string {
  const ms = Math.max(0, now.getTime() - new Date(createdAt).getTime())
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${mm}:${ss}`
}

function itemCategory(item: unknown): string {
  if (!item || typeof item !== 'object') return ''
  const o = item as Record<string, unknown>
  const direct = o.category_name ?? o.category
  if (typeof direct === 'string' && direct.trim()) return direct.trim()
  const nested = o.product
  if (nested && typeof nested === 'object') {
    const p = nested as Record<string, unknown>
    const c = p.category_name ?? p.category
    if (typeof c === 'string' && c.trim()) return c.trim()
  }
  return ''
}

/** Visuele keukenkolom. Acties blijven bij de aanroeper (klaar / print / open). */
export function KitchenKdsColumn({
  order,
  locale,
  now,
  accent,
  isNew,
  headerStatus,
  onlineOrderLabel,
  orderTypeLabel,
  orderTypeLabelShort,
  printLabel,
  readyLabel,
  t,
  onOpen,
  onPrint,
  onReady,
}: Props) {
  const elapsed = formatElapsed(order.created_at, now)
  const dineInSeat = adminDineInSeatAuditLine(order, t)
  const schedLine = isWebshopOrder(order)
    ? formatOrderScheduleDetail(
        { scheduled_date: order.scheduled_date, scheduled_time: order.scheduled_time },
        locale,
      )
    : null
  const typeLine = isWebshopOrder(order)
    ? `${onlineOrderLabel} · ${orderTypeLabel(order.order_type)}`
    : orderTypeLabelShort(order).trim()

  const groups: { title: string; items: unknown[] }[] = []
  for (const item of order.items ?? []) {
    const title = itemCategory(item)
    const last = groups[groups.length - 1]
    if (last && last.title === title) last.items.push(item)
    else groups.push({ title, items: [item] })
  }

  return (
    <article
      className={`flex h-full w-[232px] shrink-0 flex-col border-r border-black/50 bg-[#1c232c] sm:w-[248px] ${
        isNew ? 'ring-2 ring-inset ring-amber-300' : ''
      }`}
    >
      <header className="shrink-0 px-2.5 py-2 text-white" style={{ backgroundColor: accent }}>
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 text-left"
          >
            <span className="block text-2xl font-black leading-none tabular-nums">
              {order.order_number}
            </span>
            <span className="mt-1 block truncate text-[11px] font-semibold uppercase tracking-wide text-white/90">
              {headerStatus}
            </span>
          </button>
          <span className="shrink-0 rounded bg-black/25 px-1.5 py-0.5 font-mono text-sm font-bold tabular-nums">
            {elapsed}
          </span>
        </div>
        <p className="mt-1 truncate text-xs font-medium text-white/95">
          {typeLine}
          {dineInSeat ? ` · ${dineInSeat}` : ''}
        </p>
        <p className="truncate text-xs text-white/80">{order.customer_name}</p>
        {schedLine ? <p className="truncate text-[11px] text-white/80">{schedLine}</p> : null}
      </header>

      <div
        className="min-h-0 flex-1 cursor-pointer overflow-y-auto overscroll-y-contain px-2 py-2"
        onClick={onOpen}
      >
        {groups.map((group, gi) => (
          <div key={`${group.title}-${gi}`} className="mb-2">
            {group.title ? (
              <p className="mb-1 text-[11px] font-bold uppercase tracking-wide text-sky-300">
                {group.title}
                <span className="ml-1 text-white/40">({group.items.length})</span>
              </p>
            ) : null}
            <ul className="space-y-1.5">
              {group.items.map((item, i) => {
                const label = orderItemDisplayName(item)
                const optLines = orderItemDisplayOptionLines(item)
                const qty = Number((item as { quantity?: unknown }).quantity) || 1
                const noteRaw = (item as { notes?: unknown }).notes
                const noteStr = noteRaw != null && String(noteRaw).trim() !== '' ? String(noteRaw) : ''
                return (
                  <li key={i} className="text-sm leading-snug text-white">
                    <p className="font-semibold">
                      <span className="tabular-nums text-white/70">{qty} x </span>
                      {label}
                    </p>
                    {optLines.map((line, j) => (
                      <p key={j} className="pl-4 text-xs text-white/55">
                        {line}
                      </p>
                    ))}
                    {noteStr ? <p className="pl-4 text-xs text-amber-200/90">{noteStr}</p> : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {order.customer_notes ? (
          <p className="mt-2 border-t border-white/10 pt-2 text-xs text-amber-100/90">
            {order.customer_notes}
          </p>
        ) : null}
      </div>

      <footer className="flex shrink-0 gap-1.5 border-t border-black/40 bg-[#151a21] p-2">
        <button
          type="button"
          onClick={onPrint}
          className="rounded-md bg-[#2a3340] px-2 py-2 text-xs font-bold text-white/80"
        >
          {printLabel}
        </button>
        <button
          type="button"
          onClick={onReady}
          className="min-h-[40px] flex-1 rounded-md bg-[#1f9d55] text-sm font-black uppercase tracking-wide text-white"
        >
          {readyLabel}
        </button>
      </footer>
    </article>
  )
}
