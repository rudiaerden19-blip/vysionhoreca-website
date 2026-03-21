# AGENT HANDOVER DOCUMENT
## Vysion Horeca Platform — Volledige technische briefing voor nieuwe AI-agent

> **⚠️ KRITIEKE REGEL VOOR ELKE AGENT:**
> Bouw NOOIT iets zonder eerst te overleggen met de gebruiker. Lees dit document volledig vóór je één regel code aanraakt. Eerdere agents hebben fouten gemaakt door te snel te handelen. Deze codebase heeft 500+ actieve tenants — een fout treft iedereen.

---

## 1. PROJECT IDENTITEIT

| Eigenschap | Waarde |
|---|---|
| **Projectnaam** | Vysion Horeca Platform |
| **Repository** | `vysionhoreca-website` |
| **Framework** | Next.js 14 (App Router) |
| **Taal** | TypeScript (strict) |
| **Database** | Supabase (PostgreSQL + RLS) |
| **Styling** | Tailwind CSS |
| **Hosting/Deploy** | Vercel |
| **Git remote** | `https://github.com/rudiaerden19-blip/vysionhoreca-website` |
| **Hoofdbranch** | `main` |
| **Deploy trigger** | Elke push naar `main` → automatisch Vercel deploy |

---

## 2. HOE COMMITTEN EN DEPLOYEN

```bash
# Altijd eerst builden om type errors te vangen
npm run build

# Daarna committen
git add -A
git commit -m "Beschrijvende commit message"
git push

# → Vercel deploy start automatisch binnen 30 seconden
# → Productie URL: https://vysionhoreca-website.vercel.app (of custom domain)
```

**⚠️ Nooit pushen zonder `npm run build` te laten slagen. Type errors blokkeren de Vercel deploy.**

---

## 3. ARCHITECTUUR OVERZICHT

```
vysionhoreca-website/
├── src/
│   ├── app/                    ← Next.js App Router pages + API routes
│   │   ├── api/                ← ~50 API routes
│   │   ├── shop/[tenant]/      ← Tenant-specifieke shop + admin
│   │   │   └── admin/          ← 40+ admin pagina's per tenant
│   │   ├── kassa/[tenant]/     ← POS kassa systeem
│   │   ├── keuken/[tenant]/    ← Keukenweergave
│   │   ├── superadmin/         ← Platform-beheer
│   │   └── login/              ← Auth pagina's
│   ├── components/             ← Gedeelde React componenten
│   │   ├── KassaReservationsView.tsx   ← HOOFD COMPONENT (4800+ regels)
│   │   └── KassaFloorPlan.tsx          ← Vloerplan component
│   ├── lib/                    ← Utilities, Supabase client, auth
│   └── i18n/                   ← Internationalisatie
├── AGENT_HANDOVER.md           ← Dit document
└── public/                     ← Statische bestanden
```

---

## 4. MULTI-TENANT ARCHITECTUUR — ABSOLUUT VERPLICHT

Dit platform bedient **500+ restaurants** (tenants). Elke tenant heeft zijn eigen data, instellingen en gebruikers.

### 4.1 Hoe werkt de tenant identificatie?

**Via URL parameter:**
```
/shop/frituurrudi/admin/reserveringen
        ↑ dit is de tenant_slug
```

**Via subdomein (middleware rewrite):**
```
frituurrudi.ordervysion.com → intern: /shop/frituurrudi/
```

**Via localStorage (frontend auth):**
```json
localStorage["vysion_tenant"] = {
  "tenant_slug": "frituurrudi",
  "email": "rudi@zaak.be",
  "business_id": "uuid-hier"
}
```

**Via request headers (API routes):**
```
x-business-id: <uuid>
x-auth-email: eigenaar@zaak.be
x-tenant-slug: frituurrudi
```

### 4.2 VERPLICHTE checklist bij elke database-aanroep

**❌ VERBODEN — Zonder tenant filter:**
```typescript
supabase.from('reservations').select('*')
supabase.from('floor_plan_tables').insert({ name: 'Tafel 1' })
```

**✅ VERPLICHT — Altijd filteren:**
```typescript
supabase.from('reservations').select('*').eq('tenant_slug', tenant)
supabase.from('floor_plan_tables').insert({ tenant_slug: tenant, name: 'Tafel 1' })
```

### 4.3 Plan & Trial logica

