'use client'

import { useLanguage } from '@/i18n'
import { KASSA_AZERTY_OSK_TOGGLE_BTN_CLASS } from '@/lib/kassa-azerty-osk'
import { useKassaAzertyOskChrome } from '@/lib/kassa-azerty-osk-context'

type Props = {
  /** Extra shell (min-h/padding) bovenop standaard blauw. */
  className?: string
  labelClassName?: string
}

/** Alle tenants: zelfde plek/stijl als kassa-header (bv. naast Online). */
export function KassaAzertyOskHeaderToggle({ className = '', labelClassName }: Props) {
  const { t } = useLanguage()
  const chrome = useKassaAzertyOskChrome()
  if (!chrome?.manualToggleEnabled) return null

  return (
    <button
      type="button"
      className={`${KASSA_AZERTY_OSK_TOGGLE_BTN_CLASS} ${className} ${
        chrome.keyboardPinned ? 'ring-2 ring-white/80 ring-offset-1 ring-offset-black' : ''
      }`}
      aria-pressed={chrome.keyboardPinned}
      data-testid="kassa-azerty-osk-toggle"
      title={
        chrome.keyboardPinned ? t('kassaApp.azertyOskHide') : t('kassaApp.azertyOskShow')
      }
      onClick={() => chrome.toggleKeyboard()}
    >
      <span className={labelClassName}>{t('kassaApp.azertyOskShow')}</span>
    </button>
  )
}
