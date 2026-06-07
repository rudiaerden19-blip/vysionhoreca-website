# GKS online/FDM guard — implementatieplan

## Doel

Geen fiscale verkoop in `/shop/{tenant}/gks` zonder internet **en** bereikbare/operationele FDM.

## Bestanden (wijzigingen)

| Bestand | Actie |
|---------|--------|
| `src/lib/gks-kassa/gks-availability.ts` | **Nieuw** — centrale checks |
| `src/lib/gks-kassa/use-gks-availability.ts` | **Nieuw** — polling voor UI |
| `src/lib/gks-kassa/gks-fiscal-flows.ts` | `gksEnsureFdmReady` → `assertGksCanFiscalize` |
| `src/lib/gks-kassa/gks-persist-paid-commercial-order.ts` | Geen offline queue na N |
| `src/lib/gks-kassa/gks-offline-order-queue.ts` | Flush: geen `payment_status=paid` meer syncen als fiscaal |
| `src/lib/gks-kassa/z-sync-safe.ts` | Guard vóór `signReportTurnoverZ` |
| `src/app/shop/[tenant]/gks/page.tsx` | Banner, disable knoppen, guards vóór pay/print |
| `src/components/kassa/KassaPaymentModal.tsx` | Optioneel `payDisabled` (default false → kassa ongewijzigd) |
| `src/components/kassa/KassaSplitPaymentModal.tsx` | Zelfde optioneel `payDisabled` |
| `src/__tests__/lib/gks-availability.test.ts` | **Nieuw** — unit checks |
| `messages/*.json` | `gksAvailability.*` banner + tooltip |

**Niet aanraken:** `src/app/shop/[tenant]/admin/kassa/**`, productie `vysion-kassa-offline` queue.

## Offline flows gevonden (GKS)

| Locatie | Gedrag vandaag |
|---------|----------------|
| `gks-offline-order-queue.ts` | `flushOfflineOrdersToSupabase` → insert `gks_commercial_orders` |
| `gks-persist-paid-commercial-order.ts` | Bij netwerkfout: rij in IDB/LS queue (`queuedOffline: true`) |
| `offline-db.ts` | Menu-cache + order queue KV (alleen GKS DB) |
| `use-gks-kassa-offline-flush-bridge.ts` | Flush bij `online` + SW message |
| `gks/page.tsx` | `useKassaServerOnline` + offline banner (generiek kassa-tekst) |

**Blijft toegestaan:** menu snapshot in IDB, open tafelmand lokaal/commercial **zonder** fiscale SUCCESS.

**Geblokkeerd na guard:** paid orders in offline queue; N/P/Z/C/X fiscaal zonder FDM+internet.

## Fiscale flows geblokkeerd

| Flow | Entry |
|------|--------|
| Afrekenen / betaling | `completePayment` |
| N-verkoop | `gksCompleteSaleN` |
| P tafelmand | `gksPersistTableOrderP` |
| Z-sync | `syncZReportAfterOrderSafe` |
| Fiscaal ticket print | `printReceipt` (niet-draft) |
| Voorlopige bon / draft fiscal | `printReceipt` draft + `gksPersistTableOrderP` |
| Copy / X | Nog geen implementatie in UI (alleen TODO); guard in flows wanneer toegevoegd |

`signPreBill` / `signCopy` / `signReportTurnoverX`: niet direct in UI; partner service blijft, guard via `assertGksCanFiscalize` in flows.

## Fiscal journal

- Geen `mark_success` zonder geslaagde FDM-call (bestaand patroon blijft).
- Bij guard-fail: geen nieuwe pending voor pay; bestaande pending blijft `failed` via bestaande catch-paden.

## Tests (unit)

- `checkInternetOnline` false → status `INTERNET_OFFLINE`
- FDM errors → `FDM_ERROR`
- `assertGksCanFiscalize` blokkeert
- Geen imports uit `admin/kassa`
