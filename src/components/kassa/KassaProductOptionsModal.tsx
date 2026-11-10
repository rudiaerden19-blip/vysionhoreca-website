'use client'

import type { MenuProduct, ProductOption, ProductOptionChoice } from '@/lib/admin-api'
import type { KassaSelectedChoice } from '@/lib/kassa-cart-types'
import { useLanguage } from '@/i18n'
import { kassaProductImageRetryOnError } from '@/lib/kassa-img-retry'
import {
  KASSA_POS_BTN_SHAPE,
  KASSA_POS_MENU_PLATE_SHELL_BG_CLASS,
  KASSA_SPEELS_CHROME_MUTED_TEXT_CLASS,
  KASSA_SPEELS_PRICE_ACCENT_CLASS,
  kassaPosButtonClass,
  kassaSpeelsBlueGlossButtonClass,
  kassaSpeelsChromeButtonClass,
  type KassaPosChromeLook,
} from '@/lib/kassa-pos-surface'
import { KassaIconCheck, KassaIconClose } from '@/lib/kassa-ui-icons'
import {
  disarmAllKassaOskInputs,
  releaseLegacyOskInputGuards,
} from '@/lib/kassa-azerty-osk'
import { useKassaAzertyOskChrome } from '@/lib/kassa-azerty-osk-context'
import { KASSA_OSK_PROGRAMMATIC_INPUT_EVENT } from '@/lib/dom-input-value'
import { scheduleScrollInputAboveKeyboard } from '@/lib/scroll-input-above-keyboard'
import { useEffect, useRef } from 'react'

export interface KassaProductOptionsModalModel {
  product: MenuProduct
  options: ProductOption[]
  selected: KassaSelectedChoice[]
  editingCartKey?: string
  lineNote?: string
}

