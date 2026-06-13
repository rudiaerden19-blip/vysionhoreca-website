import type { SyntheticEvent } from 'react'
import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable'

/**
 * Admin catalog drag (producten, opties): korte touch-delay zodat velden/knoppen
 * op één tik reageren; sleep op het handvat start pas drag.
 */
export function useAdminCatalogDragSensors() {
  return useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  )
}

/** Voorkom dat dnd-kit de eerste pointerdown op formuliervelden onderschept. */
export function stopDragActivationOnField(ev: SyntheticEvent) {
  ev.stopPropagation()
}
