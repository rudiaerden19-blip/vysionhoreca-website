#!/usr/bin/env bash
# Na `npm run pack:win` — werkt payload-sha256.inc bij (macOS/Linux build-helper).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXE="$ROOT/dist/win-unpacked/Vysion Print Agent.exe"
INC="$ROOT/inno/payload-sha256.inc"
if [[ ! -f "$EXE" ]]; then
  echo "Run eerst: npm run pack:win" >&2
  exit 1
fi
HASH="$(shasum -a 256 "$EXE" | awk '{print $1}')"
cat > "$INC" <<EOF
; Gegenereerd door scripts/build-inno-installer.ps1 — niet handmatig wijzigen.
#define VysionPayloadExeRel "Vysion Print Agent.exe"
#define VysionPayloadSha256 "$HASH"
EOF
echo "payload-sha256.inc -> $HASH"
