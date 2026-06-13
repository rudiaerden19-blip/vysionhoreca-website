'use client'

import { useLanguage } from '@/i18n'
import {
  REGISTRATION_PRODUCT_LINES,
  type RegistrationProductLine,
} from '@/lib/registration-product-line'

const LINE_META: Record<
  RegistrationProductLine,
  { icon: string; titleKey: string; descKey: string }
> = {
  horeca_kassa: {
    icon: '🖥️',
    titleKey: 'register.productLine.horeca_kassa.title',
    descKey: 'register.productLine.horeca_kassa.desc',
  },
  retail_winkel: {
    icon: '🏪',
    titleKey: 'register.productLine.retail_winkel.title',
    descKey: 'register.productLine.retail_winkel.desc',
  },
  online_bestellen: {
    icon: '📲',
    titleKey: 'register.productLine.online_bestellen.title',
    descKey: 'register.productLine.online_bestellen.desc',
  },
  restaurant_reservaties: {
    icon: '📅',
    titleKey: 'register.productLine.restaurant_reservaties.title',
    descKey: 'register.productLine.restaurant_reservaties.desc',
  },
}

export function RegistrationProductLinePicker({
  value,
  onSelect,
  compact = false,
}: {
  value: RegistrationProductLine | null
  onSelect: (line: RegistrationProductLine) => void
  /** Alleen knoppen (binnen formulier). */
  compact?: boolean
}) {
  const { t } = useLanguage()

  return (
    <div className={compact ? 'space-y-3' : 'space-y-6'}>
      {!compact ? (
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">{t('register.productLineTitle')}</h1>
          <p className="mt-2 text-gray-600">{t('register.productLineSubtitle')}</p>
        </div>
      ) : (
        <div>
          <p className="text-sm font-semibold text-gray-800">{t('register.productLineTitle')}</p>
          <p className="mt-1 text-xs text-gray-600">{t('register.productLineSubtitle')}</p>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        {REGISTRATION_PRODUCT_LINES.map((line) => {
          const meta = LINE_META[line]
          const selected = value === line
          return (
            <button
              key={line}
              type="button"
              onClick={() => onSelect(line)}
              className={`flex flex-col items-start rounded-xl border-2 p-4 text-left transition-all touch-manipulation ${
                selected
                  ? 'border-accent bg-accent/5 shadow-md'
                  : 'border-gray-200 bg-white hover:border-accent/40 hover:shadow-sm'
              }`}
            >
              <span className="text-3xl" aria-hidden>
                {meta.icon}
              </span>
              <span className="mt-2 font-bold text-gray-900">{t(meta.titleKey)}</span>
              <span className="mt-1 text-sm text-gray-600 leading-snug">{t(meta.descKey)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
