'use client'

import type { TenantSettings } from '@/lib/admin-api'
import type { KassaLastOrderReceipt } from '@/lib/kassa-cart-types'
import { kassaReceiptTableNumber } from '@/lib/kassa-cart-types'
import { useLanguage } from '@/i18n'
import { appLocaleToBcp47 } from '@/lib/print-receipt-html'
import { useEffect, useState } from 'react'

export function KassaSuccessReceiptModal({
  open,
  order,
  tenantInfo,
  locale,
  onClose,
  onPrint,
  printDisabled = false,
}: {
  open: boolean
  order: KassaLastOrderReceipt
  tenantInfo: TenantSettings | null
  locale: string
  onClose: () => void
  onPrint: () => Promise<void>
  /** Voorkom dubbeltik tijdens print / guard-ref sync. */
  printDisabled?: boolean
}) {
  const { t } = useLanguage()
  /** Meteen spinner na tik (parent `printDisabled` komt pas na re-render). */
  const [optimisticPrintBusy, setOptimisticPrintBusy] = useState(false)
  const printBusy = printDisabled || optimisticPrintBusy

  useEffect(() => {
    if (!open) setOptimisticPrintBusy(false)
  }, [open])

  if (!open) return null

  const legacyVatRate =
    typeof tenantInfo?.btw_percentage === 'number' ? tenantInfo.btw_percentage : 6
  const useVatSplit =
    Array.isArray(order.vatSplit) &&
    order.vatSplit.length > 0 &&
    typeof order.subtotalExclVat === 'number' &&
    typeof order.totalTax === 'number'
  const subtotalExcl = useVatSplit
    ? order.subtotalExclVat!
    : order.total / (1 + legacyVatRate / 100)
  const tax = useVatSplit ? order.totalTax! : order.total - subtotalExcl
  const orderTypeLabel =
    order.orderType === 'DINE_IN'
      ? `🍽️ ${t('kassaReceipt.orderTypeDineIn')}`
      : order.orderType === 'TAKEAWAY'
        ? `📦 ${t('kassaReceipt.orderTypeTakeaway')}`
        : `🚗 ${t('kassaReceipt.orderTypeDelivery')}`
  const receiptTableNr = kassaReceiptTableNumber(order.orderType, order.tableNumber)
  const receiptRefSuccess =
    order.checkoutReference ?? (order.orderNumber > 0 ? String(order.orderNumber) : '—')

  const payLabel =
    order.paymentMethod === 'SPLIT'
      ? t('kassaReceipt.paidSplit')
          .replace('{cash}', (order.splitCash ?? 0).toFixed(2))
          .replace('{card}', (order.splitCard ?? 0).toFixed(2))
      : order.paymentMethod === 'CASH'
        ? t('kassaApp.payCash')
        : order.paymentMethod === 'CARD'
          ? t('kassaApp.payCard')
          : order.paymentMethod === 'IDEAL'
            ? t('kassaApp.payIdeal')
            : t('kassaApp.payBancontact')

  const successDateStr = order.createdAt.toLocaleString(appLocaleToBcp47(locale), {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
  const successVatLabelLegacy = t('kassaReceipt.vat').replace('{rate}', String(legacyVatRate))

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl overflow-hidden max-w-md w-full my-4 shadow-2xl">
        <div className="p-4 bg-emerald-500 text-white text-center">
          <div className="w-16 h-16 rounded-full bg-white/20 mx-auto mb-2 flex items-center justify-center text-4xl">✓</div>
          <h3 className="text-xl font-bold">{t('kassaApp.successTitle')}</h3>
          <p className="opacity-80">
            {order.checkoutReference
              ? t('kassaApp.successCheckoutRef').replace('{ref}', order.checkoutReference)
              : t('kassaApp.successOrderLine').replace(/\{number\}/g, String(order.orderNumber))}
          </p>
        </div>

        <div className="p-4 max-h-[50vh] overflow-y-auto">
          <div className="bg-white text-black p-4 rounded-lg max-w-[300px] mx-auto font-mono text-sm">
            <div className="text-center mb-4">
              <h1 className="font-bold text-lg">{tenantInfo?.business_name || t('kassaApp.defaultBusinessName')}</h1>
              {tenantInfo?.address && <p className="text-xs">{tenantInfo.address}</p>}
              {(tenantInfo?.postal_code || tenantInfo?.city) && (
                <p className="text-xs">
                  {tenantInfo?.postal_code} {tenantInfo?.city}
                </p>
              )}
              {tenantInfo?.phone && (
                <p className="text-xs">
                  {t('kassaReceipt.telPrefix')} {tenantInfo.phone}
                </p>
              )}
            </div>
            <div className="border-t-2 border-dashed border-gray-400 my-3" />
            <div className="text-center mb-3">
              <p className="font-bold text-lg">{orderTypeLabel}</p>
              {receiptTableNr ? (
                <p className="font-bold">{t('kassaReceipt.tableLabel').replace(/\{number\}/g, receiptTableNr)}</p>
              ) : null}
            </div>
            <div className="text-xs mb-3">
              <div className="flex justify-between">
                <span>
                  {t('kassaReceipt.receiptNo')}
                  {receiptRefSuccess}
                </span>
                <span>{successDateStr}</span>
              </div>
            </div>
            <div className="border-t border-gray-300 my-2" />
            <div className="space-y-2">
              {order.items.map((item, idx) => {
                const choicesTotal = (item.choices || []).reduce((s, c) => s + c.price, 0)
                const lineTotal = (item.product.price + choicesTotal) * item.quantity
                return (
                  <div key={idx}>
                    <div className="flex justify-between">
                      <div className="flex-1">
                        <span className="font-medium">{item.quantity}x</span> <span>{item.product.name}</span>
                      </div>
                      <span>€{lineTotal.toFixed(2)}</span>
                    </div>
                    {(item.choices || []).length > 0 && (
                      <div className="ml-4 text-xs text-gray-600">
                        {(item.choices || []).map((c, ci) => (
                          <div key={ci} className="flex justify-between">
                            <span>+ {c.choiceName}</span>
                            {c.price > 0 && <span>€{c.price.toFixed(2)}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <div className="border-t border-gray-300 my-3" />
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>{t('kassaReceipt.subtotal')}</span>
                <span>€{subtotalExcl.toFixed(2)}</span>
              </div>
              {useVatSplit && order.vatSplit
                ? order.vatSplit.map((row, ri) => (
                    <div key={`${row.rate}-${ri}`} className="flex justify-between">
                      <span>{t('kassaReceipt.vat').replace('{rate}', String(row.rate))}</span>
                      <span>€{row.tax.toFixed(2)}</span>
                    </div>
                  ))
                : (
                    <div className="flex justify-between">
                      <span>{successVatLabelLegacy}</span>
                      <span>€{tax.toFixed(2)}</span>
                    </div>
                  )}
              <div className="flex justify-between font-bold text-lg border-t border-gray-400 pt-2 mt-2">
                <span>{t('kassaReceipt.total')}</span>
                <span>€{order.total.toFixed(2)}</span>
              </div>
            </div>
            <div className="text-center mt-3 text-xs">
              <p>
                {t('kassaReceipt.paidWith')} {payLabel}
              </p>
            </div>
            {order.retailLoyalty ? (
              <div className="mt-3 space-y-1 border-t border-dashed border-gray-400 pt-3 text-center text-sm">
                {order.retailLoyalty.memberLabel ? (
                  <p className="font-semibold text-gray-900">
                    {t('retailKassaPage.receiptLoyaltyPass').replace(
                      '{name}',
                      order.retailLoyalty.memberLabel,
                    )}
                  </p>
                ) : null}
                {order.retailLoyalty.pointsRedeemed > 0 ? (
                  <p className="text-amber-800">
                    {t('retailKassaPage.receiptLoyaltyRedeemed').replace(
                      '{points}',
                      String(order.retailLoyalty.pointsRedeemed),
                    )}
                  </p>
                ) : null}
                {order.retailLoyalty.pointsEarned > 0 ? (
                  <p className="font-semibold text-emerald-700">
                    {t('retailKassaPage.receiptLoyaltyEarned').replace(
                      '{points}',
                      String(order.retailLoyalty.pointsEarned),
                    )}
                  </p>
                ) : null}
                <p className="font-bold text-gray-900">
                  {t('retailKassaPage.receiptLoyaltyBalance').replace(
                    '{points}',
                    String(order.retailLoyalty.pointsBalance),
                  )}
                </p>
              </div>
            ) : null}
            {order.helpedByStaffName && (
              <div className="text-center mt-3 text-sm font-semibold text-gray-800 px-1">
                {t('kassaReceipt.helpedBy').replace('{name}', order.helpedByStaffName)}
              </div>
            )}
            <div className="border-t-2 border-dashed border-gray-400 my-3" />
            <div className="text-center text-xs">
              {tenantInfo?.btw_number && (
                <p>{t('kassaReceipt.businessVatLabel').replace('{vatNumber}', tenantInfo.btw_number)}</p>
              )}
              <p className="mt-2">{t('kassaReceipt.thanks')}</p>
              {tenantInfo?.website && <p className="mt-1">{tenantInfo.website}</p>}
            </div>
          </div>
        </div>

        <div className="p-4 border-t flex gap-3">
          <button
            type="button"
            disabled={printBusy}
            aria-busy={printBusy}
            onClick={() => {
              if (printBusy) return
              setOptimisticPrintBusy(true)
              void onPrint().finally(() => setOptimisticPrintBusy(false))
            }}
            className={`flex-1 py-3 rounded-xl font-semibold flex items-center justify-center gap-2.5 touch-manipulation min-h-[44px] transition-[background-color,box-shadow,color] duration-200 disabled:pointer-events-none ${
              printBusy
                ? 'cursor-wait bg-emerald-50 text-emerald-900 shadow-[inset_0_0_0_2px_rgba(16,185,129,0.35)]'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 active:bg-gray-300'
            }`}
          >
            {printBusy ? (
              <>
                <svg
                  className="h-5 w-5 shrink-0 animate-spin text-emerald-700"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  aria-hidden
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path
                    className="opacity-90"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span className="tabular-nums">{t('kassaReceipt.printSending')}</span>
              </>
            ) : (
              <>
                <span aria-hidden className="select-none">
                  🖨️
                </span>
                <span>{t('kassaReceipt.print')}</span>
              </>
            )}
          </button>
          <button
            type="button"
            disabled={printBusy}
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-[#3C4D6B] text-white font-bold disabled:opacity-45 disabled:pointer-events-none"
          >
            {t('kassaApp.successClose')}
          </button>
        </div>
      </div>
    </div>
  )
}
