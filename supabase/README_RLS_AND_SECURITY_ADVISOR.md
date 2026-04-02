# RLS en Supabase Security Advisor (periodiek)

**Doel:** regressie voorkomen na migraties of nieuwe tabellen. Geen vervanging van code-review.

## Wanneer uitvoeren

- Na **grote migraties** of nieuwe tabellen met `tenant_slug`.
- **Kwartaal** of vóór belangrijke release (afspraak team).

## Stappen in Supabase Dashboard

1. Project openen → **Database**.
2. **Advisors** / **Linter** (naam kan per Supabase-versie iets verschillen):
   - **Security** — ontbrekende RLS, policies te permissief, `SECURITY DEFINER` views, …
   - **Performance** — ontbrekende indexen op foreign keys / `tenant_slug` filters.
3. Meldingen **afdrukken of exporteren** en als issue/ticket afhandelen.
4. Voor **RLS policies**: elke tenant-rij moet afdwingbaar zijn via `tenant_slug` (of veilige equivalent) voor client-rollen.

## Lokaal (optioneel)

Als jullie **Supabase CLI** gekoppeld hebben:

```bash
supabase db lint
```

(Alleen als CLI en project gelinkt zijn; anders volstaat het dashboard.)

## Na wijzigingen in productie

- Korte **chore** in changelog: “Supabase advisor: X warnings opgelost” of “0 new critical”.
- Nieuwe tabellen: altijd migratie + RLS in dezelfde release-cyclus.