```typescript
// Hoe Pro-toegang bepalen:
const status = data.subscription_status  // 'trial' | 'active' | 'inactive'
const trialEnd = data.trial_ends_at ? new Date(data.trial_ends_at) : null
const isTrial = (status === 'trial') && trialEnd && trialEnd > new Date()
const isPro = data.plan === 'pro' || status === 'active' || isTrial

// ⚠️ isPro start als FALSE — niet TRUE
// Starter-tenants mogen geen Pro-features zien
```

---

## 5. HOOFD COMPONENT: KassaReservationsView.tsx

**Locatie:** `src/components/KassaReservationsView.tsx`  
**Grootte:** ~4900 regels, 250KB  
**Props:** `tenant: string` (de tenant slug)

Dit is het kloppende hart van het systeem. Het bevat 6 tabs:

| Tab ID | Label | Functie |
|---|---|---|
| `reservations` | Reserveringen | Lijst van alle reserveringen met filters |
| `floorplan` | Plattegrond | Drag & drop vloerplan met live bezetting |
| `timeline` | Tafels | Tijdlijn per tafel (dag/avond) |
| `guests` | Contacten | Gastendatabase |
| `stats` | Rapporten | Statistieken en grafieken |
| `settings` | Instellingen | Reservatie-instellingen |

### 5.1 State architectuur (selectie van de 50+ states)

```typescript
// Kerndata
const [reservations, setReservations] = useState<Reservation[]>([])
const [reservationSettings, setReservationSettings] = useState<ReservationSettings>(DEFAULT_SETTINGS)
const [floorPlanTablesDB, setFloorPlanTablesDB] = useState<FloorPlanTable[]>([])
const [guestProfilesDB, setGuestProfilesDB] = useState<GuestProfile[]>([])

// UI staat
const [viewMode, setViewMode] = useState<ViewMode>('reservations')
const [editReservation, setEditReservation] = useState<Reservation | null>(null)
const [loading, setLoading] = useState(true)

// Reserveringen-view filters
const [resListDate, setResListDate] = useState(...)         // geselecteerde dag
const [resViewFilter, setResViewFilter] = useState<'dag'|'week'|'maand'|'jaar'>('dag')
const [resFilterMonth, setResFilterMonth] = useState(...)
const [resFilterYear, setResFilterYear] = useState(...)
const [resSearch, setResSearch] = useState('')
const [showResCalendar, setShowResCalendar] = useState(false)
const [resCalYear, setResCalYear] = useState(...)

// Vloerplan
const [tablesLocked, setTablesLocked] = useState(...)     // localStorage: floor_tables_locked_{tenant}
const [floorZoom, setFloorZoom] = useState(1)
const [panX, setPanX] = useState(0)
const [panY, setPanY] = useState(0)

// Tijdlijn
const [timeShift, setTimeShift] = useState(...)           // 'dag' of 'avond' — auto op basis van uur
const [timelineNow, setTimelineNow] = useState(new Date())
```

### 5.2 useMemo optimalisaties (geoptimaliseerd)

```typescript
// Niet aanraken zonder reden — deze zijn geoptimaliseerd
const todayReservations = useMemo(...)        // Vandaag's reserveringen
const upcomingReservations = useMemo(...)     // Komende reserveringen
const waitlistReservations = useMemo(...)     // Wachtlijst
const todayStats = useMemo(...)              // Statistieken vandaag
const filteredReservations = useMemo(...)    // Gefilterd op zoek + shift
const guestProfiles = useMemo(...)           // Gastprofielen berekend uit reserveringen
const daysWithRes = useMemo(...)             // Set van datums met reserveringen (kalender dots)
const resViewFiltered = useMemo(...)         // Reserveringen view: gefilterd + gegroepeerd
const resCalMonths = useMemo(...)            // 12 kalendermaanden (sidebar)
```

### 5.3 Auto-refresh

```typescript
// Elke 60 seconden — vergelijkt data vóór re-render
setInterval(async () => {
  const { data } = await supabase.from('reservations')...
  setReservations(prev => {
    const sig = (r) => [r.id, r.status, r.table_number, ...].join('|')
    return JSON.stringify(prev.map(sig)) === JSON.stringify(data.map(sig)) ? prev : data
  })
}, 60_000)
```

### 5.4 CRUD functies

