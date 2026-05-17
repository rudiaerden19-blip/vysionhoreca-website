'use client'

import type { MenuProduct, ProductOption, ProductOptionChoice } from '@/lib/admin-api'
import type { KassaSelectedChoice } from '@/lib/kassa-cart-types'
import { useLanguage } from '@/i18n'
import { kassaProductImageRetryOnError } from '@/lib/kassa-img-retry'

export interface KassaProductOptionsModalModel {
  product: MenuProduct
  options: ProductOption[]
  selected: KassaSelectedChoice[]
  editingCartKey?: string
}

export function KassaProductOptionsModal({
  model,
  onClose,
  onToggleChoice,
  onConfirm,
  appearance = 'light',
}: {
  model: KassaProductOptionsModalModel
  onClose: () => void
  onToggleChoice: (option: ProductOption, choice: ProductOptionChoice) => void
  onConfirm: () => void
  appearance?: 'light' | 'dark'
}) {
  const { t } = useLanguage()
  const dark = appearance === 'dark'

  return (
    <div
      data-testid="kassa-options-modal"
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
    >
      <div
        className={
          dark
            ? 'rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden bg-[#151a21] border border-zinc-600'
            : 'bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden'
        }
      >
        <div className={`flex items-center gap-3 p-4 border-b ${dark ? 'border-zinc-600' : ''}`}>
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
            <p className={dark ? 'text-[#6dd5ff] font-bold' : 'text-[#3C4D6B] font-bold'}>
              €{(model.product.price + model.selected.reduce((s, c) => s + c.price, 0)).toFixed(2)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className={dark ? 'p-2 hover:bg-zinc-800 rounded-xl text-zinc-200' : 'p-2 hover:bg-gray-100 rounded-xl'}
            aria-label={t('kassaApp.closeAria')}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {model.options.map((option) => (
            <div key={option.id}>
              <div className="flex items-center gap-2 mb-3">
                <p className={dark ? 'font-bold text-base text-zinc-100' : 'font-bold text-base text-gray-900'}>
                  {option.name}
                </p>
                {option.required && (
                  <span className="text-xs bg-red-50 text-red-500 border border-red-200 px-2 py-0.5 rounded-full font-semibold">
                    {t('kassaApp.optionRequired')}
                  </span>
                )}
                {option.type === 'multiple' && (
                  <span className="text-xs bg-blue-50 text-blue-500 border border-blue-200 px-2 py-0.5 rounded-full">
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
                      className={`relative flex flex-col items-center justify-center px-2 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                        isSelected
                          ? dark
                            ? 'border-[#58CCFF] bg-[#58CCFF]/15 ring-2 ring-[#58CCFF]/80 scale-[1.03]'
                            : 'border-[#3C4D6B] bg-[#3C4D6B]/10 ring-2 ring-[#3C4D6B] scale-[1.03]'
                          : dark
                            ? 'border-zinc-600 hover:border-[#58CCFF] bg-[#263043] text-zinc-200'
                            : 'border-gray-200 hover:border-[#3C4D6B] bg-white text-gray-700'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#3C4D6B] flex items-center justify-center">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      )}
                      <span
                        className={`text-center leading-tight font-semibold ${
                          isSelected ? (dark ? 'text-[#6dd5ff]' : 'text-[#3C4D6B]') : dark ? 'text-zinc-100' : 'text-gray-800'
                        }`}
                      >
                        {choice.name}
                      </span>
                      <span
                        className={`text-xs font-bold mt-1 ${choice.price > 0 ? 'text-amber-500' : 'text-green-500'}`}
                      >
                        {choice.price > 0 ? `+€${choice.price.toFixed(2)}` : t('kassaApp.optionFree')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div
          className={
            dark ? 'p-4 border-t border-zinc-600 flex gap-3 bg-[#121821]' : 'p-4 border-t flex gap-3 bg-gray-50'
          }
        >
          <button
            type="button"
            data-testid="kassa-options-cancel"
            onClick={onClose}
            className={
              dark
                ? 'flex-1 py-3 rounded-xl bg-[#263043] border border-zinc-600 font-semibold text-zinc-200 hover:bg-[#324056] transition-colors'
                : 'flex-1 py-3 rounded-xl bg-white border border-gray-200 font-semibold text-gray-600 hover:bg-gray-100 transition-colors'
            }
          >
            {t('kassaApp.cancel')}
          </button>
          <button
            type="button"
            data-testid="kassa-options-confirm"
            onClick={onConfirm}
            className="flex-[2] py-3.5 rounded-xl bg-[#3C4D6B] hover:bg-[#2D3A52] text-white font-bold text-lg shadow-md transition-colors"
          >
            {model.editingCartKey ? t('kassaApp.optionsSave') : t('kassaApp.optionsAdd')} — €
            {(model.product.price + model.selected.reduce((s, c) => s + c.price, 0)).toFixed(2)}
          </button>
        </div>
      </div>
    </div>
  )
}
