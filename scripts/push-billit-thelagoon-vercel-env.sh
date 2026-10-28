#!/usr/bin/env bash
# Push Billit The Lagoon env vars from .env.local → Vercel (Production + Preview).
# Geen secrets in git. Vul eerst in .env.local:
#   BILLIT_THELAGOON_CLIENT_ID=...   (of BILLIT_THELAGOON_EMAIL)
#   BILLIT_THELAGOON_CLIENT_SECRET=... (of BILLIT_THELAGOON_PASSWORD)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT/.env.local}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

API_KEY="${BILLIT_THELAGOON_API_KEY:-}"
ID="${BILLIT_THELAGOON_CLIENT_ID:-${BILLIT_THELAGOON_EMAIL:-}}"
SECRET="${BILLIT_THELAGOON_CLIENT_SECRET:-${BILLIT_THELAGOON_PASSWORD:-}}"

if [[ -z "$API_KEY" && ( -z "$ID" || -z "$SECRET" ) ]]; then
  echo "Zet BILLIT_THELAGOON_API_KEY (of CLIENT_ID/SECRET) in $ENV_FILE" >&2
  exit 1
fi

SANDBOX="${BILLIT_THELAGOON_SANDBOX:-0}"
GRANT="${BILLIT_THELAGOON_GRANT_TYPE:-client_credentials}"
API_BASE="${BILLIT_THELAGOON_API_BASE:-}"

push_env() {
  local name="$1"
  local value="$2"
  local target="$3"
  printf '%s' "$value" | npx vercel@latest env add "$name" "$target" --force
}

for target in production preview; do
  if [[ -n "$API_KEY" ]]; then
    push_env BILLIT_THELAGOON_API_KEY "$API_KEY" "$target"
  fi
  if [[ -n "$ID" ]]; then
    push_env BILLIT_THELAGOON_CLIENT_ID "$ID" "$target"
  fi
  if [[ -n "$SECRET" ]]; then
    push_env BILLIT_THELAGOON_CLIENT_SECRET "$SECRET" "$target"
  fi
  push_env BILLIT_THELAGOON_SANDBOX "$SANDBOX" "$target"
  push_env BILLIT_THELAGOON_GRANT_TYPE "$GRANT" "$target"
  if [[ -n "$API_BASE" ]]; then
    push_env BILLIT_THELAGOON_API_BASE "$API_BASE" "$target"
  fi
  echo "OK: Billit env → $target"
done

echo "Klaar. Redeploy production op Vercel zodat nieuwe env actief is."
