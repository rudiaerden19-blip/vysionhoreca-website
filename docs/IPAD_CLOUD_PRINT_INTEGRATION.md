# iPad → cloud print

## Geïmplementeerd (achter tenant-flag)

- iPad Safari: `sendToVysionPrintAgent` → **`POST /api/print-agent/enqueue`** wanneer `kassa_cloud_print_enabled === true`.
- Geen parallel LAN `:9742` op iPad als cloud aan staat (geen dubbele opdracht).
- Windows-kassa op dezelfde PC: blijft **127.0.0.1:9742** (`cloudPrintEnabled` negeert Windows desktop).

## Pad

1. Detectie: `isIpadSafariCloudPrintClient()` — geen Android-kiosk, geen `Windows NT`.
2. Zelfde JSON als `POST /print` via `buildAgentRequestPayload`.
3. Idempotency: `buildPrintJobIdempotencyKey` (tenant + order + receiptMode + copies + drawer).
4. Agent: claim → `executePrintRequest` → ack (ongewijzigde engine).

## Niet wijzigen bij integratie

- `buildEscPosPayload` / `executePrintRequest` in agent.
- Bonopbouw in kassa (`bonInhoud`, `orderData`, `receiptMode`, `copies`, `openDrawer`).
- PC op Windows: geen cloud-hop (direct POST /print).

## Dubbele afdruk voorkomen

- Zelfde idempotency key → enqueue retourneert bestaande job (geen tweede pending).
- Na `printed`: geen herdruk metzelfde key; nieuwe key alleen bewust (support).
- Na `failed` / timeout: **geen** auto-requeue; handmatige procedure (superadmin).

## Meerdere iPads

- Parallel enqueue OK; één agent claimt FIFO (`SKIP LOCKED`).
