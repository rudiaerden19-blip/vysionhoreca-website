# API security inventory (snapshot)

**Doel:** overzicht voor dreigingsmodel en reviews. **Niet** automatisch volledig; bij twijfel de route-handler lezen.  
**Laatste doorloop:** 2026-05 — na hardening `verifyTenantOrSuperAdmin` op gevoelige tenant-routes + inventaris herzien.

**Service role:** server-side Supabase-client met `SUPABASE_SERVICE_ROLE_KEY` (= bypass RLS tenzij expliciet anders).

Legenda **auth-type:**

| Waarde | Betekenis |
|--------|-----------|
| `public` | Geen login; bedoeld voor publiek of webhooks |
| `rate_limit` | Publiek maar IP-rate-limit (Upstash) waar geconfigureerd |
| `cron_secret` | Production: `CRON_SECRET` verplicht (anders **503**); `Authorization: Bearer <CRON_SECRET>`. Lokaal / `NODE_ENV`≠production: geen check. |
| `stripe_sig` | Stripe-handtekening |
| `header_tenant` | Alleen headers aanwezig — **niet** gekoppeld aan tenant in body (legacy risico) |
| `superadmin`/`maint` | Superadmin-headers en/of `x-internal-maintenance-secret` + `INTERNAL_MAINTENANCE_SECRET` |
| `groups_code` | Groepsdeelnemer: o.a. `access_code` bij sessies |
| `verify_tenant_or_super` | `verifyTenantOrSuperAdmin(request, tenantSlug)` op tenant in query/body |
| `varies` | Combinatie of route-specifieke checks — code raadplegen |

## Routes met `verifyTenantOrSuperAdmin` (kern)

Gebruikt in o.a.: `import-ingredients`, `marketing/send`, `tenant/smtp`, `whatsapp/settings` (POST + beperkte GET), `send-order-status`, `orders/reject`, `shop-offline` (POST), `groups/*` (tenant-gedeelte), `auth/verify-tenant-session`.

## Inventaris (alfabetisch op pad)

| Pad | Methodes | Service role typisch? | Tenant uit query/body? | Auth / check (kort) |
|-----|----------|------------------------|-------------------------|---------------------|
| analyze-invoice | POST | ja | ja | varies — body + AI; geen globaal patroon |
| analyze-invoice-pdf | POST | ja | — | varies |
| auth/forgot-password | POST | ja | — | `rate_limit` |
| auth/login | POST | ja | — | `rate_limit` + credentials |
| auth/register | POST | ja | — | `rate_limit`; slug via `slugifyBusinessNameForTenant` |
| auth/resend-verification | POST | ja | — | `rate_limit` |
| auth/reset-password | POST | ja | — | `rate_limit` + token |
| auth/superadmin-login | POST | ja | — | `rate_limit` |
| auth/verify-email | GET | ja | — | token in URL |
| auth/verify-tenant-session | POST | ja | ja | `verify_tenant_or_super` |
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
| groups/orders | GET,POST | ja | ja | GET/POST tenant-paden: `verify_tenant_or_super`; sessie-code: `groups_code` |
| groups/sessions | * | ja | ja | tenant_slug: `verify_tenant_or_super`; group_id-only: `access_code` |
| health | GET | ja | — | `public` monitoring |
| import-ingredients | POST | ja | ja | **`verify_tenant_or_super`** |
| marketing/send | POST | ja | ja | **`verify_tenant_or_super`** + rate limit |
| migrate-special-requests | GET | ja | — | **`superadmin`/`maint`** (`assertInternalToolAccess`) |
| orders/reject | POST | ja | ja | **`verify_tenant_or_super`** + order.tenant match |
| partner-application | POST | ja | — | `public` formulier |
| pin/check, pin/set, pin/verify | POST | ja | ja | varies; pin flow |
| ping | GET | — | — | `public` |
| reservation-card-auth | * | ja | ja | varies |
| reservation-deposit | * | ja | ja | Stripe/payment |
| reservation-sms | * | ja | ja | varies |
| send-order-status | POST | — | ja (body `tenantSlug`) | **`verify_tenant_or_super`** (Zoho platform-mail) |
| send-payment-reminder | POST | ja | ja | varies — code review |
| send-reservation-email | POST | — | — | varies — **geen tenant-sessie**; status-whitelist; review |
| send-timesheet | POST | ja | ja | varies |
| send-z-report | POST | ja | ja | varies |
| setup-database | GET,POST | ja | — | **`superadmin`/`maint`** |
| shop-offline | GET,POST | ja | tenant query/body | GET: `public` read; POST: **`verify_tenant_or_super`** |
| stripe-webhook | POST | ja | — | `stripe_sig` |
| stripe/create-checkout | POST | ja | ja | varies |
| subscription-webhook | POST | ja | — | varies (provider) |
| tenant/confirm-modules | POST | ja | nee | alleen `verifySuperAdminAccess` |
| tenant/smtp | GET,POST | ja | ja | **`verify_tenant_or_super`** |
| track-view | POST | ja | — | `public` analytics |
| voice-order/match-products | POST | — | — | rate limit; Gemini server-only |
| voice-order/process-audio | POST | — | — | idem |
| voice-order/speak | GET,POST | — | — | idem |
| vysion-build | GET | — | — | internals |
| whatsapp/debug | GET,POST | ja | — | **`superadmin`/`maint`** |
| whatsapp/send-confirmation | POST | ja | ja | varies — code review |
| whatsapp/send-status | POST | ja | ja | service role + actieve tenant-config; **geen sessie-check** — backlog hardening |
| whatsapp/settings | GET,POST | ja | ja | GET: publiek minimale velden / vol voor owner; POST: **`verify_tenant_or_super`** |
| whatsapp/webhook | GET,POST | ja | — | Verify token env; POST: optioneel `WHATSAPP_APP_SECRET` (HMAC) |

## Omgevingsvariabelen (aanvulling hardening)

- `INTERNAL_MAINTENANCE_SECRET` — optioneel; gecombineerd met header `x-internal-maintenance-secret` voor onderhoud.
- `CRON_SECRET` — cron-routes.
- `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_APP_SECRET` — webhook.

## Backlog (periodiek)

- `whatsapp/send-status`, `send-reservation-email`: overweeg `verify_tenant_or_super` of signed internal secret als abuse blijkt.
- Na elke nieuwe API-route: deze tabel uitbreiden.
