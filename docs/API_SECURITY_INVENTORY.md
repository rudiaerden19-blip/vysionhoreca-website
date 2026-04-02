# API security inventory (snapshot)

**Doel:** overzicht voor dreigingsmodel en reviews. **Niet** automatisch volledig; bij twijfel de route-handler lezen.  
**Service role:** server-side Supabase-client met `SUPABASE_SERVICE_ROLE_KEY` (= bypass RLS tenzij expliciet anders).

Legenda **auth-type:**

| Waarde | Betekenis |
|--------|-----------|
| `public` | Geen login; bedoeld voor publiek of webhooks |
| `rate_limit` | Publiek maar IP-rate-limit (Upstash) waar geconfigureerd |
| `cron_secret` | `Authorization` moet matchen `CRON_SECRET` |
| `stripe_sig` | Stripe-handtekening |
| `header_tenant` | `x-business-id` + `x-auth-email` (zie `verifyTenantAccess`) |
| `superadmin`/`maint` | Superadmin-headers en/of `x-internal-maintenance-secret` + `INTERNAL_MAINTENANCE_SECRET` |
| `groups_code` | Groepsdeelnemer: o.a. `access_code` bij sessies |
| `verify_tenant_or_super` | `verifyTenantOrSuperAdmin` op tenant in query/body |
| `varies` | Combinatie of route-specifieke checks — code raadplegen |

## Inventaris (alfabetisch op pad)

| Pad | Methodes | Service role typisch? | Tenant uit query/body? | Auth / check (kort) |
|-----|----------|------------------------|-------------------------|---------------------|
| analyze-invoice | POST | ja | ja | varies — body + AI; geen globaal patroon |
| analyze-invoice-pdf | POST | ja | — | varies |
| auth/forgot-password | POST | ja | — | `rate_limit` |
| auth/login | POST | ja | — | `rate_limit` + credentials |
| auth/register | POST | ja | — | `rate_limit` |
| auth/resend-verification | POST | ja | — | `rate_limit` |
| auth/reset-password | POST | ja | — | `rate_limit` + token |
| auth/superadmin-login | POST | ja | — | `rate_limit` |
| auth/verify-email | GET | ja | — | token in URL |
| contact | POST | — | — | `rate_limit`; e-mail |
| create-gift-card-checkout | POST | ja | ja | varies; Stripe flow |
| create-invoice-checkout | POST | ja | ja | varies |
| create-subscription-checkout | POST | ja | ja | varies |
| cron/archive-z-reports | GET | ja | — | `cron_secret` |
| cron/reservation-reminders | GET | ja | — | `cron_secret` |
| cron/reset-demo-tenant | GET | ja | — | `cron_secret` |
| cron/subscription-reminders | GET | ja | — | `cron_secret` |
| get-gift-card-code | POST | ja | ja | varies |
| groups | GET,POST,PUT,DELETE | ja | ja | `verify_tenant_or_super` |
| groups/join | POST | ja | — | `public` met geldige `access_code` |
| groups/members | * | ja | via group_id | `verify_tenant_or_super` via group |
| groups/orders | GET,POST | ja | ja | GET: `verify_tenant_or_super`; POST: sessie moet bij tenant horen |
| groups/sessions | * | ja | ja | tenant_slug: `verify_tenant_or_super`; group_id-only: `access_code` |
| health | GET | ja | — | `public` monitoring |
| import-ingredients | POST | ja | ja | varies — oog op onderhoud |
| marketing/send | POST | ja | ja | `header_tenant` (business id) |
| migrate-special-requests | GET | ja | — | **`superadmin`/`maint`** (`assertInternalToolAccess`) |
| orders/reject | POST | ja | ja | `verify_tenant_or_super` + order.tenant match |
| partner-application | POST | ja | — | `public` formulier |
| pin/check, pin/set, pin/verify | POST | ja | ja | varies; pin flow |
| ping | GET | — | — | `public` |
| print-proxy | GET,POST | — | printer IP in body/query | **SSRF-bescherming:** alleen private IP-ranges; geen tokens op client |
| reservation-card-auth | * | ja | ja | varies |
| reservation-deposit | * | ja | ja | Stripe/payment |
| reservation-sms | * | ja | ja | varies |
| send-order-status | POST | ja | ja | varies |
| send-payment-reminder | POST | ja | ja | varies |
| send-reservation-email | POST | ja | ja | varies |
| send-timesheet | POST | ja | ja | varies |
| send-z-report | POST | ja | ja | varies |
| setup-database | GET,POST | ja | — | **`superadmin`/`maint`** |
| shop-offline | GET,POST | ja | tenant query/body | GET: `public` read; POST: `verify_tenant_or_super` |
| stripe-webhook | POST | ja | — | `stripe_sig` |
| stripe/create-checkout | POST | ja | ja | varies |
| subscription-webhook | POST | ja | — | varies (provider) |
| tenant/confirm-modules | POST | ja | ja | `verifyTenantAccess` of `verifySuperAdminAccess` |
| tenant/smtp | GET,POST | ja | ja | `header_tenant` |
| track-view | POST | ja | ja | `public` analytics |
| voice-order/match-products | POST | — | — | **rate limit** (Upstash); Gemini key server-only |
| voice-order/process-audio | POST | — | — | idem |
| voice-order/speak | GET,POST | — | — | idem |
| vysion-build | GET | — | — | internals |
| whatsapp/debug | GET,POST | ja | — | **`superadmin`/`maint`** |
| whatsapp/send-confirmation | POST | ja | ja | varies |
| whatsapp/send-status | POST | ja | ja | varies |
| whatsapp/settings | * | ja | ja | varies — review |
| whatsapp/webhook | GET,POST | ja | — | Meta verify + webhook |

## Omgevingsvariabelen (aanvulling hardening)

- `INTERNAL_MAINTENANCE_SECRET` — optioneel; gecombineerd met header `x-internal-maintenance-secret` voor onderhoud zonder superadmin-browser (alleen productie-gates hierboven).
- `CRON_SECRET` — cron-routes.

## Follow-up (periodiek)

- Na elke nieuwe API-route: deze tabel uitbreiden.
- Bij dependency-wijzigingen op webhooks: `whatsapp/webhook`, Stripe-routes herbekijken.
