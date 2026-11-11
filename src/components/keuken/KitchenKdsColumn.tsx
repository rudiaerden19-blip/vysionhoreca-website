'use client'

import { isWebshopOrder } from '@/lib/admin-api'
import { formatOrderScheduleDetail } from '@/lib/format-order-schedule'
import { adminDineInSeatAuditLine } from '@/lib/admin-order-display'
import {
  orderItemDisplayName,
  orderItemDisplayOptionLines,
} from '@/lib/order-items-display'
import {
  kassaOrderItemHeadingNames,
  kassaOrderItemKitchenLineNote,
} from '@/lib/kassa-cart-line-key'
import type { KitchenStyleOrder } from '@/components/shop-display/KitchenStyleOrderCard'
import type { KassaViewportProfileId } from '@/lib/kassa-viewport-profile-id'
import {
  kassaSpeelsGrayChromeButtonClass,
  kassaSpeelsGreenGlossButtonClass,
} from '@/lib/kassa-pos-surface'

const KDS_HEADER_BLUE = '#163a66'
const KDS_HEADER_RED = '#9b1c1c'

/** Standaard kds-kolom (17″ / groot scherm). */
export const KDS_COLUMN_WIDTH_PX = 400
/** Compacter op 15″ breedbeeld (1366×768). */
export const KDS_COLUMN_WIDTH_WIDE15_PX = 300
/** iPad 10″ landschap (~1080×810). */
export const KDS_COLUMN_WIDTH_IPAD10_PX = 285

export type KitchenKdsDensity = 'default' | 'wide15' | 'ipad10'

export function kdsColumnWidthPx(density: KitchenKdsDensity): number {
  if (density === 'wide15') return KDS_COLUMN_WIDTH_WIDE15_PX
  if (density === 'ipad10') return KDS_COLUMN_WIDTH_IPAD10_PX
  return KDS_COLUMN_WIDTH_PX
}

export function kitchenKdsDensityFromViewportProfileId(
  profileId: KassaViewportProfileId,
): KitchenKdsDensity {
  if (profileId === 'wide15') return 'wide15'
  if (profileId === 'ipad_10') return 'ipad10'
  return 'default'
}

/** Regel in de bon: index in `order.items`, zodat twee dezelfde producten apart afgevinkt worden. */
export function kitchenItemLineKey(index: number): string {
  return `i:${index}`
}

/** Groot tikvlak. Leeg vierkant, of een V zodra het product gemaakt is. */
export function KitchenItemMadeMark({
  made,
  label,
  onToggle,
  onDark = true,
  size = 'md',
}: {
  made: boolean
  label: string
  onToggle: () => void
  onDark?: boolean
  size?: 'sm' | 'md'
}) {
  const box = size === 'sm' ? 'h-7 w-7 text-lg' : 'h-9 w-9 text-2xl'
  return (
    <button
      type="button"
      aria-pressed={made}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation()
        onToggle()
      }}
      className={`flex shrink-0 items-center justify-center rounded-md border-2 font-black leading-none touch-manipulation ${box} ${
        made
          ? 'border-red-500 bg-red-600 text-white'
          : onDark
            ? 'border-white bg-white text-transparent'
            : 'border-zinc-900 bg-white text-transparent'
      }`}
    >
      V
    </button>
  )
}

