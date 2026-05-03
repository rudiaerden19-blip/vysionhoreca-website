'use client'

import { useLanguage } from '@/i18n'

export function KassaRegisterSuspenseFallback() {
  const { t } = useLanguage()
  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-[#e3e3e3] text-gray-600">
      {t('kassaApp.suspenseLoading')}
    </div>
  )
}
