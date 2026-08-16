'use client'

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { FloorPlanTable } from '@/lib/kassa-floor-plan-tables'
import { tableOrderMapKey, type FloorPlanZone } from '@/lib/kassa-floor-plan-zone'

const LONG_PRESS_MS = 450

type PickerStool = { segmentId: string; stoolNumber: string }

type SimpleCartLine = { product: { name: string }; quantity: number }

type Props = {
  zone: FloorPlanZone
  tables: FloorPlanTable[]
  stools: PickerStool[]
  tableOrders: Record<string, SimpleCartLine[]>
  activeTableNumber: string
  activeZone: FloorPlanZone
  onSelectTable: (tableNumber: string) => void
  onTransferTable: (fromTableNumber: string, toTableNumber: string) => void
  t: (key: string) => string
  ui: {
    tablePickerEmpty: string
  }
}

function lineCountFor(
  orders: Record<string, SimpleCartLine[]>,
  zone: FloorPlanZone,
  nr: string,
): number {
  return orders[tableOrderMapKey(zone, nr)]?.length ?? 0
}

export function KassaTablePickerGrid({
  zone,
  tables,
  stools,
  tableOrders,
  activeTableNumber,
  activeZone,
  onSelectTable,
  onTransferTable,
  t,
  ui,
}: Props) {
  const [dragFrom, setDragFrom] = useState<string | null>(null)
  const [dropOver, setDropOver] = useState<string | null>(null)
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragActiveRef = useRef(false)
  const suppressClickRef = useRef(false)
  const pointerIdRef = useRef<number | null>(null)

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  const finishDrag = useCallback(
    (clientX: number, clientY: number) => {
      const from = dragFrom
      setDragFrom(null)
      setDropOver(null)
      dragActiveRef.current = false
      pointerIdRef.current = null
      if (!from) return
      const targetEl = document.elementFromPoint(clientX, clientY)?.closest(
        '[data-kassa-table-nr]',
      ) as HTMLElement | null
      const to = targetEl?.getAttribute('data-kassa-table-nr')
      if (!to || to === from) return
      suppressClickRef.current = true
      onTransferTable(from, to)
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 120)
    },
    [dragFrom, onTransferTable],
  )

  const onTilePointerDown = (tableNr: string, canDragTile: boolean, e: ReactPointerEvent) => {
    if (e.button !== 0) return
    clearLongPress()
    pointerIdRef.current = e.pointerId
    if (!canDragTile) return
    const target = e.currentTarget
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null
      dragActiveRef.current = true
      setDragFrom(tableNr)
      try {
        target.setPointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }, LONG_PRESS_MS)
  }

  const onTilePointerMove = (e: ReactPointerEvent) => {
    if (!dragActiveRef.current || !dragFrom) return
    const over = document.elementFromPoint(e.clientX, e.clientY)?.closest(
      '[data-kassa-table-nr]',
    ) as HTMLElement | null
    const nr = over?.getAttribute('data-kassa-table-nr')
    setDropOver(nr && nr !== dragFrom ? nr : null)
  }

  const onTilePointerUp = (tableNr: string, e: ReactPointerEvent) => {
    clearLongPress()
    if (dragActiveRef.current) {
      e.preventDefault()
      finishDrag(e.clientX, e.clientY)
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      pointerIdRef.current = null
      return
    }
    if (suppressClickRef.current) {
      e.preventDefault()
      pointerIdRef.current = null
      return
    }
    if (pointerIdRef.current === e.pointerId) {
      onSelectTable(tableNr)
    }
    pointerIdRef.current = null
  }

  const onTilePointerCancel = () => {
    clearLongPress()
    setDragFrom(null)
    setDropOver(null)
    dragActiveRef.current = false
    pointerIdRef.current = null
  }

  const tableTileClass = (tbl: FloorPlanTable, nr: string) => {
    const isDrop = dropOver === nr
    const isDragging = dragFrom === nr
    const base = `relative touch-manipulation rounded-xl border-2 py-4 font-bold transition-colors active:brightness-95 select-none ${
      isDrop ? 'ring-2 ring-orange-400 ring-offset-2 scale-[1.02]' : ''
    } ${isDragging ? 'opacity-60 scale-95' : ''}`
    if (activeTableNumber === tbl.number && activeZone === zone) {
      return `${base} border-[#3C4D6B] bg-[#3C4D6B] text-white`
    }
    if (tbl.status === 'FREE') {
      return `${base} border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100`
    }
    if (tbl.status === 'UNPAID') {
      return `${base} border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100`
    }
    return `${base} border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100`
  }

  const stoolTileClass = (stoolNr: string, occupied: boolean) => {
    const isDrop = dropOver === stoolNr
    const isDragging = dragFrom === stoolNr
    const base = `relative touch-manipulation rounded-xl border-2 py-4 font-bold transition-colors active:brightness-95 select-none ${
      isDrop ? 'ring-2 ring-orange-400 ring-offset-2 scale-[1.02]' : ''
    } ${isDragging ? 'opacity-60 scale-95' : ''}`
    if (activeTableNumber === stoolNr && activeZone === zone) {
      return `${base} border-[#3C4D6B] bg-[#3C4D6B] text-white`
    }
    if (occupied) {
      return `${base} border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100`
    }
    return `${base} border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100`
  }

  return (
    <>
      <p className={`px-4 pt-3 text-center text-[0.65rem] sm:text-xs ${ui.tablePickerEmpty}`}>
        {t('kassaApp.tableTransferHoldDrag')}
      </p>
      {tables.length > 0 && (
        <div className="grid grid-cols-3 gap-3 p-4 pt-2 sm:grid-cols-4 md:grid-cols-5">
          {tables.map((tbl) => {
            const nr = String(tbl.number)
            const openLines = lineCountFor(tableOrders, zone, nr)
            const canDragTile = openLines > 0
            return (
              <button
                key={tbl.id}
                type="button"
                data-kassa-table-nr={nr}
                onPointerDown={(e) => onTilePointerDown(nr, canDragTile, e)}
                onPointerMove={onTilePointerMove}
                onPointerUp={(e) => onTilePointerUp(nr, e)}
                onPointerCancel={onTilePointerCancel}
                className={tableTileClass(tbl, nr)}
              >
                <div className="text-lg">{tbl.number}</div>
                <div className="text-[11px] opacity-70">
                  {tbl.status === 'FREE'
                    ? t('kassaApp.tableStatusFree')
                    : tbl.status === 'OCCUPIED'
                      ? t('kassaApp.tableStatusOccupied')
                      : t('kassaApp.tableStatusUnpaid')}
                </div>
                {openLines > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                    {openLines}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
      {stools.length > 0 && (
        <>
          <div className="flex items-center gap-2 border-t border-amber-100 bg-amber-50 px-4 py-2">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700">
              {t('kassaApp.stoolsSection')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 p-4 sm:grid-cols-4 md:grid-cols-5">
            {stools.map((s) => {
              const nr = String(s.stoolNumber)
              const openLines = lineCountFor(tableOrders, zone, nr)
              const canDragTile = openLines > 0
              return (
                <button
                  key={s.segmentId + s.stoolNumber}
                  type="button"
                  data-kassa-table-nr={nr}
                  onPointerDown={(e) => onTilePointerDown(nr, canDragTile, e)}
                  onPointerMove={onTilePointerMove}
                  onPointerUp={(e) => onTilePointerUp(nr, e)}
                  onPointerCancel={onTilePointerCancel}
                  className={stoolTileClass(nr, openLines > 0)}
                >
                  <div className="text-lg">{s.stoolNumber}</div>
                  <div className="text-[11px] opacity-70">
                    {openLines > 0
                      ? t('kassaApp.tableStatusOccupied')
                      : t('kassaApp.tableStatusFree')}
                  </div>
                  {openLines > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                      {openLines}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
