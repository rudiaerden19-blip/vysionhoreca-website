#!/usr/bin/env bash
# Faalt als productie-POS (/admin/kassa) gewijzigd is t.o.v. main — GKS merge-guard.
set -euo pipefail

BASE_REF="${1:-origin/main}"
if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
  echo "check-production-kassa: base ref ontbreekt ($BASE_REF) — skip (geen remote/main?)."
  exit 0
fi

PROD_KASSA_GLOB='src/app/shop/[tenant]/admin/kassa/'

if git diff "$BASE_REF"...HEAD -- "$PROD_KASSA_GLOB" | grep -q .; then
  echo "❌ Productie-kassa gewijzigd onder $PROD_KASSA_GLOB"
  echo "   GKS naar main: alleen /shop/{tenant}/gks en src/lib/gks-kassa — niet /admin/kassa."
  git diff --stat "$BASE_REF"...HEAD -- "$PROD_KASSA_GLOB" || true
  exit 1
fi

# Standaard klant-ingang blijft productie-kassa (geen redirect naar /gks).
if ! grep -q 'return `/shop/${tenantSlug}/admin/kassa`' src/lib/tenant-modules.ts; then
  echo "❌ getAdminKassaEntryHref wijst niet meer naar /admin/kassa"
  exit 1
fi

echo "✅ Productie-kassa ongewijzigd t.o.v. $BASE_REF en klant-URL blijft /admin/kassa"
