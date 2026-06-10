import type { RetailReceiptI18n } from '@/lib/retail-kassa-receipt'
import ar from '../../../messages/ar.json'
import de from '../../../messages/de.json'
import en from '../../../messages/en.json'
import es from '../../../messages/es.json'
import fr from '../../../messages/fr.json'
import it from '../../../messages/it.json'
import ja from '../../../messages/ja.json'
import nl from '../../../messages/nl.json'
import zh from '../../../messages/zh.json'

type MsgPack = {
  kassaApp: Record<string, string>
  kassaReceipt: Record<string, string>
  retailKassaPage: Record<string, string>
}

const PACKS: Record<string, MsgPack> = {
  nl: nl as MsgPack,
  en: en as MsgPack,
  de: de as MsgPack,
  fr: fr as MsgPack,
  es: es as MsgPack,
  it: it as MsgPack,
  ja: ja as MsgPack,
  zh: zh as MsgPack,
  ar: ar as MsgPack,
}

export function retailReceiptI18nForLocale(locale: string): RetailReceiptI18n {
  const m = PACKS[locale] ?? PACKS.nl
  const k = m.kassaApp
  const r = m.kassaReceipt
  const retail = m.retailKassaPage
  return {
    defaultBusinessName: k.defaultBusinessName ?? 'Winkel',
    orderTypeTakeaway: r.orderTypeTakeaway ?? '',
    receiptNo: r.receiptNo ?? '',
    telPrefix: r.telPrefix ?? '',
    subtotal: r.subtotal ?? '',
    vatLabel: (rate: number) => (r.vat ?? 'BTW {rate}%').replace('{rate}', String(rate)),
    total: r.total ?? '',
    paidWith: r.paidWith ?? '',
    payCash: k.payCash ?? '',
    payCard: k.payCard ?? '',
    payIdeal: k.payIdeal ?? '',
    payBancontact: k.payBancontact ?? '',
    paidSplit: (cash, card) =>
      (r.paidSplit ?? '').replace('{cash}', cash).replace('{card}', card),
    businessVatLabel: (vatNumber) =>
      (r.businessVatLabel ?? '').replace('{vatNumber}', vatNumber),
    thanks: r.thanks ?? '',
    draftBanner: r.draftBanner ?? '',
    draftNotPaid: r.draftNotPaid ?? '',
    draftFooter: r.draftFooter ?? '',
    loyaltyPassLabel: (name) =>
      (retail.receiptLoyaltyPass ?? '').replace('{name}', name),
    loyaltyEarnedLine: (points) =>
      (retail.receiptLoyaltyEarned ?? '').replace('{points}', String(points)),
    loyaltyRedeemedLine: (points) =>
      (retail.receiptLoyaltyRedeemed ?? '').replace('{points}', String(points)),
    loyaltyBalanceLine: (points) =>
      (retail.receiptLoyaltyBalance ?? '').replace('{points}', String(points)),
    helpedByLine: (name) => (r.helpedBy ?? '').replace('{name}', name),
  }
}
