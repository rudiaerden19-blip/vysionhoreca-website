/**
 * Productie-kassa: tafel parkeren + sidebar-mand — contract voor alle tenants.
 * Wijzigingen hier + bijbehorende tests zijn verplicht vóór elke kassa-flow aanpassing.
 * Zie `.cursor/rules/kassa-park-to-table-sacred.mdc`
 */

import type { FloorPlanZone } from '@/lib/kassa-floor-plan-zone'

export function normalizeKassaTableNumber(raw: string): string {
  return String(raw).trim()
}

/** Andere tafel of andere zone (inside ↔ terrace). */
export function isSwitchingAwayFromTable(
  oldTable: string,
  newTable: string,
  oldZone: FloorPlanZone,
  newZone: FloorPlanZone,
): boolean {
  const oldT = normalizeKassaTableNumber(oldTable)
  const newT = normalizeKassaTableNumber(newTable)
  return !!oldT && (oldT !== newT || oldZone !== newZone)
}

/** Wat doen met de mand bij tafelkeuze (niet bij «Voeg toe aan tafel»-knoppen). */
export type TableSwitchCartAction =
  | 'park_cart_on_previous_table'
  | 'keep_cart_mark_table_occupied'
  | 'reveal_table_lines_in_sidebar'
  | 'noop'

export function resolveTableSwitchCartAction(input: {
  oldTable: string
  newTable: string
  oldZone: FloorPlanZone
  newZone: FloorPlanZone
  cartLineCount: number
}): TableSwitchCartAction {
  const newT = normalizeKassaTableNumber(input.newTable)
  if (!newT) return 'noop'

  const switchingAway = isSwitchingAwayFromTable(
    input.oldTable,
    input.newTable,
    input.oldZone,
    input.newZone,
  )
  const oldT = normalizeKassaTableNumber(input.oldTable)
  const cartHasLines = input.cartLineCount > 0

  if (switchingAway && cartHasLines) {
    return 'park_cart_on_previous_table'
  }
  if (!oldT && cartHasLines) {
    return 'keep_cart_mark_table_occupied'
  }
  return 'reveal_table_lines_in_sidebar'
}

/** Sidebar: tafelregels na «Voeg toe aan tafel» verborgen tot opnieuw tafel kiezen / nieuwe ronde. */
export function showParkedTableLinesInKassaSidebar(input: {
  tableOrderLinesInSidebar: boolean
  parkedLineCount: number
}): boolean {
  return input.tableOrderLinesInSidebar && input.parkedLineCount > 0
}

/** Sidebar-lijst: alleen mand-regels en/of zichtbare tafelregels — totaal gebruikt billLines apart. */
export function kassaSidebarShowsOrderLinePanel(input: {
  cartLineCount: number
  showParkedTableLinesInSidebar: boolean
}): boolean {
  return input.cartLineCount > 0 || input.showParkedTableLinesInSidebar
}
