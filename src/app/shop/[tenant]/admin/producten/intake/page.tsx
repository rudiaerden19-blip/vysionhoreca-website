'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import PinGate from '@/components/PinGate'
import { useLanguage } from '@/i18n'
import { useTenantModuleFlagsContext } from '@/lib/tenant-module-flags-context'
import { isRetailKassaPosScreenEnabled } from '@/lib/tenant-modules'
import {
  getMenuCategories,
  getMenuProducts,
  saveMenuProduct,
  MenuProduct,
  MenuCategory,
} from '@/lib/admin-api'
import {
  normalizeRetailProductBarcode,
  retailBarcodeMatchKey,
} from '@/lib/retail-product-intake'
import { uploadTenantMediaImage } from '@/lib/tenant-media-upload-client'

function parseLocalizedMoneyInput(raw: string): number {
  const n = raw.trim().replace(/\s/g, '').replace(',', '.')
  if (n === '' || n === '.') return NaN
  const v = parseFloat(n)
  return Number.isFinite(v) ? v : NaN
}

function findProductByBarcode(products: MenuProduct[], code: string): MenuProduct | undefined {
  const key = retailBarcodeMatchKey(code)
  if (!key) return undefined
  return products.find((p) => {
    const bc = p.barcode ? retailBarcodeMatchKey(p.barcode) : ''
    const an = p.article_number ? retailBarcodeMatchKey(p.article_number) : ''
    return bc === key || an === key
  })
}

function getBarcodeDetectorCtor():
  | (new (options: { formats: string[] }) => {
      detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]>
    })
  | null {
  if (typeof window === 'undefined') return null
  const w = window as Window & {
    BarcodeDetector?: new (options: { formats: string[] }) => {
      detect: (source: HTMLVideoElement) => Promise<{ rawValue?: string }[]>
    }
  }
  return w.BarcodeDetector ?? null
}