```typescript
loadReservations(silent?)      // Herlaad alle reserveringen
loadGuestProfiles()            // Herlaad gastprofielen
updateStatus(id, status)       // Statuswijziging reservering
handleAddReservation(data)     // Nieuwe reservering aanmaken
handleDeleteReservation(id)    // Reservering verwijderen
handleAssignTable(id, table)   // Tafel toewijzen
```

---

## 6. RESERVERINGEN SYSTEEM — VOLLEDIGE FLOW

### 6.1 Reservering aanmaken (intern via kassa)

```
Gebruiker klikt "+ Reservering"
→ Popup opent (AddReservationModal)
→ Formulier: naam, telefoon, email, datum, tijd, personen, tafel, opmerkingen
→ Overlap-check: controleert of tafel al bezet is op dat tijdstip (+buffer minuten)
→ handleAddReservation():
   1. addReservationInProgress.current = true  ← Voorkomt dubbele submit
   2. INSERT in reservations (met tenant_slug)
   3. UPSERT in guest_profiles (herkenning vaste klant)
   4. Stuur bevestigingsmail via /api/send-reservation-email (ALLEEN als guest_email aanwezig)
   5. loadReservations()
   6. addReservationInProgress.current = false
```

### 6.2 Reservering aanmaken (online via klant)

```
Klant op /shop/[tenant]/reserveren
→ Selecteert datum, tijd, personen
→ Vult naam + contactgegevens in
→ POST naar API (admin-api.ts: createReservation)
→ Cron job /api/cron/reservation-reminders stuurt herinnering 24u van tevoren
```

### 6.3 Email flow — KRITIEK

**❌ VERBODEN:** Emails sturen bij statuswijzigingen (bezet, vertrokken, afgerond, etc.)

**✅ TOEGESTAAN:** Emails ALLEEN bij:
- `confirmed` — Reserveringsbevestiging
- `pending` — Reservering in behandeling
- `cancelled` — Annulering
- `reminder` — Herinnering (via cron)
- `review` — Review verzoek na bezoek

**Whitelist in `/api/send-reservation-email/route.ts`:**
```typescript
const allowed = ['confirmed', 'pending', 'cancelled', 'reminder', 'review']
if (!allowed.includes(status)) {
  return NextResponse.json({ error: 'Ongeldige status — email niet verstuurd' }, { status: 400 })
}
```

### 6.4 Reservering statussen

```typescript
type ReservationStatus =
  | 'PENDING'      // Wacht op bevestiging
  | 'CONFIRMED'    // Bevestigd
  | 'CHECKED_IN'   // Aan tafel gezet
  | 'COMPLETED'    // Afgerond (tafel wordt GROEN op vloerplan)
  | 'NO_SHOW'      // Niet komen opdagen
  | 'CANCELLED'    // Geannuleerd
  | 'WAITLIST'     // Op wachtlijst
```

---

## 7. VLOERPLAN SYSTEEM

### 7.1 Data structuur

```typescript
interface FloorPlanTable {
  id: string
  number: number        // Tafelnummer
  seats: number         // Aantal zitplaatsen
  shape: 'SQUARE' | 'ROUND' | 'RECTANGLE'
  x: number             // Positie in % van canvas breedte
  y: number             // Positie in % van canvas hoogte
}
```

Opgeslagen als JSON in `floor_plan_tables.data` kolom:
```sql
floor_plan_tables (
  tenant_slug TEXT NOT NULL,
  data JSONB               ← Array van FloorPlanTable objecten
)
```

### 7.2 Tafels vergrendelen

```typescript
// localStorage key is TENANT-SPECIFIEK
localStorage.getItem(`floor_tables_locked_${tenant}`)  // ✅
// NOOIT:
localStorage.getItem('floor_tables_locked')             // ❌ — deelt state tussen tenants
```

### 7.3 Tafelkleur op basis van bezetting

```typescript
// COMPLETED → Groen (tafel is vrij)
// CHECKED_IN → Rood (tafel bezet)
// CONFIRMED/PENDING → Oranje (verwacht)
// Geen actieve reservering → Groen
```

---

## 8. TIJDLIJN (TAFELS TAB)

- Horizontale tijdas met tijdsloten
- Elke rij = één tafel
- Reserveringsblokken klikbaar (opens edit popup)
- Automatische selectie:
  - Vóór 17:00 → **Dag** (10:00–16:00)
  - Na 17:00 → **Avond** (17:00–23:00)
