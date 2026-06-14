import {
  isSwitchingAwayFromTable,
  kassaSidebarShowsOrderLinePanel,
  resolveTableSwitchCartAction,
  showParkedTableLinesInKassaSidebar,
} from '@/lib/kassa-table-park-flow'
import { FLOOR_PLAN_ZONE_INSIDE, FLOOR_PLAN_ZONE_TERRACE } from '@/lib/kassa-floor-plan-zone'

describe('kassa-table-park-flow (productie contract)', () => {
  describe('resolveTableSwitchCartAction', () => {
    it('producten eerst, dan tafel: mand blijft (geen park)', () => {
      expect(
        resolveTableSwitchCartAction({
          oldTable: '',
          newTable: '1',
          oldZone: FLOOR_PLAN_ZONE_INSIDE,
          newZone: FLOOR_PLAN_ZONE_INSIDE,
          cartLineCount: 3,
        }),
      ).toBe('keep_cart_mark_table_occupied')
    })

    it('tafel eerst, dan producten: geen auto-park bij tafel bevestigen', () => {
      expect(
        resolveTableSwitchCartAction({
          oldTable: '1',
          newTable: '1',
          oldZone: FLOOR_PLAN_ZONE_INSIDE,
          newZone: FLOOR_PLAN_ZONE_INSIDE,
          cartLineCount: 2,
        }),
      ).toBe('reveal_table_lines_in_sidebar')
    })

    it('wissel tafel met open mand: park op vorige tafel', () => {
      expect(
        resolveTableSwitchCartAction({
          oldTable: '1',
          newTable: '2',
          oldZone: FLOOR_PLAN_ZONE_INSIDE,
          newZone: FLOOR_PLAN_ZONE_INSIDE,
          cartLineCount: 1,
        }),
      ).toBe('park_cart_on_previous_table')
    })

    it('wissel zone met open mand: park op vorige slot', () => {
      expect(
        resolveTableSwitchCartAction({
          oldTable: '5',
          newTable: '5',
          oldZone: FLOOR_PLAN_ZONE_INSIDE,
          newZone: FLOOR_PLAN_ZONE_TERRACE,
          cartLineCount: 1,
        }),
      ).toBe('park_cart_on_previous_table')
    })
  })

  describe('sidebar visibility after park', () => {
    it('hides table lines when tableOrderLinesInSidebar is false', () => {
      expect(
        showParkedTableLinesInKassaSidebar({
          tableOrderLinesInSidebar: false,
          parkedLineCount: 5,
        }),
      ).toBe(false)
    })

    it('empty sidebar panel when cart empty and lines hidden', () => {
      expect(
        kassaSidebarShowsOrderLinePanel({
          cartLineCount: 0,
          showParkedTableLinesInSidebar: false,
        }),
      ).toBe(false)
    })
  })

  describe('isSwitchingAwayFromTable', () => {
    it('trimt tafelnummers', () => {
      expect(
        isSwitchingAwayFromTable('1', ' 1 ', FLOOR_PLAN_ZONE_INSIDE, FLOOR_PLAN_ZONE_INSIDE),
      ).toBe(false)
    })
  })
})
