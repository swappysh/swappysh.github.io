#!/usr/bin/env bash
# Usage: ./scripts/delete-save.sh <url-or-id>
# Requires SAVES_WORKER_URL, SAVES_READ_TOKEN, SAVES_WRITE_TOKEN in env or .env

set -euo pipefail

if [ $# -ne 1 ]; then
  echo "Usage: $0 <url-or-id>" >&2
  exit 1
fi

# Load .env if present
[ -f "$(dirname "$0")/../.env" ] && source "$(dirname "$0")/../.env"

WORKER_URL="${SAVES_WORKER_URL:?SAVES_WORKER_URL not set}"
READ_TOKEN="${SAVES_READ_TOKEN:?SAVES_READ_TOKEN not set}"
WRITE_TOKEN="${SAVES_WRITE_TOKEN:?SAVES_WRITE_TOKEN not set}"

INPUT="$1"

# Determine if input looks like an ID (alphanumeric, ~10 chars) or a URL
if [[ "$INPUT" =~ ^https?:// ]]; then
  # Fetch list and find by URL
  LIST=$(curl -sf "$WORKER_URL/api/list?limit=200" -H "Authorization: Bearer $READ_TOKEN")
  ID=$(echo "$LIST" | python3 -c "
import sys, json
data = json.load(sys.stdin)
url = '$INPUT'
for item in data['items']:
    if item['url'] == url:
        print(item['id'])
        sys.exit(0)
sys.exit(1)
" 2>/dev/null || true)

  if [ -z "$ID" ]; then
    echo "Not found: $INPUT" >&2
    exit 1
  fi
else
  ID="$INPUT"
fi

echo "Deleting item: $ID"
curl -sf -X DELETE "$WORKER_URL/api/item/$ID" -H "Authorization: Bearer $WRITE_TOKEN"
echo ""
echo "Done."
