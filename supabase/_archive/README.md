# Archief — NIET UITVOEREN IN PRODUCTIE

Deze SQL-scripts zijn historisch en zetten **RLS open** (`USING (true)` / `FOR ALL USING (true)`)
of bevatten verouderde "allow all"-policies. Ze zijn vervangen door:

- `supabase/migrations/20260510120000_phase1_secure_rls_lockdown.sql`
- `supabase/HOTFIX_PHASE1_ANON_READ.sql`
- `supabase/HOTFIX_PHASE2_GUEST_PROFILES_LOCKDOWN.sql`
- `supabase/HOTFIX_PHASE2_HR_BOEKHOUDING_LOCKDOWN.sql`
- en losse, tenant-scoped policies in latere migrations.

## Waarom in archief

Per ongeluk opnieuw uitvoeren van deze bestanden zou de hele multi-tenant
isolatie tenietdoen: elke anonymous bezoeker zou alle orders, omzet, kasboek,
personeel en klantgegevens van álle tenants kunnen lezen.

**Niet kopiëren, niet runnen, niet aanpassen.** Bewaar alleen voor historische
referentie. Bij twijfel: verwijderen.

## Inhoud

| Bestand                          | Wat het deed                                                |
|----------------------------------|-------------------------------------------------------------|
| FIX_ALL_RLS_POLICIES.sql         | Zette ~30 tabellen op `FOR ALL USING (true)`                |
| FIX_ALL_SECURITY_WARNINGS.sql    | Maakte `check_access()` die altijd `true` returnde          |
| FIX_ALL_TABLES.sql               | Idem, op specifieke tabellen (orders, menu_products, …)     |
| FIX_MEDIA_DELETE.sql             | tenant_media open-all                                       |
| FIX_MISSING_COLUMNS.sql          | tenant_media open-all + kolommen                            |
| FIX_TENANT_MEDIA.sql             | tenant_media open-all                                       |
| FIX_Z_REPORTS_RLS.sql            | z_reports `FOR ALL USING (true)` (P0 als opnieuw gerund)    |
| RUN_NU_IN_SUPABASE.sql           | Voorloper van Phase 1, heeft nog `USING (true)` paden       |
| SECURE_RLS_POLICIES.sql          | Idem — vervangen door Phase 1                               |
| fix_rls_policies.sql             | Zette anon + authenticated op `FOR ALL USING (true)`        |

Voor herstel-paden: gebruik altijd `supabase/migrations/` of de gedocumenteerde
hotfixes in `supabase/`.
