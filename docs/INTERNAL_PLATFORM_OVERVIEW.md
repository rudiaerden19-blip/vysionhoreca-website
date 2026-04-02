# Intern platformoverzicht (Vysion / OrderVysion)

**Doel:** onboarding en één plek voor architectuur-concepten. Geen gebruikershandleiding.

## 1. Twee manieren om een tenant te bereiken

1. **Pad:** `https://…vercel.app/shop/{tenant-slug}/…` (of hoofddomein)  
2. **Subdomein:** `https://{tenant-slug}.ordervysion.com/…` → middleware **rewrite** naar `/shop/{tenant-slug}/…`

Zie `src/middleware.ts`. Uitzonderingen zonder rewrite o.a.: `/api`, `/dashboard`, `/login`, `/registreer`, `/superadmin`, `/keuken`, bepaalde `/kassa`-achtige paden.

**Gevolg voor ontwikkelaars:** tenant komt uit **`params.tenant`** onder `/shop/[tenant]` na rewrite; API’s krijgen tenant niet automatisch — altijd expliciet filteren of valideren.

## 2. Admin vs dashboard

- **`/shop/{tenant}/admin/*`:** tenant-specifiek admin (grootste deel van de horeca-features). Layout: module-gates, trial, hamburger-menu. Zie `src/app/shop/[tenant]/admin/layout.tsx`.
- **`/dashboard/*`:** apart portaal (bonnenprinter, producten, …) — historisch/parallel; niet alles zit alleen hier.

## 3. Module-matrix (concept)

Modules zijn logisch gegroepeerd (kassa, online-bestellingen, reservaties, rapporten, …). Bron: `src/lib/tenant-modules.ts`, `admin-hamburger-modules.ts`, `use-tenant-modules.ts`.

- **Starter vs Pro:** velden `plan`, `subscription_status`, `trial_ends_at` op tenant + JSON `enabled_modules` / flags.
- **Trial:** vaak alle modules zichtbaar met trial-logica (zie workspace-regels en `TrialBanner` / `PostTrialModulePickerModal`).

**Regel:** nooit één vaste tenant-slug in productcode voor business-logica; demo-uitzonderingen staan in o.a. `demo-links.ts` / `protected-tenants.ts`.

## 4. Order- en betaalstatus (lifecycle)

Wijzigingen aan statussen (goedkeuren, keuken, afronden, Z-rapport) moeten **consistent** zijn over:

- Admin bestellingen  
- Onlinescherm (`display`)  
- Keukenscherm (`keuken`)  
- Backend in `admin-api.ts` (o.a. approve, complete, confirm, …)

Zie projectregels in `.cursor/rules/multi-tenant.mdc` voor de checklist.

## 5. Data & security (kort)

- **Supabase** met **Row Level Security** (migraties en fix-scripts onder `supabase/`).
- **Server API** gebruikt vaak **service role** → autorisatie moet in de route of via strikte RLS kloppen.
- **Tenant API-auth (admin):** headers `x-business-id`, `x-auth-email` (client: `getAuthHeaders()`), server: `verifyTenantAccess` / `verifyTenantOrSuperAdmin`.
- **Superadmin:** aparte headers + `super_admins` tabel.

Zie ook `docs/API_SECURITY_INVENTORY.md` en `supabase/README_RLS_AND_SECURITY_ADVISOR.md`.

## 6. Testen en load

- **Jest:** unit tests onder `src/__tests__/`.
- **Playwright:** `e2e/` (smoke / health — groeiend).
- **k6:** `k6/` voor load en pad-dekking tegen tenant-host.

## 7. Observability

- **Sentry** (Next integration).
- **`/api/health`** voor monitoring.
