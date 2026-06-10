'use client'

import { useState } from 'react'
import { useLanguage } from '@/i18n'
import { saveRetailLoyaltyBarcodeToPhone } from '@/lib/retail-loyalty/download-barcode-png'

export function RetailLoyaltyPassPhoneSave({ cardCode }: { cardCode: string }) {
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function onSave() {
    setBusy(true)
    setDone(false)
    try {
      await saveRetailLoyaltyBarcodeToPhone(cardCode)
      setDone(true)
      window.setTimeout(() => setDone(false), 3500)
    } catch {
      alert(t('retailLoyalty.passPageSaveError'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="mt-6 w-full rounded-2xl border border-blue-200 bg-blue-50/90 p-4 text-left">
      <h2 className="mb-2 text-base font-bold text-blue-950">{t('retailLoyalty.passPageSaveSectionTitle')}</h2>
      <p className="mb-3 text-sm leading-snug text-blue-900">{t('retailLoyalty.passPageHowAtStore')}</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void onSave()}
        className="mb-2 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {busy
          ? t('retailLoyalty.passPageSaveBusy')
          : done
            ? t('retailLoyalty.passPageSaveDone')
            : t('retailLoyalty.passPageSaveDownload')}
      </button>
      <p className="text-xs leading-snug text-blue-800">{t('retailLoyalty.passPageSaveDownloadHint')}</p>
      <p className="mt-3 text-xs leading-snug text-blue-800/90">{t('retailLoyalty.passPageHomeScreenNote')}</p>
    </section>
  )
}
