#!/usr/bin/env bash
# Re-encode marketing MP4s for web (H.264 + AAC, moov atom at start, max width 1920).
# Requires: ffmpeg (brew install ffmpeg)
#
# Usage:
#   ./scripts/transcode-public-mp4.sh              # all *.mp4 under public/videos and public/images
#   ./scripts/transcode-public-mp4.sh path/to/a.mp4 ...
#
# Writes alongside each input: <name>.web.mp4 — compare sizes, then replace the original and commit.
# Heaviest historical candidates: public/videos/registreren.mp4, de-shop.mp4, …

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CRF="${CRF:-26}"
PRESET="${PRESET:-slow}"

transcode_one() {
  local in="$1"
  local dir base out
  dir="$(dirname "$in")"
  base="$(basename "$in" .mp4)"
  out="${dir}/${base}.web.mp4"
  if [[ ! -f "$in" ]]; then
    echo "skip (missing): $in" >&2
    return
  fi
  echo "→ $out"
  ffmpeg -hide_banner -y -i "$in" \
    -c:v libx264 -crf "$CRF" -preset "$PRESET" \
    -vf "scale='min(1920,iw)':-2:flags=lanczos" \
    -pix_fmt yuv420p \
    -movflags +faststart \
    -c:a aac -b:a 128k -ac 2 \
    "$out"
}

if [[ $# -gt 0 ]]; then
  for f in "$@"; do
    transcode_one "$f"
  done
else
  for dir in "$ROOT/public/videos" "$ROOT/public/images"; do
    [[ -d "$dir" ]] || continue
    while IFS= read -r -d '' f; do
      transcode_one "$f"
    done < <(find "$dir" -maxdepth 1 -name '*.mp4' -print0 | sort -z)
  done
fi

echo "Done. Review *.web.mp4 files; if OK: mv file.web.mp4 file.mp4 && git add ..."
