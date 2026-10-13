# Cloud print — piloot (niet activeren zonder eigenaar)

## Scope

- **Alleen eigen testtenant** (door eigenaar gekozen slug — geen bestaande klant).
- **Geen** GitHub agent-release; **geen** auto-update; **handmatige** workflow_dispatch indien nieuwe exe nodig.
- **Geen** iPad-kassa-wijziging tot piloot print OK.

## Stappen (nog niet uitvoeren zonder goedkeuring)

1. Migratie `supabase/print_agent_cloud_migration.sql` op **staging/test** Supabase (niet prod tot OK).
2. Superadmin: `update_kassa_cloud_print_enabled` → true **alleen testtenant**.
3. `POST /api/superadmin/print-agent-device` → token **eenmalig** opslaan in agent (cloud uit in UI tot stap 5).
4. Test-enqueue via geauthenticeerde API (Postman/curl met tenant-sessie), idempotency key `pilot-1`.
5. Agent: cloud aan + token → claim/print/ack; logging in agent.log + Vercel logs.
6. Rollback-test: cloud uit → localhost print op PC blijft werken.

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

## iPad-kassa

Code staat in `vysion-print-agent-client.ts` (routing) + kassa `printAgentSendContext.cloudPrintEnabled`.
Blijft **uit** tot superadmin `kassa_cloud_print_enabled` op **alleen testtenant** zet.
