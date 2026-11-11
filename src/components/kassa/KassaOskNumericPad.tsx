'use client'

import { useLanguage } from '@/i18n'
import {
  KASSA_AZERTY_OSK_NUMPAD_STRIP_WIDTH,
  KASSA_AZERTY_OSK_OPTION_BTN_WIDTH,
} from '@/lib/kassa-azerty-osk-context'
import type { ComponentPropsWithoutRef } from 'react'

const NUMPAD_ROWS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
] as const

const NUMPAD_KEY_HEIGHT =
  'min-h-[2.75rem] w-full min-w-0 sm:min-h-[2.9rem]'

type KeyHandlers = Pick<
  ComponentPropsWithoutRef<'button'>,
  'onPointerDown' | 'onClick'
>

type Props = {
  speelsDark?: boolean
  keyClassFor: (token: string) => string
  digitHandlers: (digit: string) => KeyHandlers
  punctHandlers: {
    comma: KeyHandlers
    dot: KeyHandlers
  }
}

/**
 * Cijfertoetsen links van AZERTY — zelfde glossy stijl als opmerking-snelknoppen.
 */
export function KassaOskNumericPad({
  speelsDark = false,
  keyClassFor,
  digitHandlers,
  punctHandlers,
}: Props) {
  const { t } = useLanguage()
  const dividerClass = speelsDark ? 'border-[#252525]' : 'border-neutral-600'

  const keyClass = speelsDark
    ? `kassa-osk-shortcut-field kassa-azerty-osk-numpad-key ${NUMPAD_KEY_HEIGHT} touch-manipulation rounded-xl border pl-1 pr-1 text-center text-base font-bold outline-none active:border-[#58CCFF] sm:text-lg`
    : `${NUMPAD_KEY_HEIGHT} touch-manipulation rounded-xl border border-neutral-500 bg-neutral-900 text-center text-base font-bold text-white outline-none focus:border-[#58CCFF] active:border-[#58CCFF] sm:text-lg`

  const renderKey = (
    id: string,
    token: string,
    label: string,
    handlers: KeyHandlers,
  ) => (
    <button
      key={id}
      type="button"
      className={[keyClass, keyClassFor(token)].filter(Boolean).join(' ')}
      data-testid={`kassa-azerty-osk-numpad-${id}`}
      {...handlers}
    >
      {label}
    </button>
  )

  return (
    <div
      className={`mr-2 flex shrink-0 flex-col self-start border-r pr-2 ${dividerClass}`}
      style={{ width: KASSA_AZERTY_OSK_NUMPAD_STRIP_WIDTH }}
      data-testid="kassa-azerty-osk-numpad"
      aria-label={t('kassaApp.azertyOskNumericPadTitle')}
    >
      <div className="mb-1 flex h-7 shrink-0 items-center justify-between gap-1">
        <span
          className={`min-w-0 flex-1 truncate text-[10px] font-semibold leading-tight sm:text-[11px] ${
            speelsDark ? 'text-[#909090]' : 'text-neutral-400'
          }`}
        >
          {t('kassaApp.azertyOskInsertNumberLabel')}
        </span>
        <span className="h-7 w-7 shrink-0" aria-hidden="true" />
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {NUMPAD_ROWS.flat().map((digit) => (
          <div
            key={`cell-${digit}`}
            className="min-w-0"
            style={{ maxWidth: KASSA_AZERTY_OSK_OPTION_BTN_WIDTH }}
          >
            {renderKey(digit, `np:${digit}`, digit, digitHandlers(digit))}
          </div>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        <div className="min-w-0" style={{ maxWidth: KASSA_AZERTY_OSK_OPTION_BTN_WIDTH }}>
          {renderKey('comma', 'np:,', ',', punctHandlers.comma)}
        </div>
        <div className="min-w-0" style={{ maxWidth: KASSA_AZERTY_OSK_OPTION_BTN_WIDTH }}>
          {renderKey('0', 'np:0', '0', digitHandlers('0'))}
        </div>
        <div className="min-w-0" style={{ maxWidth: KASSA_AZERTY_OSK_OPTION_BTN_WIDTH }}>
          {renderKey('dot', 'np:.', '.', punctHandlers.dot)}
        </div>
      </div>
    </div>
  )
}
