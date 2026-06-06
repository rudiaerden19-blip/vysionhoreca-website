# POS (reguliere kassalaag)

TypeScript-module voor **verkoop-UI en bedrijfslogica zonder FDM/GKS-certificering**.

## Verantwoordelijkheid

| Map | Inhoud |
|-----|--------|
| `sale/` | Mand, checkout-flow, betalingskeuze (geen fiscale ondertekening) |
| `products/` | Catalogus, opties, prijzen voor het scherm |
| `calculator/` | Totalen, BTW-splitsing voor **weergave** (zelfde regels als bon) |
| `types.ts` | POS-domeintypes (cart lines, payment method) |

## Grens met `src/gks/`

- POS mag **nooit** rechtstreeks naar de FDM 2.0 API praten.
- Na een betaalde verkoop roept POS **één** facade aan: `issueFiscalTicket()` uit `@/gks`.
- Fiscale volgnummers, handtekeningen en auditfiles komen **uitsluitend** uit `gks/`.

## UI (Next.js)

Bestaande schermen: `src/app/shop/[tenant]/admin/kassa/` en `src/components/kassa/`.  
Nieuwe UI-onderdelen die puur POS zijn: `src/components/pos/` (optioneel uitfaseren van de monolith).
