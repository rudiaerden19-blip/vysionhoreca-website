/**
 * Labels voor admin bestellijst / modal — POS vs webshop en dine-in zaal (audit).
 */

import type { Order } from '@/lib/admin-api-order-helpers'
import { isWebshopOrder } from '@/lib/admin-api-order-helpers'
import {
  FLOOR_PLAN_ZONE_TERRACE,
  normalizeFloorPlanZone,
} from '@/lib/kassa-floor-plan-zone'

type Trans = (key: string) => string

/** Kassa-POS kanaal (niet webshop). */
export function adminPosChannelBadgeLabel(order: Pick<Order, 'order_type'>, t: Trans): string {
  const ot = (order.order_type || '').toString()
  if (ot === 'DINE_IN') return ` ${t('ordersPage.kassaChannelDineIn')}`
  if (ot === 'TAKEAWAY') return ` ${t('ordersPage.kassaChannelTakeaway')}`
  if (ot === 'DELIVERY') return ` ${t('ordersPage.kassaChannelDelivery')}`
  return ` ${t('ordersPage.orderType.delivery')}`
}

export function adminWebshopChannelBadgeLabel(order: Pick<Order, 'order_type'>, t: Trans): string {
  const ot = (order.order_type || '').toString()
  if (ot === 'pickup' || ot === 'PICKUP') return ` ${t('ordersPage.orderType.pickup')}`
  return ` ${t('ordersPage.orderType.delivery')}`
}

/** Tafel + binnen/terras voor geaudit POS dine-in (floor_plan_zone + table_number). */
export function adminDineInSeatAuditLine(
  order: Pick<Order, 'order_type'> & { table_number?: unknown; floor_plan_zone?: unknown },
  t: Trans,
): string | null {
  if ((order.order_type || '').toString() !== 'DINE_IN') return null
  const tn = order.table_number
  if (tn == null || String(tn).trim() === '') return null
  const zone = normalizeFloorPlanZone(
    order.floor_plan_zone == null ? undefined : String(order.floor_plan_zone),
  )
  const zoneLabel =
    zone === FLOOR_PLAN_ZONE_TERRACE ? t('kassaApp.floorZoneTerrace') : t('kassaApp.floorZoneInside')
  return t('ordersPage.dineInSeatDetail')
    .replace('{tableWord}', t('kassaApp.tableWord'))
    .replace('{number}', String(tn))
    .replace('{zone}', zoneLabel)
}

/** Vaste NL-regel voor keuken/browser-bonnen (monospace, traditioneel BE). */
export function dineInSeatLineNl(
  orderType: string | null | undefined,
  tableNumber: unknown,
  floorPlanZone: unknown,
): string {
  if ((orderType || '').toString() !== 'DINE_IN') return ''
  if (tableNumber == null || String(tableNumber).trim() === '') return ''
  const zone = normalizeFloorPlanZone(
    floorPlanZone == null ? undefined : String(floorPlanZone),
  )
  const zlab = zone === FLOOR_PLAN_ZONE_TERRACE ? 'Terras': 'Binnen'
  return `Tafel ${tableNumber} · ${zlab}`
}

/** Tailwind voor order-type badge (lijst + modal). */
export function adminOrderChannelBadgeClass(order: Order): string {
  if (isWebshopOrder(order)) return 'bg-slate-100 text-slate-800'
  const ot = (order.order_type || '').toString()
  if (ot === 'DINE_IN') return 'bg-gray-100 text-gray-700'
  if (ot === 'TAKEAWAY') return 'bg-amber-100 text-amber-700'
  if (ot === 'DELIVERY') return 'bg-purple-100 text-purple-700'
  if (ot === 'pickup' || ot === 'PICKUP') return 'bg-blue-100 text-blue-700'
  return 'bg-purple-100 text-purple-700'
}