- Rode verticale lijn = huidige tijd (beweegt elke minuut)

---

## 9. CONTACTEN TAB (guestprofielen)

- Berekend vanuit alle reserveringen via `useMemo`
- Kolommen: Naam, E-mail, Telefoon, Laatste bezoek, Bezoeken, No-show
- No-show badge: **puur visueel toggle** — rood = no-show, grijs = geen. **Geen backend functie.**
- Zoeken op naam
- Paginering: rijen per pagina instelbaar
- Nieuwe klanten verschijnen automatisch bij eerste reservering

---

## 10. RESERVERINGEN TAB — FILTERS

| Filter | Gedrag |
|---|---|
| **Dag** | Toont reserveringen van geselecteerde dag |
| **Week** | Toont ma–zo van week rond geselecteerde dag, pijltjes = ±1 week |
| **Maand** | Maandpicker popup (Jan–Dec grid) + jaarselectie, toont volledige maand |
| **Jaar** | Toont volledig jaar, pijltjes = ±1 jaar |

**Samenvatting-vak** toont per filter:
- Aantal reserveringen (groot, vetgedrukt)
- Aantal personen (oranje)
- Actieve dagen / gemiddelde groepsgrootte (week/maand/jaar)
- Periode label

**Kalender sidebar:**
- Alle 12 maanden van geselecteerd jaar
- Scrollbaar van Jan tot Dec
- Oranje stip = dag heeft reserveringen
- Klik op dag → lijst toont die dag + filter = 'dag' + kalender sluit

---

## 11. API ROUTES — KRITIEKE REGELS

### 11.1 Email API

**Route:** `POST /api/send-reservation-email`

Verplichte body velden:
```json
{
  "customerEmail": "klant@email.com",
  "customerName": "Jan Peeters",
  "status": "confirmed",
  "reservationDate": "2026-03-21",
  "reservationTime": "19:00",
  "partySize": 4,
  "tenantSlug": "frituurrudi",
  "businessName": "Frituur Rudi"
}
```

### 11.2 WhatsApp API

**Route:** `POST /api/whatsapp/send-confirmation`

Haalt WhatsApp instellingen op per tenant uit `whatsapp_settings` tabel.

### 11.3 Cron jobs (Vercel)

| Route | Frequentie | Doel |
|---|---|---|
| `/api/cron/reservation-reminders` | Dagelijks | Herinneringen 24u voor reservering |
| `/api/cron/subscription-reminders` | Dagelijks | Abonnementsherinneringen |
| `/api/cron/archive-z-reports` | Wekelijks | Z-rapporten archiveren |

---

## 12. SUPABASE TABELLEN (SELECTIE)

| Tabel | Primaire sleutel | Tenant filter |
|---|---|---|
| `tenants` | `id` (uuid) | `slug = tenant` |
| `reservations` | `id` (uuid) | `tenant_slug` |
| `reservation_settings` | `tenant_slug` | `tenant_slug` |
| `guest_profiles` | `id` (uuid) | `tenant_slug` |
| `floor_plan_tables` | `tenant_slug` | `tenant_slug` (1 rij per tenant) |
| `orders` | `id` (uuid) | `tenant_slug` |
| `menu_products` | `id` (uuid) | `tenant_slug` |

---

## 13. AUTHENTICATIE FLOW

```
1. Eigenaar logt in via POST /api/auth/login
2. Server checkt business_profiles (email + bcrypt wachtwoord)
3. Response: { tenant: { tenant_slug, business_id, email } }
4. Frontend slaat op in localStorage["vysion_tenant"]
5. Elke API call stuurt headers mee:
   - x-business-id
   - x-auth-email
   - x-tenant-slug
6. Server verifieert via verifyTenantAccess() in lib/verify-tenant-access.ts
```

---

## 14. OPTIMALISATIES DIE GEDAAN ZIJN

### 14.1 Performance

- **`useMemo`** op alle zware berekeningen in KassaReservationsView:
  - `todayReservations`, `upcomingReservations`, `waitlistReservations`
  - `filteredReservations`, `guestProfiles`, `todayStats`
  - `daysWithRes`, `resViewFiltered`, `resCalMonths`
- **Auto-refresh** vergelijkt data via signature hash → geen onnodige re-renders
- **`addReservationInProgress` ref** → voorkomt dubbele reserveringen bij dubbele klik

