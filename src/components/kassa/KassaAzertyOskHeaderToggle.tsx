'use client'

import { useLanguage } from '@/i18n'
import { useKassaAzertyOskChrome } from '@/lib/kassa-azerty-osk-context'

type Props = {
  className: string
  labelClassName?: string
}

/** Pilot: zelfde plek/stijl als kassa-header (bv. naast Online). */
export function KassaAzertyOskHeaderToggle({ className, labelClassName }: Props) {
  const { t } = useLanguage()
  const chrome = useKassaAzertyOskChrome()
  if (!chrome?.manualToggleEnabled) return null

  return (
    <button
      type="button"
      className={className}
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
