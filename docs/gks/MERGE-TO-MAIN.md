# GKS naar `main` — productie-kassa ongemoeid

## Vaste regel

| Wat | Mag op `main` |
|-----|----------------|
| `/shop/{tenant}/gks` + `src/lib/gks-kassa/**` + `/api/gks-kassa/**` | ✅ GKS-werk |
| `/shop/{tenant}/admin/kassa/**` | ❌ **Geen wijzigingen** voor GKS-merge |
| Productie offline queue (`kassa-offline-order-queue`, `vysion-kassa-offline`) | ❌ Niet verwijzen/aanpassen voor GKS |

Klanten blijven via **`getAdminKassaEntryHref`** → **`/shop/{tenant}/admin/kassa`**.  
GKS is een **tweede ingang** (`/gks`), geen vervanging.

## Automatische check

```bash
npm run check:production-kassa
# of: bash scripts/check-production-kassa-untouched.sh origin/main
```

- Bij **PR naar `main`**: workflow `.github/workflows/gks-merge-guard.yml` faalt als `admin/kassa/` in de diff zit.
- Lokaal vóór merge: zelfde script draaien.

## Gedeelde bestanden (voorzichtig)

Sommige files worden door **beide** kassas gebruikt (alleen **achterwaarts compatibel** wijzigen):

- `src/components/kassa/*` — optionele props, defaults = oud gedrag
- `src/lib/admin-api-order-operations.ts` — rapportage kan `gks_commercial_orders` **meelezen**; zonder GKS-data geen effect op POS

Review deze in PR expliciet; ze vallen **niet** onder de `admin/kassa/` diff-guard.

## Merge-checklist

1. `npm run check:production-kassa` → groen  
2. `npx tsc --noEmit`  
3. Supabase-migraties `gks_*` / `fiscal_journal` op productie-DB (additief)  
4. Geen tenant-brede redirect van `/admin/kassa` → `/gks`  
5. Belgische/GKS-klanten krijgen **aparte link** naar `/gks` wanneer jullie dat productief maken  

Zie ook `ISOLATION.md` en `DEPLOYMENT-MAP.md`.
