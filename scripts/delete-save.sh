#!/usr/bin/env bash
# Interactive saves manager — fuzzy search and delete
# Requires: fzf (brew install fzf)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$SCRIPT_DIR/../.env" ] && source "$SCRIPT_DIR/../.env"

WORKER_URL="${SAVES_WORKER_URL:?SAVES_WORKER_URL not set}"
READ_TOKEN="${SAVES_READ_TOKEN:?SAVES_READ_TOKEN not set}"
WRITE_TOKEN="${SAVES_WRITE_TOKEN:?SAVES_WRITE_TOKEN not set}"

if ! command -v fzf &>/dev/null; then
  echo "fzf required: brew install fzf" >&2
  exit 1
fi

echo "Fetching saves..." >&2
LIST=$(curl -sf "$WORKER_URL/api/list?limit=200" -H "Authorization: Bearer $READ_TOKEN")

FORMATTED=$(python3 -c "
import sys, json
data = json.load(sys.stdin)
for item in data['items']:
    title = item.get('title','').replace('\t',' ')
    url   = item.get('url','').replace('\t',' ')
    type_ = item.get('type','other')
    print(f\"{item['id']}\t[{type_}] {title}  \033[2m{url}\033[0m\")
" <<< "$LIST")

if [ -z "$FORMATTED" ]; then
  echo "No saves found." >&2
  exit 0
fi

SELECTED=$(echo "$FORMATTED" | fzf \
  --ansi \
  --multi \
  --with-nth=2 \
  --delimiter=$'\t' \
  --prompt="Search: " \
  --header="TAB=select  ENTER=delete  ESC=cancel" \
  --height=80% \
  --reverse \
  || true)

if [ -z "$SELECTED" ]; then
  echo "Nothing selected." >&2
  exit 0
fi

COUNT=$(echo "$SELECTED" | wc -l | tr -d ' ')
echo ""
echo "About to delete $COUNT item(s):"
echo "$SELECTED" | cut -f2 | sed 's/^/  /'
echo ""
read -r -p "Confirm? [y/N] " CONFIRM
[[ "$CONFIRM" =~ ^[yY]$ ]] || { echo "Aborted."; exit 0; }

echo "$SELECTED" | cut -f1 | while read -r id; do
  echo -n "  Deleting $id... "
  curl -sf -X DELETE "$WORKER_URL/api/item/$id" -H "Authorization: Bearer $WRITE_TOKEN" > /dev/null \
    && echo "done" || echo "FAILED"
done

echo "Deleted $COUNT item(s)."
