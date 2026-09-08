'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/i18n'
import {
  type KassaCustomerVatCountry,
  formatKassaCustomerVatDisplay,
  isKassaCustomerVatComplete,
  parseKassaCustomerVatInput,
} from '@/lib/kassa-customer-vat'
import {
  KASSA_POS_BTN_SHAPE,
  KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
  kassaPosButtonClass,
} from '@/lib/kassa-pos-surface'

export type KassaBtwBonCustomer = {
  name: string
  vatNumber: string
}

export function KassaBtwBonModal({
  open,
  printing,
  onClose,
  onPrint,
  appearance = 'light',
}: {
  open: boolean
  printing?: boolean
  onClose: () => void
  onPrint: (customer: KassaBtwBonCustomer | null) => void
  appearance?: 'light' | 'dark'
}) {
  const { t } = useLanguage()
  const dark = appearance === 'dark'
  const [country, setCountry] = useState<KassaCustomerVatCountry>('BE')
  const [name, setName] = useState('')
  const [vatDisplay, setVatDisplay] = useState('')

  useEffect(() => {
    if (!open) return
    setCountry('BE')
    setName('')
    setVatDisplay('')
  }, [open])

  if (!open) return null

  const vatStarted = vatDisplay.replace(/\D/g, '').length > 0
  const vatComplete = isKassaCustomerVatComplete(country, vatDisplay)
  const nameTrim = name.trim()
  const nameMissing = vatStarted && !nameTrim
  const vatInvalid = vatStarted && !vatComplete
  const canPrint = !printing && !nameMissing && !vatInvalid

  const fieldCls = dark
    ? 'w-full rounded-xl border border-zinc-600 bg-[#0b0f14] px-3 py-3 text-base text-zinc-50 outline-none focus:border-zinc-400'
    : 'w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 outline-none focus:border-[#3C4D6B]'

  return (
    <div
      className="fixed inset-0 z-[220] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="kassa-btw-bon-title"
    >
      <div
        className={
          dark
            ? `${KASSA_POS_BTN_SHAPE} w-full max-w-md overflow-hidden border border-[#1a1a1a] ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`
            : 'w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl'
        }
      >
        <div className={`border-b px-5 py-4 ${dark ? 'border-[#1a1a1a]' : 'border-gray-200'}`}>
          <h2
            id="kassa-btw-bon-title"
            className={dark ? 'text-lg font-bold text-zinc-50' : 'text-lg font-bold text-gray-900'}
          >
            {t('kassaApp.btwBonModalTitle')}
          </h2>
          <p className={dark ? 'mt-1 text-sm text-zinc-400' : 'mt-1 text-sm text-gray-500'}>
            {t('kassaApp.btwBonModalHint')}
          </p>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <p className={dark ? 'mb-2 text-sm font-semibold text-zinc-300' : 'mb-2 text-sm font-semibold text-gray-600'}>
              {t('kassaApp.btwBonCountry')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {(['BE', 'NL'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  data-testid={`kassa-btw-bon-country-${code.toLowerCase()}`}
                  aria-pressed={country === code}
                  onClick={() => {
                    setCountry(code)
                    setVatDisplay(formatKassaCustomerVatDisplay(code, vatDisplay))
                  }}
                  className={`min-h-[3.25rem] text-lg font-bold tracking-wide ${
                    dark
                      ? kassaPosButtonClass(country === code)
                      : country === code
                        ? 'rounded-xl border-2 border-[#3C4D6B] bg-[#3C4D6B] text-white'
                        : 'rounded-xl border-2 border-gray-200 bg-white text-gray-800'
                  }`}
                >
                  {code}
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className={dark ? 'mb-1.5 block text-sm font-semibold text-zinc-300' : 'mb-1.5 block text-sm font-semibold text-gray-600'}>
              {t('kassaApp.btwBonCustomerName')}
            </span>
            <input
              type="text"
              autoComplete="off"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldCls}
              data-testid="kassa-btw-bon-name"
            />
          </label>

          <label className="block">
            <span className={dark ? 'mb-1.5 block text-sm font-semibold text-zinc-300' : 'mb-1.5 block text-sm font-semibold text-gray-600'}>
              {t('kassaApp.btwBonVatNumber')}
            </span>
            <div className="flex gap-2">
              <span
                className={`flex min-w-[3.25rem] items-center justify-center rounded-xl px-3 text-lg font-bold tracking-wide ${
                  dark ? 'border border-zinc-600 bg-[#151a21] text-zinc-50' : 'border border-gray-300 bg-gray-50 text-gray-900'
                }`}
              >
                {country}
              </span>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                value={vatDisplay}
                placeholder={country === 'BE' ? '0123.456.789' : '1234.56.789.B01'}
                onChange={(e) => setVatDisplay(formatKassaCustomerVatDisplay(country, e.target.value))}
                className={`${fieldCls} flex-1 uppercase`}
                data-testid="kassa-btw-bon-vat"
              />
            </div>
          </label>

          {nameMissing ? (
            <p className="text-sm font-semibold text-red-500">{t('kassaApp.btwBonNameRequired')}</p>
          ) : vatInvalid ? (
            <p className="text-sm font-semibold text-red-500">{t('kassaApp.btwBonVatInvalid')}</p>
          ) : null}
        </div>

        <div className={`flex gap-3 border-t px-5 py-3 ${dark ? 'border-[#1a1a1a]' : 'border-gray-100'}`}>
          <button
            type="button"
            onClick={onClose}
            disabled={printing}
            className={
              dark
                ? `min-h-[3rem] flex-1 font-semibold ${kassaPosButtonClass(false)}`
                : 'min-h-[3rem] flex-1 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50'
            }
          >
            {t('kassaApp.cancel')}
          </button>
          <button
            type="button"
            data-testid="kassa-btw-bon-print"
            disabled={!canPrint}
            onClick={() => {
              if (!canPrint) return
              if (!vatStarted) {
                onPrint(null)
                return
              }
              const parsed = parseKassaCustomerVatInput(country, vatDisplay)
              onPrint({ name: nameTrim, vatNumber: parsed.receipt })
            }}
            className={
              dark
                ? `min-h-[3rem] flex-1 font-semibold disabled:opacity-40 ${kassaPosButtonClass(true)}`
                : 'min-h-[3rem] flex-1 rounded-xl bg-[#3C4D6B] font-semibold text-white hover:bg-[#2D3A52] disabled:opacity-40'
            }
          >
            {t('kassaApp.btwBonPrint')}
          </button>
        </div>
      </div>
    </div>
  )
}
