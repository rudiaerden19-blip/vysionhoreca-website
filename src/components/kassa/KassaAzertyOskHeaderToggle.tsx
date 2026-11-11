'use client'

import { useLanguage } from '@/i18n'
import { KASSA_AZERTY_OSK_TOGGLE_BTN_CLASS } from '@/lib/kassa-azerty-osk'
import { useKassaAzertyOskChrome } from '@/lib/kassa-azerty-osk-context'

type Props = {
  className?: string
  labelClassName?: string
  /** Kassa-header: grijs chrome i.p.v. standaard blauw. */
  resolveFaceClass?: (keyboardPinned: boolean) => string
}

/** Alle tenants: kassa-header of admin (standaard blauw). */
export function KassaAzertyOskHeaderToggle({
  className = '',
  labelClassName,
  resolveFaceClass,
}: Props) {
  const { t } = useLanguage()
  const chrome = useKassaAzertyOskChrome()
  if (!chrome?.manualToggleEnabled) return null

  const faceClass = resolveFaceClass
    ? resolveFaceClass(chrome.keyboardPinned)
    : KASSA_AZERTY_OSK_TOGGLE_BTN_CLASS
  const pinnedRing =
    resolveFaceClass || !chrome.keyboardPinned
      ? ''
      : 'ring-2 ring-white/80 ring-offset-1 ring-offset-black'

  return (
    <button
      type="button"
      className={`${faceClass} ${className} ${pinnedRing}`}
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
