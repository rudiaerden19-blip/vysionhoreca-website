import type { CSSProperties } from 'react'
import { FLOOR_PLAN_ZONE_TERRACE, type FloorPlanZone } from '@/lib/kassa-floor-plan-zone'
import { KASSA_FLOOR_TERRACE_GRAIN_CLASS, KASSA_POS_MENU_PLATE_SHELL_BG_CLASS } from '@/lib/kassa-pos-surface'

/** Korrel/tegel op de viewport-laag (pan/zoom) — niet `background-attachment: fixed`. */
export const KASSA_FLOOR_PLAN_VIEWPORT_LAYER_CLASS = 'gks-floor-plan-viewport-layer'

export function kassaFloorPlanViewportLayerClass(planZone: FloorPlanZone): string {
  const grain =
    planZone === FLOOR_PLAN_ZONE_TERRACE
      ? KASSA_FLOOR_TERRACE_GRAIN_CLASS
      : KASSA_POS_MENU_PLATE_SHELL_BG_CLASS
  return `${grain} ${KASSA_FLOOR_PLAN_VIEWPORT_LAYER_CLASS}`
}

/** Reserveringen-plattegrond: licht raster (zelfde voor binnen + terras). */
export function reservationFloorViewportLayerStyle(planZone: FloorPlanZone): CSSProperties {
  if (planZone === FLOOR_PLAN_ZONE_TERRACE) {
    return {
      backgroundColor: '#6b9b72',
      backgroundPosition: '0 0',
      backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 2px, transparent 2px),
          linear-gradient(to bottom, rgba(255,255,255,0.14) 0px, rgba(255,255,255,0.14) 2px, transparent 2px)
        `,
      backgroundSize: '100px 100px',
    }
  }
  return {
    backgroundColor: '#e3e3e3',
    backgroundPosition: '0 0',
    backgroundImage:
      'linear-gradient(to right, rgba(0,0,0,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.07) 1px, transparent 1px)',
    backgroundSize: '40px 40px',
  }
}
