# Phase 1 — Deployment Playbook (Vysion Horeca)

**Doel:** RLS-lockdown + audit-log + admin-DB-proxy in productie zetten **zonder de live tenants te breken**.

> **Belangrijk:** lees dit hele document eerst door. Nooit live in productie zonder eerst staging.

---

## 0 · Context

Wat je gaat uitrollen (in deze volgorde):

1. SQL-migratie `20260510120000_phase1_secure_rls_lockdown.sql` — vervangt alle "FOR ALL USING (true)" door tenant-scoped + service-role policies
2. SQL-migratie `20260510120100_phase1_audit_log.sql` — audit-tabel
3. Code-deploy met:
   - `src/app/api/admin/db/route.ts` (de proxy)
   - `src/lib/admin-db-client.ts` (client wrapper)
   - `src/lib/admin-db-proxy-spec.ts` (whitelist)
   - `src/lib/audit-log.ts`
   - Aangepaste `saveTenantSettings`, `saveDeliverySettings`, `saveMenuCategory`, `saveMenuProduct`, `deleteMenuCategory`, `deleteMenuProduct`, `saveOpeningHours`

Na uitrol:
- ✅ Anon-key kan **GEEN** `business_profiles`, `staff`, `z_reports`, `super_admins`, … meer lezen
- ✅ Anon-key kan **GEEN** UPDATE/DELETE meer doen op `orders`, `menu_products`, …
- ✅ Admin-pagina's blijven werken: writes gaan via `/api/admin/db` → service-role
- ✅ Klantpaden (menu lezen, order plaatsen) blijven werken
- ✅ Elke admin-mutation komt in `audit_log`

Wat NOG NIET gemigreerd is (komt in Phase 1.5/2):
- 60+ andere `save*`/`delete*` functies in admin-api.ts (qr_codes, gift_cards, promotions, …) gebruiken nog client-side anon-key. Tot ze gemigreerd zijn → **breken zodra de RLS-lockdown live is**.
- Ergo: Phase 1 uitrol = code-deploy + RLS-migratie in **één coördinatie**, niet apart.

---

## 1 · Pre-flight check (in Supabase Dashboard)

1. **Backup** je productie-DB:
   - Dashboard → Database → Backups → "Create backup now"
   - Wacht tot de backup klaar is (groen vinkje)
2. **Bevestig dat je service_role-key in Vercel ingesteld is**:
   - Vercel → Project → Settings → Environment Variables
   - `SUPABASE_SERVICE_ROLE_KEY` voor zowel Production als Preview
3. **Bevestig dat Upstash Redis live is** (rate-limit op de proxy):
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

---

## 2 · STAGING uitrol

Doe ALLES eerst op een staging-omgeving. Geen uitzondering.

### 2.1 Staging-DB voorbereiden

Als je nog geen staging-DB hebt: maak een tweede Supabase-project ("vysion-staging"), dump de productie-DB en restore in staging.

```bash
# Pseudocode — exacte commando's afhankelijk van je Supabase plan
pg_dump  $PROD_URL  | psql $STAGING_URL
```

### 2.2 Migraties draaien op staging

Open Supabase Dashboard van **staging** → SQL Editor → New Query.

```sql
-- 1
\i 20260510120000_phase1_secure_rls_lockdown.sql

-- 2
\i 20260510120100_phase1_audit_log.sql
```

(Of plak gewoon de inhoud van elk bestand één voor één.)

### 2.3 Verifieer policies

```sql
SELECT * FROM v_phase1_rls_status WHERE NOT rls_enabled OR policy_count = 0;
```

→ moet een **lege set** geven. Als er rijen verschijnen: tabel mist nog een policy. Voeg toe naar de lockdown-migratie en draai opnieuw.

### 2.4 Verifieer dat anon-key dichtgesnoerd is

In Supabase Dashboard → API Docs → kopieer de `anon` key. Probeer dan:

```bash
ANON=eyJ...
URL=https://STAGING.supabase.co

# Dit moet FAILEN (lege/error response)
curl -sS "$URL/rest/v1/business_profiles?select=email" -H "apikey: $ANON" | head

# Dit MAG werken (publieke menu)
curl -sS "$URL/rest/v1/menu_products?select=name&tenant_slug=eq.geerkensdrankenhandel&limit=3" -H "apikey: $ANON"
```

### 2.5 Code-deploy naar staging

In Vercel: deploy de Phase 1-branch naar Preview/Staging. Wacht tot build groen is.

### 2.6 Smoke-test op staging (zie sectie 5)

Doe alle stappen in sectie 5 op staging. Pas verder als ALLE stappen ✅ zijn.

---

## 3 · PRODUCTIE uitrol (windows: laag-traffic moment)

Kies een rustig moment (bv. zondag 06:00–08:00). Je hebt naar verwachting 5–15 min downtime van de admin-paneelfuncties die nog niet gemigreerd zijn.

### 3.1 Maintenance-banner op admin (optioneel)

Zet een banner in `tenant_settings` ("onderhoud van 06:00–07:00") als je vindt dat je er een moet zetten. Anders gewoon doorgaan.

### 3.2 SQL-migraties uitvoeren

Supabase Dashboard van **productie** → SQL Editor:

```sql
-- 1: lockdown
-- (plak inhoud van 20260510120000_phase1_secure_rls_lockdown.sql)

-- 2: audit
-- (plak inhoud van 20260510120100_phase1_audit_log.sql)

-- 3: verificatie
SELECT * FROM v_phase1_rls_status WHERE NOT rls_enabled OR policy_count = 0;
```

### 3.3 Code-deploy

