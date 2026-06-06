# GKS 2.0 — documentatie & deploy

**Agents:** vaste regels in `.cursor/rules/gks-vs-production-kassa.mdc` (altijd actief).

| Document | Doel |
|----------|------|
| [STAP-1-MB-TITEL-II-H1.md](./STAP-1-MB-TITEL-II-H1.md) | **Stap 1 bouwen** — MB events N/P/T/S, FDM-mutaties, tafel, ticket |
| [DEPLOYMENT-MAP.md](./DEPLOYMENT-MAP.md) | Wat gaat naar **GitHub**, **Vercel** en **Supabase** (en wat niet) |
| [../../src/lib/gks-kassa/ISOLATION.md](../../src/lib/gks-kassa/ISOLATION.md) | Scheiding GKS-kassa vs productie `/admin/kassa` |
| [../../src/gks/README.md](../../src/gks/README.md) | Toekomstige fiscale module (FDM, journal, audit) |

**Productie-kassa:** `src/app/shop/[tenant]/admin/kassa/` — niet wijzigen tenzij expliciet gevraagd.

**GKS-pilot UI:** `/shop/[tenant]/admin/gks-kassa` — alleen hier bouwen.