export function KassaProductOptionsModal({
  model,
  onClose,
  onToggleChoice,
  onLineNoteChange,
  onConfirm,
  appearance = 'light',
  posChrome,
}: {
  model: KassaProductOptionsModalModel
  onClose: () => void
  onToggleChoice: (option: ProductOption, choice: ProductOptionChoice) => void
  onLineNoteChange: (note: string) => void
  onConfirm: () => void
  appearance?: 'light' | 'dark'
  /** Speels POS: grijs glanzend chrome + groene prijzen (zoals kassa-sidebar). */
  posChrome?: KassaPosChromeLook | null
}) {
  const { t } = useLanguage()
  const azertyOsk = useKassaAzertyOskChrome()
  const oskOpen = Boolean(azertyOsk?.visible && azertyOsk.heightPx > 0)
  const oskBottomPad = oskOpen ? azertyOsk!.heightPx + 16 : 0
  const oskModalMaxHeight = oskOpen
    ? `calc(100vh - ${oskBottomPad + 24}px)`
    : 'min(80vh, calc(100% - 5rem))'

  const optionsSessionKey = `${model.product.id ?? ''}:${model.editingCartKey ?? ''}`
  const lineNoteInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const el = lineNoteInputRef.current
    if (!el) return
    const onProgrammaticInput = (e: Event) => {
      const detail = (e as CustomEvent<{ value?: string }>).detail
      if (typeof detail?.value !== 'string') return
      onLineNoteChange(detail.value)
    }
    el.addEventListener(KASSA_OSK_PROGRAMMATIC_INPUT_EVENT, onProgrammaticInput)
    return () => el.removeEventListener(KASSA_OSK_PROGRAMMATIC_INPUT_EVENT, onProgrammaticInput)
  }, [onLineNoteChange, optionsSessionKey])

  useEffect(() => {
    releaseLegacyOskInputGuards()
    disarmAllKassaOskInputs()
    return () => {
      releaseLegacyOskInputGuards()
      disarmAllKassaOskInputs()
    }
  }, [optionsSessionKey])

  useEffect(() => {
    if (!oskOpen) return
    const active = document.activeElement
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      scheduleScrollInputAboveKeyboard(active)
    }
  }, [oskOpen, optionsSessionKey])

  const dark = appearance === 'dark'
  const speelsDark = dark && posChrome === 'speels'

  const optionsTotal =
    model.product.price + model.selected.reduce((s, c) => s + c.price, 0)

  const darkPriceClass = dark ? KASSA_SPEELS_PRICE_ACCENT_CLASS : 'text-[#3C4D6B]'

  const speelsChromeBtn = (selected: boolean, extraClass = '') =>
    `${KASSA_POS_BTN_SHAPE} ${kassaSpeelsChromeButtonClass(selected)} ${KASSA_SPEELS_CHROME_MUTED_TEXT_CLASS} ${extraClass}`

  const closeWithOsk = () => {
    azertyOsk?.dismiss()
    onClose()
  }

  const confirmWithOsk = () => {
    azertyOsk?.dismiss()
    onConfirm()
  }

  const speelsOptionBadgeClass = [
    KASSA_POS_BTN_SHAPE,
    'inline-flex items-center text-xs px-2.5 py-1 font-semibold',
    KASSA_SPEELS_CHROME_MUTED_TEXT_CLASS,
    kassaSpeelsBlueGlossButtonClass(false),
  ].join(' ')

  const darkActionBtn = (selected: boolean, extraClass = '') =>
    speelsDark
      ? speelsChromeBtn(selected, extraClass)
      : `${KASSA_POS_BTN_SHAPE} ${kassaPosButtonClass(selected, posChrome ?? 'luxe')} ${extraClass}`

  return (
    <div
      data-testid="kassa-options-modal"
      data-osk-scroll
      data-osk-next="true"
      className={`fixed inset-0 z-[600] flex bg-black/60 p-4 ${
        oskOpen
          ? 'items-start justify-center overflow-y-auto overscroll-y-contain pt-4'
          : 'items-center justify-center'
      }`}
      style={{ paddingBottom: oskOpen ? `${oskBottomPad}px` : undefined }}
    >
      <div
        className={
          dark
            ? `${KASSA_POS_BTN_SHAPE} flex w-full max-w-lg min-h-0 flex-col overflow-hidden border border-[#1a1a1a] shadow-2xl ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`
            : 'flex w-full max-w-lg min-h-0 flex-col overflow-hidden rounded-2xl bg-white shadow-2xl'
        }
        style={{ maxHeight: oskModalMaxHeight }}
      >
        <div
          className={`flex shrink-0 items-center gap-3 border-b p-4 ${dark ? `border-[#1a1a1a] ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}` : ''}`}
        >
          {model.product.image_url && (
            <img
              src={model.product.image_url}
              alt={model.product.name}
              onError={kassaProductImageRetryOnError}
              className={`w-14 h-14 rounded-xl flex-shrink-0 ${model.product.image_display_mode === 'contain' ? (dark ? 'object-contain bg-zinc-800' : 'object-contain bg-gray-100') : 'object-cover'}`}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className={dark ? 'font-bold text-lg truncate text-zinc-50' : 'font-bold text-lg truncate'}>
              {model.editingCartKey ? t('kassaApp.optionsEditPrefix') : ''}
              {model.product.name}
            </p>
            <p className={`${darkPriceClass} font-bold`}>
              €{optionsTotal.toFixed(2)}
            </p>
          </div>
          <button
            type="button"
            onClick={closeWithOsk}
            className={
              dark
                ? speelsDark
                  ? `p-2 ${speelsChromeBtn(false)}`
                  : `p-2 text-[#f0f0f0] ${KASSA_POS_BTN_SHAPE} ${kassaPosButtonClass(false)}`
                : 'p-2 hover:bg-gray-100 rounded-xl'
            }
            aria-label={t('kassaApp.closeAria')}
          >
            <KassaIconClose className="h-6 w-6" />
          </button>
        </div>

        <div
          className={`min-h-0 flex-1 overflow-y-auto touch-pan-y p-4 space-y-5 ${dark ? KASSA_POS_MENU_PLATE_SHELL_BG_CLASS : ''}`}
        >
          <div>
            <label
              htmlFor="kassa-line-note"
              className={
                speelsDark
                  ? `mb-2 block text-sm font-semibold ${KASSA_SPEELS_PRICE_ACCENT_CLASS}`
                  : dark
                    ? 'mb-2 block text-sm font-semibold text-zinc-200'
                    : 'mb-2 block text-sm font-semibold text-gray-700'
              }
            >
              {t('kassaApp.cartLineNoteLabel')}
            </label>
            <input
              key={optionsSessionKey}
              ref={lineNoteInputRef}
              id="kassa-line-note"
              type="text"
              data-testid="kassa-line-note-input"
              data-kassa-osk-line-note="true"
              value={model.lineNote ?? ''}
              maxLength={120}
              onChange={(e) => onLineNoteChange(e.target.value)}
              onPointerDown={(e) => {
                if (e.currentTarget instanceof HTMLInputElement) {
                  e.currentTarget.focus()
                }
              }}
              placeholder={t('kassaApp.cartLineNotePlaceholder')}
              className={
                dark
                  ? `w-full rounded-xl border border-[#3d3d3d] bg-[#121212] px-3 py-2.5 text-base text-zinc-50 outline-none focus:border-[#6dd5ff] ${KASSA_POS_BTN_SHAPE}`
                  : 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base text-gray-900 outline-none focus:border-[#3C4D6B] focus:ring-1 focus:ring-[#3C4D6B]'
              }
            />
          </div>
          {model.options.map((option) => (
            <div key={option.id}>
              <div className="flex items-center gap-2 mb-3">
                <p
                  className={
                    speelsDark
                      ? `font-bold text-base uppercase tracking-wide ${KASSA_SPEELS_PRICE_ACCENT_CLASS}`
                      : dark
                        ? 'font-bold text-base uppercase tracking-wide text-[#6dd5ff]'
                        : 'font-bold text-base uppercase tracking-wide text-[#3C4D6B]'
                  }
                >
                  {option.name}
                </p>
                {option.required && (
                  <span
                    className={
                      speelsDark
                        ? speelsOptionBadgeClass
                        : dark
                          ? `text-xs px-2 py-0.5 font-semibold text-red-300 ${KASSA_POS_BTN_SHAPE} border border-[#3d3d3d] ${kassaPosButtonClass(false)}`
                          : 'text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full font-semibold'
                    }
                  >
                    {t('kassaApp.optionRequired')}
                  </span>
                )}
                {option.type === 'multiple' && (
                  <span
                    className={
                      speelsDark
                        ? speelsOptionBadgeClass
                        : dark
                          ? `text-xs px-2 py-0.5 font-semibold text-[#d4b483] ${KASSA_POS_BTN_SHAPE} border border-[#3d3d3d] ${kassaPosButtonClass(false)}`
                          : 'text-xs bg-blue-50 text-blue-500 border border-blue-200 px-2 py-0.5 rounded-full'
                    }
                  >
                    {t('kassaApp.optionMultiple')}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(option.choices || []).map((choice) => {
                  const isSelected = model.selected.some((s) => s.choiceId === choice.id)
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      onClick={() => onToggleChoice(option, choice)}
                      className={`relative flex flex-col items-center justify-center px-2 py-3 text-sm font-medium transition-all ${
                        dark
                          ? `${darkActionBtn(isSelected, `min-h-[4.25rem] ${isSelected ? 'scale-[1.02]' : ''}`)}`
                          : isSelected
                            ? 'rounded-xl border-2 border-[#3C4D6B] bg-[#3C4D6B]/10 ring-2 ring-[#3C4D6B] scale-[1.03]'
                            : 'rounded-xl border-2 border-gray-200 hover:border-[#3C4D6B] bg-white text-gray-700'
                      }`}
                    >
                      {isSelected && (
                        <div
                          className={
                            speelsDark
                              ? `absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center text-[10px] font-bold ${speelsChromeBtn(true)}`
                              : dark
                                ? 'absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-md border border-[#3d3d3d] bg-[#1c1c1c] text-[10px] font-bold text-[#d4b483]'
                                : 'absolute top-1.5 right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#3C4D6B] text-xs font-bold text-white'
                          }
                        >
                          <KassaIconCheck className={speelsDark ? 'h-3 w-3' : dark ? 'h-3 w-3 text-[#d4b483]' : 'h-3.5 w-3.5'} />
                        </div>
                      )}
                      <span
                        className={`text-center leading-tight font-semibold ${
                          speelsDark
                            ? KASSA_SPEELS_CHROME_MUTED_TEXT_CLASS
                            : isSelected
                              ? dark
                                ? 'text-[#6dd5ff]'
                                : 'text-[#3C4D6B]'
                              : dark
                                ? 'text-zinc-100'
                                : 'text-gray-800'
                        }`}
                      >
                        {choice.name}
                      </span>
                      {choice.price > 0 ? (
                        <span
                          className={`text-xs font-bold mt-1 ${
                            speelsDark ? KASSA_SPEELS_PRICE_ACCENT_CLASS : dark ? 'text-[#d4b483]' : 'text-amber-500'
                          }`}
                        >
                          {`+€${choice.price.toFixed(2)}`}
                        </span>
                      ) : null}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div
          className={
            dark
              ? `flex shrink-0 gap-3 border-t border-[#1a1a1a] p-4 ${KASSA_POS_MENU_PLATE_SHELL_BG_CLASS}`
              : 'flex shrink-0 gap-3 border-t bg-gray-50 p-4'
          }
        >
          <button
            type="button"
            data-testid="kassa-options-cancel"
            onClick={closeWithOsk}
            className={
              dark
                ? `flex-1 py-3 font-semibold ${darkActionBtn(false)}`
                : 'flex-1 py-3 rounded-xl bg-white border border-gray-200 font-semibold text-gray-600 hover:bg-gray-100 transition-colors'
            }
          >
            {t('kassaApp.cancel')}
          </button>
          <button
            type="button"
            data-testid="kassa-options-confirm"
            onClick={confirmWithOsk}
            className={
              dark
                ? `flex-[2] py-3.5 text-lg font-bold ${darkActionBtn(false)}${model.editingCartKey ? '' : ' kassa-options-add-glow'}`
                : `flex-[2] py-3.5 rounded-xl bg-[#3C4D6B] hover:bg-[#2D3A52] text-white font-bold text-lg shadow-md transition-colors${model.editingCartKey ? '' : ' kassa-options-add-glow'}`
            }
          >
            {model.editingCartKey ? t('kassaApp.optionsSave') : t('kassaApp.optionsAdd')}{' '}
            <span className={dark ? darkPriceClass : ''}>€{optionsTotal.toFixed(2)}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
