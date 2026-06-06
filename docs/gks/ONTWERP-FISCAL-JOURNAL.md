# Technisch ontwerp: `fiscal_journal` (Checkbox FDM)

**Doel:** append-only fiscale waarheid per tenant — GraphQL request/response naar Checkbox FDM, los van commerciële `orders`.

**Geen implementatiecode** — alleen schema en regels.

---

## 1. SQL-schema (voorstel)

```sql
CREATE TABLE public.fiscal_journal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  tenant_slug TEXT NOT NULL,

  -- Workflow
  status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (status IN ('PENDING', 'SENT', 'SUCCESS', 'FAILED')),
  mutation TEXT NOT NULL
    CHECK (mutation IN (
      'signOrder',
      'signPreBill',
      'signSale',
      'signInvoice',
      'signCopy',
      'signReportTurnoverZ'
    )),
  event_label CHAR(1) NOT NULL
    CHECK (event_label IN ('N', 'P', 'I', 'C', 'R')),

  -- Idempotentie (FDM “vijf sleutels” + client)
  pos_id TEXT NOT NULL,
  terminal_id TEXT NOT NULL,
  device_id TEXT NOT NULL,
  pos_fiscal_ticket_no INTEGER NOT NULL
    CHECK (pos_fiscal_ticket_no >= 1 AND pos_fiscal_ticket_no <= 999999999),
  pos_date_time TIMESTAMPTZ NOT NULL,
  idempotency_key UUID NOT NULL,

  -- Context GKS
  booking_period_id UUID NOT NULL,
  booking_date DATE NOT NULL,
  employee_id CHAR(11) NOT NULL,
  ticket_medium TEXT NOT NULL DEFAULT 'PAPER',

  -- Optioneel (tafel / terugname / kopie / factuur)
  cost_center_reference TEXT,
  cost_center_id TEXT,
  cost_center_type TEXT,
  fdm_refs JSONB,

  -- Payloads (onveranderlijk na SUCCESS)
  request_payload JSONB NOT NULL,
  response_payload JSONB,
  error_payload JSONB,

  -- Denormalisatie na SUCCESS (zoeken / audit)
  fdm_id TEXT,
  fdm_date_time TIMESTAMPTZ,
  fdm_event_counter INTEGER,
  fdm_total_counter INTEGER,
  short_signature TEXT,
  verification_url TEXT,

  -- Retry-keten (nieuwe rij, geen UPDATE op fiscale totalen)
  retry_of_id UUID REFERENCES public.fiscal_journal (id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_fiscal_journal_tenant_created
  ON public.fiscal_journal (tenant_slug, created_at DESC);

CREATE INDEX idx_fiscal_journal_tenant_status
  ON public.fiscal_journal (tenant_slug, status)
  WHERE status IN ('PENDING', 'SENT', 'FAILED');

CREATE INDEX idx_fiscal_journal_tenant_booking
  ON public.fiscal_journal (tenant_slug, booking_date, event_label);

CREATE INDEX idx_fiscal_journal_tenant_pos_ticket
  ON public.fiscal_journal (tenant_slug, pos_fiscal_ticket_no);

-- Dubbele succesvolle fiscalisatie blokkeren (FDM-vijf-sleutels)
CREATE UNIQUE INDEX uq_fiscal_journal_fdm_success_keys
  ON public.fiscal_journal (
    tenant_slug,
    pos_id,
    terminal_id,
    event_label,
    pos_fiscal_ticket_no,
    pos_date_time
  )
  WHERE status = 'SUCCESS';

-- Eén client-idempotency per tenant
CREATE UNIQUE INDEX uq_fiscal_journal_idempotency
  ON public.fiscal_journal (tenant_slug, idempotency_key);

-- Optioneel: één open PENDING/SENT per idempotency (geen parallelle dubbele calls)
CREATE UNIQUE INDEX uq_fiscal_journal_inflight_idempotency
  ON public.fiscal_journal (tenant_slug, idempotency_key)
  WHERE status IN ('PENDING', 'SENT');

ALTER TABLE public.fiscal_journal ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.fiscal_journal IS
  'Append-only GKS/FDM journal: Checkbox GraphQL sign* requests en SignResult; geen vervanging van orders.';
```

---

## 2. Uitleg per veld

