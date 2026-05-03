'use client'

import type { MenuProduct, ProductOption, ProductOptionChoice } from '@/lib/admin-api'
import type { KassaSelectedChoice } from '@/lib/kassa-cart-types'
import { useLanguage } from '@/i18n'

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
}: {
  model: KassaProductOptionsModalModel
  onClose: () => void
  onToggleChoice: (option: ProductOption, choice: ProductOptionChoice) => void
  onConfirm: () => void
}) {
  const { t } = useLanguage()

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 p-4 border-b">
          {model.product.image_url && (
            <img
              src={model.product.image_url}
              alt={model.product.name}
              className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-bold text-lg truncate">
              {model.editingCartKey ? t('kassaApp.optionsEditPrefix') : ''}
              {model.product.name}
            </p>
            <p className="text-[#3C4D6B] font-bold">
              €{(model.product.price + model.selected.reduce((s, c) => s + c.price, 0)).toFixed(2)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl"
            aria-label={t('kassaApp.closeAria')}
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {model.options.map((option) => (
            <div key={option.id}>
              <div className="flex items-center gap-2 mb-3">
                <p className="font-bold text-base text-gray-900">{option.name}</p>
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
                          ? 'border-[#3C4D6B] bg-[#3C4D6B]/10 ring-2 ring-[#3C4D6B] scale-[1.03]'
                          : 'border-gray-200 hover:border-[#3C4D6B] bg-white text-gray-700'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[#3C4D6B] flex items-center justify-center">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      )}
                      <span
                        className={`text-center leading-tight font-semibold ${isSelected ? 'text-[#3C4D6B]' : 'text-gray-800'}`}
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

        <div className="p-4 border-t flex gap-3 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-white border border-gray-200 font-semibold text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {t('kassaApp.cancel')}
          </button>
          <button
            type="button"
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
