# E2E-tests (Playwright)

Korte uitleg voor wie zelden met tests werkt.

## Wat gebeurt er?

Playwright start een **browser**, opent je site zoals een echte gebruiker, en controleert of de pagina **zichtbaar** is. Er is o.a. een **kassa-smoke** (`?alleen_lezen=1`) en een lichte **`/api/health`**-check (geen volledige tenant-data nodig).

**Documentatie:** `docs/API_SECURITY_INVENTORY.md`, `docs/INTERNAL_PLATFORM_OVERVIEW.md`, `supabase/README_RLS_AND_SECURITY_ADVISOR.md`.

## Eenmalig op je computer

```bash
npm install
npx playwright install chromium
```

(De CI of een andere machine: opnieuw `npx playwright install chromium` na `npm install`.)

## Draaien

Je app moet Supabase/kassa-data kunnen laden (`.env.local` zoals bij `npm run dev`).

**Optie A — alles in één** (Playwright start zelf `npm run dev` als er nog niets draait):

```bash
npm run test:e2e
```

**Optie B — zelf dev-server gestart** (bijv. `npm run dev` in een ander terminalvenster):

```bash
npm run test:e2e:no-server
```

**Interactief** (stappen zien, traag doorlopen):

```bash
npm run test:e2e:ui
```

## Andere URL of tenant

- `PLAYWRIGHT_BASE_URL` — standaard `http://localhost:3000`
- `E2E_TENANT` — standaard `frituurnolim`

Voorbeeld:

```bash
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3000 E2E_TENANT=frituurnolim npm run test:e2e:no-server
```

## Rapport

Na een run: map `playwright-report/` — open `playwright-report/index.html` in je browser.
