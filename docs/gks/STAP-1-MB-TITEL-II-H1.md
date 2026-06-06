# Stap 1 — MB Titel II, Hoofdstuk 1 (events + POS↔FDM)

Referentie: ministerieel besluit GKS — eventregistratie, nummering, voorwaarden, btw-codes, kasticket, afronding, consolidatie/afdruk, GraphQL FDM.

**Bouwen in:** `/admin/gks-kassa` + `src/gks/` + FDM-client (Checkbox). **Niet:** productie `/admin/kassa`.

---

## 1. Events (labels) → FDM-mutatie

| Label | Gebruik | GraphQL (FDM) | Afdruk |
|-------|---------|---------------|--------|
| **N** | Directe verkoop, afsluiting tafel → btw-kasticket | `signSale` | **BTW-KASTICKET** (verplicht) |
| **N** | Volledige terugname eerder N | `signSale` + `fdmRefs` | REFUND indien alleen negatief |
| **P** | Onderbroken verkoop (tafel, on-hold, web/kiosk parkeren) | `signOrder`, `signCostCenterChange`, `signPreBill` | PRO FORMA + *geen geldig btw-kasticket* |
| **P** | Rekeningoverzicht vóór betaling | `signPreBill` | PRO FORMA + **VOORLOPIGE REKENING** (geen lijn-wijzigingen) |
| **T** | Training | zelfde mutaties + `isTraining: true` | TRAINING + *geen geldig btw-kasticket* |
| **S** | In/uit klok (INSZ) | `signWorkIn` / `signWorkOut` | geen |
| **C** | Kopie ticket | `signCopy` | KOPIE (+ zelfde QR bij kopie N) |
| **I** | Factuur op basis van N | `signInvoice` | FACTUUR (stap later / B2B Peppol) |
| **F** | Louter financieel | `signMoneyInOut`, `signDrawerOpen`, `signPaymentCorrection` | optioneel |
| **R** | X/Z omzet + user | `signReportTurnoverX/Z`, `signReportUserX/Z` | bestand + afdrukbaar |

**Regel:** elk event → **altijd** JSON naar FDM; FDM → `SignResult` (fdmRef, vatCalc bij N, verificationUrl/shortSignature bij N). POS bewaart request + response **append-only**.

---

## 2. Transaction / costCenter (tafel = P)

- **`costCenter`:** `type` (TABLE, CHAIR, …), `id` (bv. T17), **`reference`** (GUID-sessie — alle P’s van één verkoop).
- **`transaction.transactionLines`:** chronologisch naar FDM; correcties = **aparte lijnen**; negatief → `negQuantityReason`.
- **Afdruk** mag geconsolideerd/groeperen; **naar FDM nooit** consolideren.
- **Afsluiting:** alle P’s van een `reference` → één **N** (`signSale`) met totaal (uitz. hotel ROOM via P+transfer).

**Vysion mapping (gks-kassa):** open mand / keuken-delta = **P (`signOrder`) vóór** commerciële mirror; `completePayment` = **N (`signSale`) vóór** `gks_commercial_orders` + bon.

---

## 3. N — btw-kasticket

- GraphQL: chronologische lijnen; btw **labels A/B/C/D/X** per productdeel; POS stuurt **geen** btw-totalen — **`vatCalc` van FDM** op ticket.
- Ticket: **BTW-KASTICKET**, controlegegevens (fdmId, fdmDateTime, eventLabel, counters, shortSignature, footer), QR uit `verificationUrl`.
- **INSZ** in GraphQL (`employeeId`), **niet** op papier. Vast: technicus `00000000097`, robot (web/kiosk/auto Z) `00000000029`.

---

## 4. Voorwaarden (blokkerend)

- Geen verkoop zonder **ingelogde gebruiker** (behalve S mag apart).
- FDM **operationeel** (`query status`); transactie die start mag niet afsluiten **zonder** FDM-handtekening.
- **Event-nummering:** doorlopend (per type / globaal / per terminal — keuze documenteren bij cert).

---

## 5. Betalingen & afronding (N)

- **Cash:** verplicht afronden op 5 cent; `amountType: ROUNDING` op betaallijn.
- **Totaal afronding ticket:** max **±2 cent**.
- Maaltijd/eco/vouchers **eerst**; geen afronding op die lijnen.
- SPLIT / tafel-split: zie MB §7 — **gesplitste betaling** = **één** N; anders meerdere N per consument.

---

## 6. Afdrukregels (kort)

- Alleen **N** en **I** = verplicht geldig ticket naar klant; **R** = bestand + afdruk mogelijk.
- Overige events: optioneel print met *DIT IS GEEN GELDIG BTW-KASTICKET*; P ook **PRO FORMA TICKET**; keukenbon **geen bedragen**; P-keukenbon ook disclaimer.

---

## 7. POS↔FDM transport

- HTTP(S) POST `/graphql`, JSON RFC8259.
- Idempotentie: zelfde 5 sleutels (`posId`, `posDateTime`, `terminalId`, `eventLabel`, `posFiscalTicketNo`) → duplicate of error.

---

## 8. Stap-1 bouwscope (Vysion v1 — af te spitsen met eigenaar)

**Wel in stap 1:** N, P (tafel + pre-bill), T, S, status FDM, Z (R), bewaring GraphQL JSON, kasticket na `signSale`, cash rounding, costCenter `reference`, geen afsluiten zonder FDM.

**Later:** volledige refund-UC, I/Peppol, F (lade), C copy-flow, transfer/hotel, webshop PLATFORM costCenter, composite_product/menu-split regels, alle REPORT X-varianten.

---

## 9. Code-ankers (nu)

| MB-regel | Waar (GKS) |
|----------|------------|
| P vóór mirror | `gks-kassa/page.tsx` — `persistOpenOrderRowToSupabaseImpl` (TODO) |
| N vóór orders | `completePayment` (TODO) |
| Geen prod `orders` | `gks_commercial_orders` API |
| Z | `signReportTurnoverZ` i.p.v. `kassa-z-sync-safe` |
