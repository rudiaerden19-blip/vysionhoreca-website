# Vysion Horeca — briefing voor nieuwe AI-agent

**Project:** vysionhoreca-website · **500+ tenants** · Next.js op Vercel · Supabase  
**Datum briefing:** juni 2026 · **Repo-regels:** `.cursor/rules/*.mdc` (altijd actief in Cursor)

---

## 1. Algemene regel (eigenaar)

- Overleg vóór grote wijzigingen; geen snelle hacks die alle tenants raken.
- **Multi-tenant:** elke query/filter met `tenant_slug`; nooit hardcoded demo-slug.
- **Commit/push:** alleen wanneer de gebruiker dat vraagt (tenzij projectregels in die sessie anders zeggen).

---

## 2. Productie-kassa vs GKS — het belangrijkste

### Klant-URL (vast)

- Elke zaak gebruikt **altijd** het verkoopscherm: **`/shop/{tenant}/admin/kassa`** (subdomein of pad; zie `getAdminKassaEntryHref` in `src/lib/tenant-modules.ts`).
- **Geen** menu, welkom, demo of tenant-flow naar **`/admin/gks-kassa`**.
- **Nooit** `/admin/kassa` redirecten of vervangen door `gks-kassa` zonder **expliciete** opdracht van de eigenaar.

### Zelfde Vercel-deploy ≠ andere kassa voor klanten

- Eén GitHub-repo → één Vercel-build → **alle** tenants krijgen dezelfde code.
- Deploy voegt routes toe; het **vervangt** de klant-kassa niet.
- **`/admin/kassa`** = productie-POS (bestaande klanten).
- **`/admin/gks-kassa`** = intern/cert-pilot; alleen wie die URL **bewust** opent.

### Waar code wijzigen

| NIET (zonder expliciet verzoek) | WEL voor GKS |
|--------------------------------|--------------|
| `src/app/shop/[tenant]/admin/kassa/**` | `src/app/shop/[tenant]/admin/gks-kassa/**` |
| GKS-pad schrijft naar `orders` of `z_reports` | `gks_commercial_orders` via `POST /api/gks-kassa/commercial-orders` |
| Gedeelde kassa-libs breken | `src/lib/gks-kassa/**` (offline, Z-sync no-op, `gks_*` storage) |

**Check vóór afronden GKS-werk:**

```bash
git diff -- 'src/app/shop/[tenant]/admin/kassa/'
# moet leeg zijn
```

### Runtime-isolatie (GKS)

| Productie | GKS |
|-----------|-----|
| `admin/kassa/page.tsx` | `admin/gks-kassa/page.tsx` |
| Tabel `orders` | `gks_commercial_orders` |
| `kassa-z-sync-safe` → `z_reports` | `gks-kassa/z-sync-safe` (no-op) |
| IDB `vysion-kassa-offline` | `vysion-gks-kassa-offline` |
| localStorage `vysion_*` | `gks_*` |

Nog gedeeld (bewust): menu lezen via `admin-api`; plattegrond server read-only vanuit GKS (geen `floor_plan_tables` upsert); print via `sendToVysionPrintAgent` (lokaal). Webshop-alarm op productie-`orders` is uit in GKS-pagina.

Cursor-regel: `.cursor/rules/gks-vs-production-kassa.mdc`

---

## 3. Print Agent — nooit aanraken

- **Geen wijzigingen** onder `apps/vysion-print-agent/**` tenzij de gebruiker in **dezelfde opdracht** expliciet dat pad noemt.
- **Niet committen** van print-agent-bestanden.
- Bon/print-fixes in **`src/`** (o.a. `vysion-print-agent-client.ts`), niet in de Electron-app.

Cursor-regel: `.cursor/rules/no-print-agent.mdc`

---

## 4. GitHub · Vercel · Supabase

### Flow

```
Lokaal (src + supabase/migrations)
  → git push GitHub (main)
  → Vercel build (automatisch)
  → Browser: /admin/kassa (klanten) en /admin/gks-kassa (pilot)

Supabase: migratie apart draaien (niet automatisch via Vercel)
  → tabel gks_commercial_orders
```

### GitHub — typische GKS-paden

- `src/app/shop/[tenant]/admin/gks-kassa/`
- `src/app/api/gks-kassa/commercial-orders/route.ts`
- `src/lib/gks-kassa/*`, `src/lib/use-gks-kassa-offline-flush-bridge.ts`
- `supabase/migrations/20260606120000_gks_commercial_orders_isolated.sql`
- `docs/gks/*`

**Niet** in cloud-deploy: `apps/vysion-print-agent/**`

### Vercel — deploys bekijken

1. https://vercel.com → project **vysionhoreca-website**
2. Tab **Deployments** → Production (main) en Preview (PR/branch)
3. Status Ready + **Visit** voor test-URL

Productie-URL (indicatief): `https://vysionhoreca-website.vercel.app` of custom domain. Sandbox: preview-URL (zie `TESTRAPORT.md`).

### Supabase

- Migratiebestand: `supabase/migrations/20260606120000_gks_commercial_orders_isolated.sql`
- Toepassen: `supabase db push` of SQL Editor in dashboard
- Zonder migratie faalt de GKS commercial-orders API

| Tabel | Productie-kassa | GKS-kassa |
|-------|-----------------|-----------|
| `orders` | Ja | Nee |
| `z_reports` | Ja | Nee (Z-sync no-op) |
| `gks_commercial_orders` | Nee | Ja |

### Deploy-volgorde (GKS)

1. `npx tsc --noEmit` (bij TS-wijzigingen)
2. Commit/push (geen print-agent)
3. Migratie op Supabase
4. Vercel deployment Ready
5. Test `/admin/gks-kassa` op preview
6. Bevestig: geen diff in `admin/kassa/`

---

## 5. Documentatie in de repo

| Bestand | Inhoud |
|---------|--------|
| `AGENT_HANDOVER.md` | Volledige platform-briefing |
| `docs/gks/DEPLOYMENT-MAP.md` | Deploy-map detail |
| `src/lib/gks-kassa/ISOLATION.md` | Isolatie checklist |
| `.cursor/rules/gks-vs-production-kassa.mdc` | Vaste agent-regel GKS |
| `.cursor/rules/no-print-agent.mdc` | Vaste agent-regel print |
| `.cursor/rules/multi-tenant.mdc` | Tenant_slug overal |

---

## 6. Eén zin

**Klanten blijven op `/admin/kassa` en `orders`; GKS is een aparte route en tabel op dezelfde Vercel-app — bouw GKS alleen in `gks-kassa` + `lib/gks-kassa`, raak `admin/kassa` en de print-agent niet.**
