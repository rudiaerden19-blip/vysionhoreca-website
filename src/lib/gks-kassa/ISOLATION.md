# GKS-kassa isolatie vs productie `/admin/kassa`

Deploy naar GitHub / Vercel / Supabase: zie [`docs/gks/DEPLOYMENT-MAP.md`](../../../docs/gks/DEPLOYMENT-MAP.md).

## Doel

Pilot/certificatie onder `/shop/[tenant]/gks` (legacy `/admin/gks-kassa` → redirect) mag **geen** productie-POS-data wijzigen.

## Code

| Productie | GKS |
|-----------|-----|
| `admin/kassa/page.tsx` | `gks/page.tsx` (fork, buiten `/admin`) |
| `orders` | `gks_commercial_orders` via `/api/gks-kassa/commercial-orders` |
| `kassa-z-sync-safe` → `z_reports` | `gks-kassa/z-sync-safe` (no-op) |
| `vysion-kassa-offline` IDB | `vysion-gks-kassa-offline` |
| `vysion_*` localStorage | `gks_*` (`storage-keys.ts`) |

## Nog gedeeld (read-only of bewust)

- Menu/catalogus via `admin-api` (lezen).
- Plattegrond **server** (`floor_plan_tables` realtime) — alleen lezen/sync; **geen** `upsert` vanuit GKS.
- `/api/kassa/staff-clock` — staff-sessies (TODO: aparte GKS-route indien nodig).
- Print agent (`sendToVysionPrintAgent`) — lokaal per zaak.
- Webshop-order **alarm**: alleen **lezen** van `orders.status=new` (webshop-kanaal); geen writes naar `orders`.
- Geen fullscreen «Activeer geluid»-gate: audio ontgrendelt op eerste tik op de POS (zelfde sessie-key `gks_kassa_audio_ok_*`).
- **Route:** `/shop/{tenant}/gks` — geen `AdminLayout` (alleen shop-layout + `GksPilotLayoutGate`).

## Check vóór deploy

```bash
git diff -- 'src/app/shop/[tenant]/admin/kassa/'
# moet leeg zijn
```
