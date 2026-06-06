# Analyse productie-POS → GKS 2.0 + Checkbox FDM

**Scope:** bestaande `/admin/kassa` (niet de GKS-fork). Geen code — alleen feiten uit de codebase.

---

## 1. Bestaande tabellen

### Tickets (verkoop / “bon”)

| Tabel | Rol voor POS-kassa |
|-------|-------------------|
| **`orders`** | **Enige ticket-bron** voor kassa: definitieve verkoop (`status` o.a. `confirmed`, `payment_status` `paid`) én open tafelmand (`status` `open` / `preparing`). `order_number`, totalen, `items` JSONB. |
| `gks_commercial_orders` | Alleen GKS-pilot (los van productie); stap 1 niet als mirror. |
| `z_reports` | Dagafsluiting / Z (commercieel), geen individueel btw-kasticket. |

Er is **geen** aparte `tickets`-tabel.

### Ticketlijnen

| Tabel / veld | Rol |
|--------------|-----|
| **`orders.items`** (JSONB) | **Kassa gebruikt dit.** Regels: `product_id`, `name`, `price`, `quantity`, `btw_percentage`, `options`. |
| **`order_items`** | Genormaliseerde regels; **webshop/groepen**, niet de live kassa-checkout. |

Open tafel =zelfde `orders`-rij met `order_type` `DINE_IN`, `table_number`, `floor_plan_zone`.

### Betalingen

| Tabel / veld | Rol |
|--------------|-----|
| **`orders.payment_method`** | `CASH`, `CARD`, `SPLIT`, … |
| **`orders.payment_status`** | o.a. `paid` / `pending` |
| **`orders.payment_split_cash` / `payment_split_card`** | Split-betaling (kassa) |
| **`orders.total`, `subtotal`, `tax`** | Bedragen; btw berekend in app, niet FDM |

Geen aparte `payments`-tabel voor POS.

### Gebruikers (kassa)

| Tabel | Rol |
|-------|-----|
| **`staff`** | Medewerkers: `name`, `pin`, `tenant_slug`; **`insz`** (migratie GKS) voor `employeeId`. |
| **`staff_clock_sessions`** | In/uitklok (optioneel via `tenant_settings.kassa_staff_clock_enabled`). |
| **`orders.kassa_staff_id`** | Wie de verkoop deed (UUID → `staff`). |

Zaakbeheerder-login = apart auth-systeem; **niet** de GKS `employeeId` op ticket.

---

## 2. Extra velden / structuren voor fiscalisatie (GKS)

**Niet** productie-`orders` als fiscale waarheid overschrijven. Aanbevolen:

### Nieuw (fiscaal journal — append-only)

- Event-type (`N`, `P`, `R`, …)
- `posFiscalTicketNo`, `posId`, `terminalId`, `deviceId`, `bookingPeriodId`, `bookingDate`
- GraphQL **request** + **response** (`SignResult`: `fdmRef`, `vatCalc`, `verificationUrl`, `shortSignature`, …)
- `costCenter.reference` (tafelsessie-GUID)
- `tenant_slug`, timestamp

*(Lokaal gestart: IndexedDB `gks_fiscal_journal`; productie backup later via API/DB-tabel.)*

### `staff`

- **`insz`** (11 cijfers) — verplicht voor GKS-verkoop

### `tenant_settings` / tenant-profiel (later)

- `posId` (CFOD…), `estNo`, vestiging
- Checkbox FDM URL / terminal mapping
- GKS-modus / pilot-flag

### Optioneel op commerciële mirror (later, niet stap 1)

- Koppeling `order` ↔ `fdmRef` — alleen als je na certificatie weer spiegelt

### Catalogus (mapping naar FDM)

- Btw-label **A/B/C/D/X** per product/categorie (nu: `%` in categorie/`items.btw_percentage`)
- `departmentId` / `departmentName` (nu: impliciet via categorie)

---

## 3. Waar het ticket definitief wordt afgesloten (productie-kassa)

| Stap | Bestand | Functie / actie |
|------|---------|------------------|
| **1. Definitieve verkoop** | `src/app/shop/[tenant]/admin/kassa/page.tsx` | **`completePayment`** → `adminDb.insert('orders', …)` met `payment_status: paid`, `status: confirmed` |
| **2. Z-sync (commercieel)** | `src/lib/kassa-z-sync-safe.ts` → `/api/kassa/sync-z-report` | Na geslaagde insert: **`syncZReportAfterOrderSafe`** |
| **3. Offline retry** | `src/lib/kassa-offline-order-queue.ts` | Zelfde insert + Z-sync |
| **4. Bon print** | `kassa/page.tsx` | **`printReceipt`** / `printReceiptHtmlDocument` (na success; geen FDM-handtekening) |
| **5. UI** | `KassaPaymentModal` / `KassaSplitPaymentModal` | Roept `completePayment` aan |

**Niet definitief (onderbroken verkoop / P-equivalent):**

| Bestand | Functie |
|---------|---------|
| `kassa/page.tsx` | **`persistOpenOrderRowToSupabaseImpl`** — `orders` `status: open` (tafelmand) |

**Webshop (buiten fysieke kassa):** `checkout/CheckoutPageClient.tsx` → `orders` `status: new` (geen GKS-stap 1).

---

## 4. Waar Checkbox FDM het best wordt toegevoegd

**Principe:** integratie **niet** in productie-`kassa/page.tsx` eerst; wel in **`/admin/gks-kassa`** + gedeelde services, daarna certificatiepad.

| Laag | Plaats | Mutaties |
|------|--------|----------|
| **FDM-client** | `src/services/gksPartnerService.ts` | GraphQL POST `/graphql`: `status`, `signOrder`, `signPreBill`, `signSale`, `signReportTurnoverZ` (Checkbox) |
| **Orchestratie** | `src/lib/gks-kassa/gks-fiscal-flows.ts` | Vóór commerciële actie: FDM OK → sign → journal |
| **Tafel (P)** | `gks-kassa/page.tsx` ← `persistOpenOrderRow…` | **`signOrder`** vóór keuken/opslag |
| **Afrekenen (N)** | `gks-kassa/page.tsx` ← **`completePayment`** | **`signSale`** vóór bon; **`vatCalc`/QR** op ticket |
| **Z (R)** | Vervanger Z-sync alleen pilot | **`signReportTurnoverZ`** i.p.v. `sync-z-report` op productie-`z_reports` |
| **Journal** | `src/lib/gks-kassa/fiscal-journal.ts` | Append-only request/response |
| **Staff/INSZ** | `/api/gks-kassa/staff` | Login vóór verkoop |
| **Toekomst** | `src/gks/` (fdm, journal, audit) | Server backup, audit-export, cert-dossier |

**Productie-kassa blijft ongewijzigd** tot bewuste cutover; FDM-hook = dezelfde logische punten als hierboven, maar dan in gks-kassa (reeds voorbereid).

---

## Samenvatting

- **Tickets + lijnen + betaling** = één tabel **`orders`** (+ JSONB `items`).
- **Gebruikers kassa** = **`staff`** (+ optioneel **`staff_clock_sessions`**).
- **Definitief afsluiten** = **`completePayment`** in **`admin/kassa/page.tsx`**.
- **Checkbox** = tussen UI en DB op **`gks-kassa`**: `gksPartnerService` + flows vóór insert/print; fiscaal journal naast (niet in plaats van) bestaande `orders` voor live klanten.
