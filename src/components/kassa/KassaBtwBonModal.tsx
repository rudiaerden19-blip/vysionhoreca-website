'use client'

import { useEffect, useState } from 'react'
import { useLanguage } from '@/i18n'
import {
  type KassaCustomerVatCountry,
  formatKassaCustomerVatDisplay,
  formatKassaCustomerVatReceipt,
} from '@/lib/kassa-customer-vat'
import type { KassaVatInvoiceCustomer } from '@/lib/kassa-vat-invoice-layout'
import {
  KASSA_POS_BTN_SHAPE,
  KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
  kassaPosButtonClass,
} from '@/lib/kassa-pos-surface'

export type KassaBtwBonCustomer = KassaVatInvoiceCustomer

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
  onPrint: (customer: KassaBtwBonCustomer) => void
  appearance?: 'light' | 'dark'
}) {
  const { t } = useLanguage()
  const dark = appearance === 'dark'
  const [country, setCountry] = useState<KassaCustomerVatCountry>('BE')
  const [name, setName] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [city, setCity] = useState('')
  const [vatDisplay, setVatDisplay] = useState('')

  useEffect(() => {
    if (!open) return
    setCountry('BE')
    setName('')
    setAddressLine('')
    setPostalCode('')
    setCity('')
    setVatDisplay('')
  }, [open])

  if (!open) return null

  const nameTrim = name.trim()
  const addressTrim = addressLine.trim()
  const postalTrim = postalCode.trim()
  const cityTrim = city.trim()
  const canPrint = !printing

  const fieldCls = dark
    ? 'w-full rounded-xl border border-zinc-600 bg-[#0b0f14] px-3 py-3 text-base text-zinc-50 outline-none focus:border-zinc-400'
    : 'w-full rounded-xl border border-gray-300 bg-white px-3 py-3 text-base text-gray-900 outline-none focus:border-[#3C4D6B]'
  const labelCls = dark
    ? 'mb-1.5 block text-sm font-semibold text-zinc-300'
    : 'mb-1.5 block text-sm font-semibold text-gray-600'

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
            ? `${KASSA_POS_BTN_SHAPE} flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden border border-[#1a1a1a] ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`
            : 'flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-2xl'
        }
      >
        <div className={`shrink-0 border-b px-5 py-4 ${dark ? 'border-[#1a1a1a]' : 'border-gray-200'}`}>
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

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5">
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
            <span className={labelCls}>{t('kassaApp.btwBonCustomerName')}</span>
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
            <span className={labelCls}>{t('kassaApp.btwBonAddress')}</span>
            <input
              type="text"
              autoComplete="off"
              value={addressLine}
              onChange={(e) => setAddressLine(e.target.value)}
              className={fieldCls}
              data-testid="kassa-btw-bon-address"
            />
          </label>

          <div className="grid grid-cols-5 gap-2">
            <label className="col-span-2 block">
              <span className={labelCls}>{t('kassaApp.btwBonPostal')}</span>
              <input
                type="text"
                autoComplete="off"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
                className={fieldCls}
                data-testid="kassa-btw-bon-postal"
              />
            </label>
            <label className="col-span-3 block">
              <span className={labelCls}>{t('kassaApp.btwBonCity')}</span>
              <input
                type="text"
                autoComplete="off"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className={fieldCls}
                data-testid="kassa-btw-bon-city"
              />
            </label>
          </div>

          <label className="block">
            <span className={labelCls}>{t('kassaApp.btwBonVatNumber')}</span>
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

        </div>

        <div className={`flex shrink-0 gap-3 border-t px-5 py-3 ${dark ? 'border-[#1a1a1a]' : 'border-gray-100'}`}>
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
              const vatNumber = vatDisplay.trim()
                ? formatKassaCustomerVatReceipt(country, vatDisplay)
                : ''
              onPrint({
                name: nameTrim,
                vatNumber,
                addressLine: addressTrim,
                postalCode: postalTrim,
                city: cityTrim,
              })
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