Merge je Phase 1-branch naar `main`. Vercel deployed automatisch.

### 3.4 Onmiddellijke smoke-test (sectie 5)

Doorloop sectie 5 binnen **5 minuten** na deploy.

---

## 4 · ROLLBACK-procedure

Als iets misgaat:

### 4.1 Code rollback

Vercel Dashboard → Deployments → vorige deploy → "Promote to Production".

### 4.2 SQL rollback

Voer dit uit in Supabase SQL Editor om de oude permissieve policies terug te zetten:

```sql
-- Drop alles dat we toegevoegd hebben
DO $$ DECLARE r record;
BEGIN
  FOR r IN SELECT polname, schemaname || '.' || tablename AS tbl
             FROM pg_policies
            WHERE schemaname='public'
              AND polname LIKE ANY (ARRAY['%_public_read','%_public_insert','%_service_role_all'])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s', r.polname, r.tbl);
  END LOOP;
END$$;

-- Plak de inhoud van supabase/FIX_ALL_RLS_POLICIES.sql om de oude (permissieve)
-- policies terug te zetten. Dit is een NOOD-rollback; je hebt na rollback weer
-- het oude security-risico.
```

> Na rollback: stuur een Sentry-issue / Slack-bericht zodat je weet waarom het ontspoorde, en plan opnieuw.

---

## 5 · Smoke-test checklist

Loop dit door, op staging EERST en daarna onmiddellijk na productie-deploy.

### 5.1 Klant-flow (anon)

- [ ] `tenant.ordervysion.com` opent en toont de menu
- [ ] Voeg een item toe aan winkelwagen
- [ ] Plaats een bestelling → komt in `orders`
- [ ] Bevestigingspagina laadt
- [ ] Maak een reservering (als enabled)

### 5.2 Admin-flow (eigenaar-login)

- [ ] Login via `/login` werkt
- [ ] `/shop/{tenant}/admin/kassa` opent
- [ ] **Test: tenant_settings opslaan** (Profiel → opslaan) → succes
- [ ] **Test: openingstijden aanpassen + opslaan** → succes
- [ ] **Test: nieuwe categorie aanmaken** → succes
- [ ] **Test: nieuw product aanmaken + bewerken + verwijderen** → succes
- [ ] **Test: levering-instellingen opslaan** → succes
- [ ] Open een bestelling, check Z-rapport werkt

### 5.3 Audit-log gevuld

```sql
SELECT created_at, tenant_slug, actor_email, action, resource_type, resource_id
  FROM audit_log
 ORDER BY created_at DESC
 LIMIT 20;
```

→ moet rijen tonen die overeenkomen met de stappen uit 5.2.

### 5.4 Sensitieve data afgesloten

```bash
ANON=eyJ...
URL=https://prod.supabase.co
# Onderstaande moeten ALLE FALEN met "permission denied" of lege response:
curl "$URL/rest/v1/business_profiles?select=email" -H "apikey: $ANON"
curl "$URL/rest/v1/super_admins?select=*"          -H "apikey: $ANON"
curl "$URL/rest/v1/staff?select=*"                 -H "apikey: $ANON"
curl "$URL/rest/v1/z_reports?select=*"             -H "apikey: $ANON"
curl "$URL/rest/v1/timesheet_entries?select=*"     -H "apikey: $ANON"
```

### 5.5 Sentry & Vercel logs

- [ ] Sentry errors-rate niet hoger dan baseline in 30 min na deploy
- [ ] Vercel logs: geen 500-storm op `/api/admin/db`

---

## 6 · Phase 1.5 — wat er nog volgt (binnen 1–2 weken)

Na Phase 1 is je DB veilig, maar je hebt nog niet alle admin-functies gemigreerd. Lijst van wat nog bezig is met de anon-key (en dus zal **falen** voor admin-pagina's tot we ze migreren):

| Bestand | Functies (richtgetal) |
|---|---|
| `admin-api.ts` | `saveStaff`, `deleteStaff`, `saveTimesheetEntry`, `saveZReport`, `saveTeamMember`, `saveQrCode`, `saveGiftCard`, `saveLoyaltyReward`, `savePromotion`, `saveReview`, `saveShopCustomer`, … |
| `admin-api-order-operations.ts` | `updateOrderStatus`, `confirmOrder`, `rejectOrder`, `regenerateZReportForDate` |
| `admin-api-exceptional-closings.ts` | `saveExceptionalClosing`, `deleteExceptionalClosing` |
| Diverse `page.tsx` met inline `supabase.from(...).upsert/update/delete` | bv. `kassa/page.tsx` (insert order), `kasboek/page.tsx`, … |

**Strategie:**

- Voor elke functie: kopieer naar `adminDb.{insert,update,upsert,delete}` patroon
- Voeg de tabel toe aan `ADMIN_DB_TABLES` whitelist in `admin-db-proxy-spec.ts`
- Smoke-test elke pagina

**Tussentijds:** klant-paden (menu, order, reservering) blijven werken want anon-key heeft daarvoor publieke INSERT/SELECT policies. Dus klantgerichte schade is **nul**.

---

## 7 · Phase 2 (later, niet kritiek)

- Eén auth-systeem (kies Supabase Auth JWT, deprecate header-based)
- Backups verifiëren (PITR, restore-drill)
- Per-tenant rate-limit (op `tenant_slug` ipv `business_id`)
- Splits mega-files (kassa, KassaReservationsView)
- Sub-resource API-routes per resource (cleaner dan generieke proxy)

---

## Contact

Bij twijfel: rollback eerst, vragen later. Een paar uur extra downtime is altijd minder erg dan een datalek dat we niet kunnen terugdraaien.