### 14.2 Bug fixes

- `isPro` start als `false` (niet `true`) → starter-tenants zien geen Pro-features tijdens load
- `localStorage` keys zijn tenant-specifiek: `floor_tables_locked_{tenant}`
- UTC datum bug → lokale datum gebruikt (`new Date().getFullYear()...`) ipv `toISOString()`
- `JSON.parse` altijd in try/catch (corrupted localStorage breekt app niet meer)
- Alle Supabase `.then()` chains omgezet naar `async/await` met try/catch
- Email API heeft server-side whitelist → enkel toegestane statussen sturen mail
- `handleAddReservation` heeft guard via `useRef` → geen dubbele submits

### 14.3 Multi-tenant correcties

- Alle Supabase queries gefilterd op `tenant_slug` (geauditeerd)
- `floor_tables_locked` localStorage key is nu `floor_tables_locked_{tenant}`
- `reservation_settings` localStorage key was al tenant-specifiek

---

## 15. RESPONSIVE DESIGN

| Scherm | Gedrag |
|---|---|
| **Desktop (1280px+)** | Volledige layout, alle labels zichtbaar |
| **iPad (768px–1024px)** | Tab labels verborgen → alleen iconen |
| **Mobiel (<768px)** | Kalender opent als fullscreen overlay met × sluitknop |

Tab-balk: `overflow-x-auto` → scrolt horizontaal als te smal.

---

## 16. VERBODEN ACTIES VOOR NIEUWE AGENTS

**❌ ABSOLUUT VERBODEN:**
1. Iets bouwen of wijzigen zonder eerst te vragen
2. Queries zonder `tenant_slug` filter
3. `isPro` starten als `true`
4. `localStorage` keys zonder tenant prefix
5. Emails sturen bij statuswijzigingen (alleen `confirmed/pending/cancelled/reminder/review`)
6. `useMemo` of `useEffect` hooks conditioneel aanroepen
7. Pushen zonder `npm run build` te laten slagen
8. Force push naar `main`
9. Grote blokken code verwijderen zonder git backup
10. IIFEs in render met zware berekeningen (gebruik `useMemo` bovenaan component)

**⚠️ ALTIJD OVERLEGGEN VOOR:**
- Nieuwe database tabellen of kolommen
- Wijzigingen aan de auth flow
- Wijzigingen aan email-logica
- Toevoegen van nieuwe API routes
- Refactoring van KassaReservationsView.tsx (enorm bestand)
- Wijzigingen die alle tenants beïnvloeden
- Cron job aanpassingen

---

## 17. OMGEVINGSVARIABELEN

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Sentry (error monitoring)
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# WhatsApp
WHATSAPP_VERIFY_TOKEN=

# Legacy auth
PASSWORD_LEGACY_SALT=
```

---

## 18. GIT WORKFLOW

```bash
# Normale feature
git add -A
git commit -m "Korte beschrijving van wijziging"
git push

# Controleer altijd eerst
npm run build   # Moet slagen
git status      # Controleer wat je commit

# Nooit
git push --force               # ❌
git commit --amend (na push)   # ❌
git reset --hard HEAD~1        # ❌ zonder overleg
```

---

## 19. DEBUGGING TIPS

```typescript
// Email debugging: logs in /api/send-reservation-email
console.log('[send-reservation-email] Aangeroepen:', {
  status, customerEmail, customerName,
  referer, origin, userAgent
})

// Reserveringen laden
loadReservations()         // Met loading spinner
loadReservations(true)     // Silent (achtergrond, geen spinner)

// Tenant check in component
const tenant = props.tenant  // Altijd via props, nooit hardcoded
```

---

## 20. CONTACTINFO & CONTEXT

- **Eigenaar:** Rudi Aerden
- **Taal in code:** Nederlands (labels, comments, variabelenamen)
- **Taal communicatie:** Nederlands
- **Doel:** Beter dan Zenchef/Resengo bouwen — moderne, snelle horeca-software
- **Stijl:** Oranje als hoofdkleur (`orange-500`), donkerblauw (`#3C4D6B`) voor actieve tabs
- **Tone:** Directief, geen overbodige uitleg, toon resultaten

---

*Document aangemaakt op 21 maart 2026 — KassaReservationsView versie na audit & optimalisatie*