export default function RetailProductIntakePage({ params }: { params: { tenant: string } }) {
  const tenant = params.tenant
  const router = useRouter()
  const { t } = useLanguage()
  const { moduleAccess, enabledModulesJson } = useTenantModuleFlagsContext()
  const retailOn = isRetailKassaPosScreenEnabled(moduleAccess, enabledModulesJson)

  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [catalog, setCatalog] = useState<MenuProduct[]>([])
  const [existingProduct, setExistingProduct] = useState<MenuProduct | null>(null)

  const [barcode, setBarcode] = useState('')
  const [name, setName] = useState('')
  const [priceInput, setPriceInput] = useState('')
  const [imageUrl, setImageUrl] = useState('')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [retailSaleUnit, setRetailSaleUnit] = useState<MenuProduct['retail_sale_unit']>('stuk')
  const [retailUnitQty, setRetailUnitQty] = useState('')

  const [eanBusy, setEanBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [cameraScanActive, setCameraScanActive] = useState(false)

  const wedgeRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const scanLoopRef = useRef<number | null>(null)
  const cameraScanActiveRef = useRef(false)

  useEffect(() => {
    cameraScanActiveRef.current = cameraScanActive
  }, [cameraScanActive])

  const loadCatalog = useCallback(async () => {
    const [prods, cats] = await Promise.all([getMenuProducts(tenant), getMenuCategories(tenant)])
    setCatalog(prods)
    setCategories(cats)
  }, [tenant])

  useEffect(() => {
    if (!retailOn) {
      setLoading(false)
      return
    }
    void loadCatalog().finally(() => setLoading(false))
  }, [retailOn, loadCatalog])

  const applyBarcode = useCallback(
    (raw: string) => {
      const code = normalizeRetailProductBarcode(raw)
      if (!code) return
      setBarcode(code)
      setSuccess('')
      const hit = findProductByBarcode(catalog, code)
      setExistingProduct(hit ?? null)
      if (hit) {
        setName(hit.name || '')
        setPriceInput(hit.price != null ? String(hit.price).replace('.', ',') : '')
        setImageUrl(hit.image_url || '')
        setCategoryId(hit.category_id ?? null)
        setRetailSaleUnit((hit.retail_sale_unit as MenuProduct['retail_sale_unit']) || 'stuk')
        setRetailUnitQty(
          hit.retail_unit_quantity != null && hit.retail_unit_quantity > 0
            ? String(hit.retail_unit_quantity)
            : '',
        )
      }
    },
    [catalog],
  )

  const lookupEanName = useCallback(async () => {
    const code = normalizeRetailProductBarcode(barcode)
    if (code.length < 8 || name.trim()) return
    setEanBusy(true)
    try {
      const r = await fetch(`/api/retail/ean-lookup?ean=${encodeURIComponent(code)}`)
      const data = (await r.json()) as { ok?: boolean; name?: string; price?: number | null }
      if (data.name?.trim() && !name.trim()) setName(data.name.trim())
      if (data.price != null && !priceInput.trim()) {
        setPriceInput(String(data.price).replace('.', ','))
      }
    } catch {
      /* optional */
    } finally {
      setEanBusy(false)
    }
  }, [barcode, name, priceInput])

  useEffect(() => {
    if (!barcode || existingProduct) return
    const tId = window.setTimeout(() => {
      void lookupEanName()
    }, 400)
    return () => window.clearTimeout(tId)
  }, [barcode, existingProduct, lookupEanName])

  const stopCameraScan = useCallback(() => {
    setCameraScanActive(false)
    cameraScanActiveRef.current = false
    if (scanLoopRef.current != null) {
      cancelAnimationFrame(scanLoopRef.current)
      scanLoopRef.current = null
    }
    const v = videoRef.current
    if (v?.srcObject) {
      const stream = v.srcObject as MediaStream
      stream.getTracks().forEach((tr) => tr.stop())
      v.srcObject = null
    }
  }, [])

  const startCameraScan = useCallback(async () => {
    setError('')
    setCameraScanActive(true)
    cameraScanActiveRef.current = true
    if (typeof window === 'undefined' || !getBarcodeDetectorCtor()) {
      setError(t('adminPages.productIntake.cameraScanUnsupported'))
      stopCameraScan()
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      const video = videoRef.current
      if (!video) return
      video.srcObject = stream
      await video.play()
      const BarcodeDetectorCtor = getBarcodeDetectorCtor()
      if (!BarcodeDetectorCtor) {
        stopCameraScan()
        return
      }
      const detector = new BarcodeDetectorCtor({
        formats: ['ean_13', 'ean_8', 'upc_a', 'code_128'],
      })
      const tick = async () => {
        if (!videoRef.current || !cameraScanActiveRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          const raw = codes[0]?.rawValue
          if (raw) {
            applyBarcode(raw)
            stopCameraScan()
            return
          }
        } catch {
          /* frame miss */
        }
        scanLoopRef.current = requestAnimationFrame(() => {
          void tick()
        })
      }
      scanLoopRef.current = requestAnimationFrame(() => {
        void tick()
      })
    } catch {
      setError(t('adminPages.productIntake.cameraPermissionDenied'))
      stopCameraScan()
    }
  }, [applyBarcode, stopCameraScan, t])

  useEffect(() => () => stopCameraScan(), [stopCameraScan])

  const onWedgeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    e.preventDefault()
    applyBarcode(e.currentTarget.value)
    e.currentTarget.value = ''
  }

  const onPhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setPhotoBusy(true)
    setError('')
    try {
      const res = await uploadTenantMediaImage(
        tenant,
        file,
        t('adminPages.productIntake.defaultPhotoName'),
      )
      if (!res.ok) {
        setError(res.error)
        return
      }
      setImageUrl(res.publicUrl)
    } finally {
      setPhotoBusy(false)
    }
  }

  const resetForm = () => {
    setBarcode('')
    setName('')
    setPriceInput('')
    setImageUrl('')
    setCategoryId(null)
    setExistingProduct(null)
    setRetailSaleUnit('stuk')
    setRetailUnitQty('')
    setSuccess('')
    setError('')
  }

  const handleSave = async (): Promise<boolean> => {
    setError('')
    setSuccess('')
    const bc = normalizeRetailProductBarcode(barcode)
    if (!bc) {
      setError(t('adminPages.productIntake.barcodeRequired'))
      return false
    }
    const productName = name.trim()
    if (!productName) {
      setError(t('adminPages.productIntake.nameRequired'))
      return false
    }
    const priceNum = parseLocalizedMoneyInput(priceInput)
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      setError(t('adminPages.productIntake.invalidPrice'))
      return false
    }

    setSaving(true)
    try {
      const unitQty = Math.floor(Number(retailUnitQty) || 0)
      const payload: MenuProduct = {
        id: existingProduct?.id,
        tenant_slug: tenant,
        name: productName,
        description: existingProduct?.description || '',
        price: priceNum,
        category_id: categoryId,
        image_url: imageUrl,
        is_active: true,
        is_popular: false,
        is_promo: false,
        sort_order: existingProduct?.sort_order ?? catalog.length,
        allergens: [],
        image_display_mode: null,
        kassa_image_zoom: 1,
        print_label: false,
        catalog_mode: 'retail',
        barcode: bc,
        article_number: existingProduct?.article_number?.trim() || bc,
        track_stock: existingProduct?.track_stock ?? true,
        stock_quantity: existingProduct?.track_stock
          ? Math.max(0, Math.floor(Number(existingProduct.stock_quantity) || 0))
          : 0,
        low_stock_threshold: existingProduct?.low_stock_threshold ?? 5,
        retail_sale_unit: retailSaleUnit || 'stuk',
        retail_unit_quantity: unitQty > 0 ? unitQty : null,
      }

      const { data: saved, error: saveErr } = await saveMenuProduct(payload)
      if (!saved) {
        setError(saveErr || t('adminPages.productIntake.saveFailed'))
        return false
      }
      setSuccess(
        existingProduct
          ? t('adminPages.productIntake.updatedSuccess')
          : t('adminPages.productIntake.createdSuccess'),
      )
      await loadCatalog()
      setExistingProduct(saved)
      return true
    } catch {
      setError(t('adminPages.productIntake.saveFailed'))
      return false
    } finally {
      setSaving(false)
    }
  }

  const headerHint = useMemo(() => {
    if (existingProduct) return t('adminPages.productIntake.existingProductHint')
    return t('adminPages.productIntake.newProductHint')
  }, [existingProduct, t])

  if (!retailOn) {
    return (
      <PinGate tenant={tenant}>
        <div className="mx-auto max-w-lg px-4 py-12 text-center">
          <p className="text-gray-600 mb-6">{t('adminPages.productIntake.retailModuleRequired')}</p>
          <Link
            href={`/shop/${tenant}/admin/producten`}
            className="text-blue-700 font-semibold underline"
          >
            {t('adminPages.productIntake.backToProducts')}
          </Link>
        </div>
      </PinGate>
    )
  }

  if (loading) {
    return (
      <PinGate tenant={tenant}>
        <div className="flex min-h-[50vh] items-center justify-center text-gray-500">
          {t('adminPages.common.loading')}
        </div>
      </PinGate>
    )
  }

  return (
    <PinGate tenant={tenant}>
      <div className="mx-auto max-w-lg px-4 pb-24 pt-4">
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-gray-900">{t('adminPages.productIntake.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{headerHint}</p>
          </div>
          <Link
            href={`/shop/${tenant}/admin/producten?mode=retail`}
            className="shrink-0 text-sm font-medium text-blue-700 underline"
          >
            {t('adminPages.productIntake.backToProducts')}
          </Link>
        </div>

        {error ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
            {success}
          </div>
        ) : null}

        <div className="space-y-5">
          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              {t('adminPages.producten.barcode')} <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="off"
              value={barcode}
              onChange={(e) => setBarcode(normalizeRetailProductBarcode(e.target.value))}
              onBlur={() => applyBarcode(barcode)}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 font-mono text-lg tabular-nums"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => wedgeRef.current?.focus({ preventScroll: true })}
                className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-semibold"
              >
                {t('adminPages.producten.scanProductButton')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (cameraScanActive) stopCameraScan()
                  else void startCameraScan()
                }}
                className={`rounded-xl border px-4 py-2.5 text-sm font-semibold ${
                  cameraScanActive
                    ? 'border-blue-600 bg-blue-50 text-blue-800'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {cameraScanActive
                  ? t('adminPages.productIntake.stopCameraScan')
                  : t('adminPages.productIntake.startCameraScan')}
              </button>
            </div>
            <input
              ref={wedgeRef}
              type="text"
              tabIndex={-1}
              aria-hidden
              className="fixed left-0 top-0 h-px w-px opacity-0 overflow-hidden"
              onKeyDown={onWedgeKeyDown}
            />
            {cameraScanActive ? (
              <div className="mt-3 overflow-hidden rounded-xl bg-black">
                <video ref={videoRef} className="w-full max-h-48 object-cover" playsInline muted />
              </div>
            ) : null}
            {eanBusy ? (
              <p className="mt-2 text-xs text-gray-500">{t('adminPages.productIntake.eanLookupBusy')}</p>
            ) : null}
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              {t('adminPages.productIntake.photoLabel')}
            </label>
            <button
              type="button"
              disabled={photoBusy}
              onClick={() => photoInputRef.current?.click()}
              className="relative flex w-full aspect-square max-h-56 items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50"
            >
              {photoBusy ? (
                <span className="text-sm text-blue-600">{t('mediaPicker.uploading')}</span>
              ) : imageUrl ? (
                <Image src={imageUrl} alt="" fill className="object-cover" unoptimized />
              ) : (
                <span className="text-center text-gray-500">
                  <span className="text-3xl block mb-1">📷</span>
                  <span className="text-sm">{t('adminPages.productIntake.takePhoto')}</span>
                </span>
              )}
            </button>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void onPhotoSelected(e)}
            />
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm space-y-3">
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                {t('adminPages.producten.name')} <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                {t('adminPages.producten.price')} <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-500">€</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 py-3 pl-8 pr-4 font-semibold"
                  placeholder="0,00"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-800 mb-1">
                {t('adminPages.producten.category')}
              </label>
              <select
                value={categoryId || ''}
                onChange={(e) => setCategoryId(e.target.value || null)}
                className="w-full rounded-xl border border-gray-200 px-4 py-3 bg-white"
              >
                <option value="" />
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('adminPages.producten.retailSaleUnitLabel')}
                </label>
                <select
                  value={retailSaleUnit || 'stuk'}
                  onChange={(e) =>
                    setRetailSaleUnit(e.target.value as MenuProduct['retail_sale_unit'])
                  }
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 bg-white text-sm"
                >
                  <option value="stuk">{t('adminPages.producten.retailSaleUnit_stuk')}</option>
                  <option value="doos">{t('adminPages.producten.retailSaleUnit_doos')}</option>
                  <option value="bak">{t('adminPages.producten.retailSaleUnit_bak')}</option>
                  <option value="pallet">{t('adminPages.producten.retailSaleUnit_pallet')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('adminPages.producten.retailUnitQuantityLabel')}
                </label>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={retailUnitQty}
                  onChange={(e) => setRetailUnitQty(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </div>
            </div>
          </section>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="w-full rounded-2xl bg-blue-700 py-4 text-lg font-bold text-white disabled:opacity-60"
            >
              {saving ? t('adminPages.common.saving') : t('adminPages.productIntake.saveButton')}
            </button>
            <button
              type="button"
              onClick={async () => {
                const ok = await handleSave()
                if (ok) router.push(`/shop/${tenant}/admin/retail-kassa`)
              }}
              className="w-full rounded-2xl border border-gray-200 bg-white py-3 font-semibold text-gray-800"
            >
              {t('adminPages.productIntake.saveAndOpenKassa')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="w-full py-2 text-sm font-medium text-gray-500"
            >
              {t('adminPages.productIntake.resetForm')}
            </button>
          </div>
        </div>
      </div>
    </PinGate>
  )
}
