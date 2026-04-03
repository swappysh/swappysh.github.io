#!/usr/bin/env bash
# Interactive saves editor — fuzzy search, then edit title/excerpt in $EDITOR
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$SCRIPT_DIR/../.env" ] && source "$SCRIPT_DIR/../.env"

WORKER_URL="${SAVES_WORKER_URL:?SAVES_WORKER_URL not set}"
READ_TOKEN="${SAVES_READ_TOKEN:?SAVES_READ_TOKEN not set}"
WRITE_TOKEN="${SAVES_WRITE_TOKEN:?SAVES_WRITE_TOKEN not set}"
EDITOR_CMD="${EDITOR:-vi}"

if ! command -v fzf &>/dev/null; then
  echo "fzf required: brew install fzf" >&2
  exit 1
fi

echo "Fetching saves..." >&2
LIST=$(curl -sf "$WORKER_URL/api/list?limit=200" -H "Authorization: Bearer $READ_TOKEN")

FORMATTED=$(python3 -c '
import json, sys
data = json.load(sys.stdin)
for item in data["items"]:
    title = item.get("title", "").replace("\t", " ")
    url = item.get("url", "").replace("\t", " ")
    type_ = item.get("type", "other")
    print(f"{item['id']}\t[{type_}] {title}  \033[2m{url}\033[0m")
' <<< "$LIST")

if [ -z "$FORMATTED" ]; then
  echo "No saves found." >&2
  exit 0
fi

SELECTED=$(printf '%s\n' "$FORMATTED" | fzf \
  --ansi \
  --with-nth=2 \
  --delimiter=$'\t' \
  --prompt="Edit: " \
  --header="ENTER=edit  ESC=cancel" \
  --height=80% \
  --reverse \
  || true)

if [ -z "$SELECTED" ]; then
  echo "Nothing selected." >&2
  exit 0
fi

ID=$(printf '%s' "$SELECTED" | cut -f1)
TMP_FILE=$(mktemp)
trap 'rm -f "$TMP_FILE" "$TMP_FILE.json"' EXIT INT TERM

BEFORE=$(python3 -c '
import json, sys

selected_id = sys.argv[1]
data = json.load(sys.stdin)
item = next((i for i in data["items"] if i["id"] == selected_id), None)
if item is None:
    raise SystemExit("Selected item not found")

title = item.get("title", "")
excerpt = item.get("excerpt", "")

print("# Edit title and excerpt, then save and close the editor.")
print("# Lines starting with # are ignored.")
print("title:")
print(title)
print()
print("excerpt:")
if excerpt:
    print(excerpt, end="" if excerpt.endswith("\n") else "\n")

print("---JSON---", file=sys.stderr)
print(json.dumps({"title": title, "excerpt": excerpt}, ensure_ascii=True), file=sys.stderr)
' "$ID" <<< "$LIST" 2>"$TMP_FILE.json" > "$TMP_FILE")

BEFORE=$(cat "$TMP_FILE.json")

"$EDITOR_CMD" "$TMP_FILE"

PATCH_BODY=$(python3 -c '
import json, sys

path = sys.argv[1]
with open(path, encoding="utf-8") as fh:
    lines = fh.read().splitlines()

while lines and (lines[0].startswith("#") or not lines[0].strip()):
    lines.pop(0)

if len(lines) < 3 or lines[0] != "title:" or lines[2] != "excerpt:":
    raise SystemExit("Expected format:\n  title:\n  <title>\n\n  excerpt:\n  <excerpt>")

title = lines[1].strip()
excerpt = "\n".join(lines[3:]).rstrip("\n")
print(json.dumps({"title": title, "excerpt": excerpt}, ensure_ascii=True))
' "$TMP_FILE")

if [ "$PATCH_BODY" = "$BEFORE" ]; then
  echo "No changes made." >&2
  exit 0
fi

echo "Updating $ID..." >&2
RESPONSE=$(curl -sf -X PATCH "$WORKER_URL/api/item/$ID" \
  -H "Authorization: Bearer $WRITE_TOKEN" \
  -H "Content-Type: application/json" \
  --data "$PATCH_BODY")

UPDATED_TITLE=$(python3 -c 'import json, sys; print(json.load(sys.stdin).get("title", ""))' <<< "$RESPONSE")
echo "Updated $ID: $UPDATED_TITLE"
