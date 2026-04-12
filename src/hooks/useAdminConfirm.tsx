'use client'

import { useCallback, useState } from 'react'

type Pending = { message: string; resolve: (ok: boolean) => void }

/**
 * Vervangt window.confirm voor admin / touch (iPad Safari).
 * Render `<ConfirmModal />` één keer hoog in je component-return.
 */
export function useAdminConfirm(t: (key: string) => string) {
  const [pending, setPending] = useState<Pending | null>(null)

  const ask = useCallback(
    (message: string) => {
      return new Promise<boolean>((resolve) => {
        setPending((prev) => {
          if (prev) {
            prev.resolve(false)
          }
          return { message, resolve }
        })
      })
    },
    []
  )

  const onCancel = useCallback(() => {
    setPending((p) => {
      if (p) p.resolve(false)
      return null
    })
  }, [])

  const onConfirm = useCallback(() => {
    setPending((p) => {
      if (p) p.resolve(true)
      return null
    })
  }, [])

  function ConfirmModal() {
    if (!pending) return null
    return (
      <div className="fixed inset-0 z-[135] flex touch-manipulation items-center justify-center bg-black/50 p-4 [-webkit-tap-highlight-color:transparent]">
        <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
          <div className="border-b p-6">
            <h2 className="text-xl font-bold text-gray-800">{t('adminPages.common.confirm')}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{pending.message}</p>
          </div>
          <div className="flex justify-end gap-3 border-t p-6">
            <button
              type="button"
              onClick={onCancel}
              className="min-h-[44px] touch-manipulation rounded-lg bg-gray-100 px-4 py-2 text-gray-700 [-webkit-tap-highlight-color:transparent] transition hover:bg-gray-200"
            >
              {t('adminPages.common.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="min-h-[44px] touch-manipulation rounded-lg bg-blue-600 px-6 py-2 text-white [-webkit-tap-highlight-color:transparent] transition hover:bg-blue-700"
            >
              {t('adminPages.common.confirm')}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return { ask, ConfirmModal }
}
