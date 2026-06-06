# GKS / fiscale module

**Fiscale waarheid** voor Belgische GKS 2.0: FDM 2.0, digitaal kasticket, transactie-auditfile, append-only journal.

## Verantwoordelijkheid

| Map | Inhoud |
|-----|--------|
| `fdm/` | HTTP-client en configuratie FDM 2.0 API |
| `ticket/` | Unieke ticketsleutel, digitale ondertekening, digitaal kasticket |
| `audit/` | Gestandaardiseerd transactie-auditfile (export) |
| `journal/` | Onveranderlijke fiscale events (geen stille updates) |
| `types/` | Ticket-, audit- en FDM-payloadtypes |

## Server routes

- `POST /api/gks/fiscal-ticket` — ticket uitgeven na POS-checkout (tenant + auth)
- `GET /api/gks/audit-export` — auditfile voor periode (tenant + auth)

## Regels

1. Geen `UPDATE` op fiscale totalen; correcties via nieuwe journal-events.
2. Elke ticket: unieke numerieke sleutel + handtekening (FDM of tussenlaag tot FDM live is).
3. Alle exports filteren op `tenant_slug`.