type Props = {
  order: KitchenStyleOrder
  locale: string
  now: Date
  isNew?: boolean
  headerStatus: string
  onlineOrderLabel: string
  orderTypeLabel: (orderType: string) => string
  orderTypeLabelShort: (order: Pick<KitchenStyleOrder, 'order_type'>) => string
  printLabel: string
  readyLabel: string
  startLabel: string
  started?: boolean
  t: (key: string) => string
  onOpen: () => void
  onPrint: (e: React.MouseEvent) => void
  onReady: (e: React.MouseEvent) => void
  onStart: (e: React.MouseEvent) => void
  madeLineKeys?: ReadonlySet<string>
  madeLabel?: string
  onToggleMade?: (lineKey: string) => void
  bodyRef?: (el: HTMLDivElement | null) => void
  onBodyScroll?: () => void
  density?: KitchenKdsDensity
  /** Profiel-tokens (lab = device); overschrijft density-breedte. */
  columnWidthPx?: number
  compactTypography?: boolean
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
  isNew,
  headerStatus,
  onlineOrderLabel,
  orderTypeLabel,
  orderTypeLabelShort,
  printLabel,
  readyLabel,
  startLabel,
  started = false,
  t,
  onOpen,
  onPrint,
  onReady,
  onStart,
  madeLineKeys,
  madeLabel = '',
  onToggleMade,
  bodyRef,
  onBodyScroll,
  density = 'default',
  columnWidthPx,
  compactTypography,
}: Props) {
  const compact =
    compactTypography ?? (density === 'wide15' || density === 'ipad10')
  const colW = columnWidthPx ?? kdsColumnWidthPx(density)
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

  const tableNr =
    (order.order_type || '').toString().toUpperCase() === 'DINE_IN' &&
    order.table_number != null &&
    String(order.table_number).trim() !== ''
      ? String(order.table_number).trim()
      : null
  const headerColor = started ? KDS_HEADER_RED : KDS_HEADER_BLUE
  const headingNames = kassaOrderItemHeadingNames(order.items)
  const groups: { title: string; lines: { item: unknown; lineKey: string }[] }[] = []
  const items = order.items ?? []
  for (let index = 0; index < items.length; index++) {
    const item = items[index]
    const title = itemCategory(item)
    const line = { item, lineKey: kitchenItemLineKey(index) }
    const last = groups[groups.length - 1]
    if (last && last.title === title) last.lines.push(line)
    else groups.push({ title, lines: [line] })
  }

  return (
    <article
      className={`flex h-full shrink-0 flex-col border bg-transparent [touch-action:pan-x] ${
        isNew ? 'ring-2 ring-inset ring-sky-300' : ''
      }`}
      style={{ borderColor: headerColor, width: colW }}
    >
      <header
        className={`shrink-0 text-white ${compact ? 'px-2.5 py-2' : 'px-4 py-3'}`}
        style={{ backgroundColor: headerColor }}
      >
        <div className={`flex items-start justify-between ${compact ? 'gap-2' : 'gap-3'}`}>
          <button
            type="button"
            onClick={onOpen}
            className="min-w-0 text-left"
          >
            <span
              className={`block font-black leading-none tabular-nums ${compact ? 'text-3xl' : 'text-5xl'}`}
            >
              {order.order_number}
            </span>
            {tableNr ? (
              <span className={`mt-1 block font-black leading-none ${compact ? 'text-xl' : 'text-3xl'}`}>
                {t('kassaApp.tableWord')} {tableNr}
              </span>
            ) : null}
            <span
              className={`mt-1 block truncate font-bold uppercase tracking-wide text-white/90 ${
                compact ? 'text-sm' : 'text-lg'
              }`}
            >
              {headerStatus}
            </span>
          </button>
          <span
            className={`shrink-0 rounded bg-black/25 font-mono font-bold tabular-nums ${
              compact ? 'px-1.5 py-0.5 text-base' : 'px-2.5 py-1 text-2xl'
            }`}
          >
            {elapsed}
          </span>
        </div>
        <p className={`mt-1 truncate font-semibold text-white/95 ${compact ? 'text-sm' : 'text-xl'}`}>
          {typeLine}
          {dineInSeat ? ` · ${dineInSeat}` : ''}
        </p>
        {headingNames.map((name) => (
          <p
            key={name}
            className={`mt-1 font-black leading-tight text-white ${compact ? 'text-xl' : 'text-4xl'}`}
          >
            {name}
          </p>
        ))}
        <p className={`truncate font-medium text-white/90 ${compact ? 'text-sm' : 'text-xl'}`}>
          {order.customer_name}
        </p>
        {schedLine ? (
          <p className={`truncate text-white/80 ${compact ? 'text-xs' : 'text-lg'}`}>{schedLine}</p>
        ) : null}
      </header>

      <div
        ref={bodyRef}
        className={`min-h-0 flex-1 cursor-pointer overflow-y-auto overscroll-y-contain [touch-action:pan-x_pan-y] ${
          compact ? 'px-2.5 py-2' : 'px-4 py-3'
        }`}
        onClick={onOpen}
        onScroll={onBodyScroll}
      >
        {groups.map((group, gi) => (
          <div key={`${group.title}-${gi}`} className="mb-2">
            {group.title ? (
              <p
                className={`mb-1 font-bold uppercase tracking-wide text-sky-300 ${
                  compact ? 'text-sm' : 'text-lg'
                }`}
              >
                {group.title}
                <span className="ml-1 text-white/40">({group.lines.length})</span>
              </p>
            ) : null}
            <ul className="space-y-1.5">
              {group.lines.map(({ item, lineKey }) => {
                const label = orderItemDisplayName(item)
                const optLines = orderItemDisplayOptionLines(item)
                const qty = Number((item as { quantity?: unknown }).quantity) || 1
                const noteStr = kassaOrderItemKitchenLineNote(item) ?? ''
                const made = madeLineKeys?.has(lineKey) === true
                return (
                  <li
                    key={lineKey}
                    className={`leading-snug ${compact ? 'text-base' : 'text-2xl'} ${made ? 'text-red-500' : 'text-white'}`}
                  >
                    <div className={`flex items-start ${compact ? 'gap-2' : 'gap-3'}`}>
                      <p className="min-w-0 flex-1 font-semibold">
                        <span className={`tabular-nums ${made ? 'text-red-400' : 'text-white/80'}`}>{qty} x </span>
                        {label}
                      </p>
                      <KitchenItemMadeMark
                        made={made}
                        label={madeLabel}
                        onToggle={() => onToggleMade?.(lineKey)}
                        onDark
                        size={compact ? 'sm' : 'md'}
                      />
                    </div>
                    {optLines.map((line, j) => (
                      <p
                        key={j}
                        className={`pl-4 ${compact ? 'text-sm' : 'pl-5 text-xl'} ${made ? 'text-red-400' : 'text-white/70'}`}
                      >
                        {line}
                      </p>
                    ))}
                    {noteStr ? (
                      <p
                        className={`pl-4 ${compact ? 'text-sm' : 'pl-5 text-xl'} ${made ? 'text-red-300' : 'text-amber-200/90'}`}
                      >
                        {noteStr}
                      </p>
                    ) : null}
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
        {order.customer_notes ? (
          <p
            className={`mt-2 border-t border-white/10 pt-2 text-amber-100/90 ${
              compact ? 'text-sm' : 'mt-3 pt-3 text-xl'
            }`}
          >
            {order.customer_notes}
          </p>
        ) : null}
      </div>

      <footer
        className={`flex shrink-0 flex-col border-t border-black/40 bg-transparent ${
          compact ? 'gap-1.5 p-2' : 'gap-2 p-3'
        }`}
      >
        <button
          type="button"
          disabled={started}
          onClick={onStart}
          className={`${kassaSpeelsGrayChromeButtonClass()} w-full disabled:opacity-60 ${
            compact ? 'py-2 text-base' : 'py-3.5 text-2xl'
          }`}
        >
          <span>{startLabel}</span>
        </button>
        <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrint}
          className={`${kassaSpeelsGrayChromeButtonClass()} ${
            compact ? 'px-2.5 py-2 text-sm' : 'px-4 py-3.5 text-xl'
          }`}
        >
          {printLabel}
        </button>
        <button
          type="button"
          onClick={onReady}
          className={`${kassaSpeelsGreenGlossButtonClass(false)} flex-1 font-black uppercase tracking-wide ${
            compact ? 'min-h-[48px] text-base' : 'min-h-[64px] text-2xl'
          }`}
        >
          {readyLabel}
        </button>
        </div>
      </footer>
    </article>
  )
}
