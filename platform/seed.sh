#!/usr/bin/env bash
# seed.sh — يرفع حزم اللغات (platform/packs) إلى R2 المحلي (--local) أو البعيد (--remote)
# الاستخدام: bash seed.sh --local    |    bash seed.sh --remote
set -euo pipefail
cd "$(dirname "$0")"
MODE="${1:---local}"
B=ghaida-book-r2
put() { npx wrangler r2 object put "$B/$1" --file "$2" ${3:+--content-type "$3"} $MODE >/dev/null && echo "  ↑ $1"; }
put packs/template.html packs/template.html "text/html; charset=utf-8"
put packs/catalog.json packs/catalog.json application/json
for d in packs/*/; do
  L=$(basename "$d")
  put "packs/$L/pack.json" "$d/pack.json" application/json
  put "packs/$L/fonts.json" "$d/fonts.json" application/json
  for f in "$d"/icon-*.png; do put "packs/$L/$(basename "$f")" "$f" image/png; done
  for f in "$d"/a/*; do put "packs/$L/a/$(basename "$f")" "$f"; done
done
echo "seeded ($MODE)"