| Veld | Uitleg |
|------|--------|
| `id` | Interne primaire sleutel journal-entry. |
| `tenant_slug` | Multi-tenant scheiding; elke query filtert hierop. |
| `status` | Levenscyclus FDM-call (zie §4). |
| `mutation` | GraphQL-mutatie naam (`signSale`, …). |
| `event_label` | FDM-label `N`/`P`/`I`/`C`/`R` (MB). |
| `pos_id` | GKS-serienummer POS (CFOD…). |
| `terminal_id` | Terminal binnen POS-installatie. |
| `device_id` | Fysiek/logisch invoertoestel. |
| `pos_fiscal_ticket_no` | Doorlopend fiscaal ticketnummer POS (globaal per terminal). |
| `pos_date_time` | Tijdstip event op POS (Brussel, RFC3339). |
| `idempotency_key` | Client-UUID per gebruikersactie (retry = nieuwe rij + `retry_of_id`). |
| `booking_period_id` | Werkingsperiode (GUID, meestal openingsdag). |
| `booking_date` | Boekhoudkundige datum. |
| `employee_id` | INSZ (11 cijfers) → GraphQL `employeeId`. |
| `ticket_medium` | `PAPER` / `DIGITAL` / … |
| `cost_center_*` | Tafel/sessie bij `signOrder` / `signPreBill` / deels `signSale`. |
| `fdm_refs` | Referenties naar eerdere events (`signSale` refund, `signInvoice`, `signCopy`). |
| `request_payload` | Volledige JSON naar FDM (onveranderlijk). |
| `response_payload` | `SignResult` JSON bij succes. |
| `error_payload` | GraphQL errors / FDM warnings bij falen. |
| `fdm_id` … `verification_url` | Snelle audit/QR zonder hele JSON te parsen. |
| `retry_of_id` | Verwijst naar mislukte eerdere entry (append-only). |
| `created_at` / `updated_at` | Audit; `updated_at` alleen voor `status`/metadata. |
| `sent_at` / `completed_at` | FDM round-trip timing. |

**Regel:** na `SUCCESS` geen wijziging van `request_payload`, bedragen in payload, of `response_payload`. Correcties = **nieuwe** rij + nieuw event (MB).

---

## 3. Welke events opslaan

| Mutatie (Checkbox) | `event_label` | Wanneer journal-entry |
|------------------|---------------|------------------------|
| **signOrder** | **P** | Elke onderbroken registratie (tafelmand, delta naar keuken, order op cost center). |
| **signPreBill** | **P** | Voorlopige rekening / rekeningoverzicht vóór betaling (geen lijn-wijziging op dat moment). |
| **signSale** | **N** | Definitieve verkoop / btw-kasticket na betaling. |
| **signInvoice** | **I** | Factuur op basis van één of meer eerder `N` (`fdm_refs`). |
| **signCopy** | **C** | Herafdruk kopie van eerder event (`fdm_refs` → origineel). |
| **signReportTurnoverZ** | **R** | Fiscaal Z-omzetrapport (pilot/production volgens tenant-beleid). |

**Niet in dit schema (later apart of submutatie):** `signWorkIn`/`signWorkOut` (S), `signMoneyInOut` (F), `signReportTurnoverX`, user-Z, …

**Mapping `signPreBill`:** zelfde label **P**, onderscheid via `mutation = signPreBill'`.

---

## 4. Statussen

| Status | Betekenis |
|--------|-----------|
| **PENDING** | Entry aangemaakt; request klaargezet; nog geen HTTP naar FDM. |
| **SENT** | Request verstuurd naar Checkbox `/graphql`; wacht op response. |
| **SUCCESS** | `SignResult` ontvangen; fiscale handtekening geldig; mag bon printen / afronden. |
| **FAILED** | Timeout, GraphQL error, `FDM_NOT_OPERATIONAL`, validatiefout; geen ticket. |

**Toegestane overgangen:** `PENDING` → `SENT` → `SUCCESS` | `FAILED`. Retry = **nieuwe rij** (`retry_of_id`), niet hergebruik van `idempotency_key` bij SUCCESS.

**POS-gedrag:** verkoop afsluiten alleen als er een **SUCCESS** `signSale` bestaat voor die checkout-`idempotency_key` (of expliciete FDM duplicate-success metzelfde vijf sleutels).

---

## 5. Unieke indexen (anti-dubbel)

| Index | Doel |
|-------|------|
| **`uq_fiscal_journal_fdm_success_keys`** | Maximaal **één SUCCESS** per tenant + FDM-vijf-sleutels (`pos_id`, `terminal_id`, `event_label`, `pos_fiscal_ticket_no`, `pos_date_time`). Sluit aan op FDM duplicate-request gedrag. |
| **`uq_fiscal_journal_idempotency`** | Eén journal-rij per client-`idempotency_key` per tenant (geen dubbele checkout-submit). |
| **`uq_fiscal_journal_inflight_idempotency`** (optioneel) | Voorkomt twee parallelle `PENDING`/`SENT` met dezelfde key. |

**Aanvullende applicatieregels (niet index):**

- `pos_fiscal_ticket_no` monotonic per tenant+terminal (toekenning vóór insert PENDING).
- Bij FDM `DUPLICATE_REQUEST`: bestaande SUCCESS-rij opzoeken via vijf sleutels; geen tweede SUCCESS insert.

---

## Samenvatting

`fiscal_journal` is de **fiscale waarheid** naast `orders`; Checkbox-integratie schrijft hier **vóór** commerciële side-effects (in GKS-pilot: journal eerst, geen blind mirror). Productie-`orders` blijft buiten dit ontwerp tot bewuste cutover.
