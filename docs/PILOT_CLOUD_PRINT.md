# Cloud print — piloot (niet activeren zonder eigenaar)

## Rollback

1. Superadmin: `kassa_cloud_print_enabled = false` voor piloot-tenant.
2. Agent: vink **Cloud print** uit → Opslaan (of oude USB-map + `config.json` backup).
3. Geen tweede agent op poort 9742 — sluit dubbele instance via Taakbeheer.
4. Behoud vorige `VysionPrint`-map als terugval; START.bat uit oude map.

## Piloot checklist (Windows, handmatig)

- [ ] SQL migratie `supabase/print_agent_cloud_migration.sql` op Supabase.
- [ ] Superadmin device-token aanmaken (`POST /api/superadmin/print-agent-device`).
- [ ] Nieuwe agent-build **lokaal** of via handmatige GitHub workflow (geen auto-release).
- [ ] Cloud uit laten op alle andere tenants.

## Geen iPad-kassa koppeling tot piloot OK

Enqueue gebeurt pas wanneer kassa expliciet cloud-pad krijgt (nog niet gebouwd).
