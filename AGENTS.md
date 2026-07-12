# AGENTS.md

## Cursor Cloud specific instructions

Deze sectie is voor toekomstige cloud agents. Het update-script (`npm install`) draait al
automatisch bij het opstarten, dus hier staan alleen niet-voor-de-hand-liggende weetjes.

### Wat is dit
Eén multi-tenant horeca SaaS (Next.js 14, App Router). **De repo-root ís de website** — er is
geen aparte `website/`-map. De enige losse app is de Print Agent onder `apps/vysion-print-agent/`
(NIET aanraken, zie `.cursor/rules/no-print-agent.mdc`).

### Standaardcommando's (zie `package.json` scripts)
- Dev server: `npm run dev` → http://localhost:3000
- Lint: `npm run lint` · Types: `npx tsc --noEmit` · Tests: `npm test`
- Vóór wijzigingen aan de kassa-flow verplicht (zie `.cursor/rules/kassa-park-to-table-sacred.mdc`):
  `npm test -- --testPathPatterns=kassa-table-park-flow` en `npm test -- --testPathPatterns=controlled-number-input`.

### Env / secrets (belangrijk, niet vanzelfsprekend)
- De app **start prima zonder** `.env.local`; ontbrekende Supabase/Stripe/Zoho/Redis-config leidt
  niet tot een crash. `src/lib/supabase.ts` logt alleen een warning en zet de client op `null`.
- Zonder secrets meldt `GET /api/health` `status: "degraded"` met alle services `not_configured`.
  Publieke marketing-pagina's en veel `/shop/[tenant]`-routes geven dan nog steeds HTTP 200 (graceful
  degradatie); échte DB-flows (registratie, inloggen, bestellingen, kassa opslaan) werken pas met
  Supabase-keys in `.env.local` (zie `.env.local.example`): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
- i18n is **niet padgebaseerd**: `/en` en `/de` bestaan niet (404). Taal wisselt client-side via
  `src/i18n/LanguageContext.tsx` (cookie). Locale-bestanden staan in `messages/*.json` — bij tekst
  wijzigen alle talen bijwerken (zie `.cursor/rules/i18n-all-locales.mdc`).

### Onschuldige meldingen (geen actie nodig)
- `⚠ Found lockfile missing swc dependencies, patching...` gevolgd door
  `⨯ Failed to patch lockfile ... reading 'os'`: Next probeert pakketinfo van de npm-registry te
  halen; in de sandbox is er geen netwerk daarheen. De dev-server en Jest draaien gewoon door.
- `@sentry/nextjs DEPRECATION WARNING`-regels bij dev/test zijn onschuldig.
