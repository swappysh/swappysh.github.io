#!/usr/bin/env python3
"""Interactive saves editor — fuzzy search, then edit title/excerpt in $EDITOR."""

import json
import os
import subprocess
import sys
import tempfile

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from saves_helpers import (
    fetch_saves,
    format_items,
    get_config,
    load_env,
    patch_item,
    require_fzf,
    run_fzf,
)


def main() -> None:
    load_env(SCRIPT_DIR)
    worker_url, read_token, write_token = get_config()
    require_fzf()

    print("Fetching saves...", file=sys.stderr)
    items = fetch_saves(worker_url, read_token)
    if not items:
        print("No saves found.", file=sys.stderr)
        return

    formatted = format_items(items)
    selected = run_fzf(
        formatted,
        prompt="Edit: ",
        header="ENTER=edit  ESC=cancel",
    )

    if not selected:
        print("Nothing selected.", file=sys.stderr)
        return

    item_id = selected.split("\t", 1)[0]
    item = next(i for i in items if i["id"] == item_id)
    title = item.get("title", "")
    excerpt = item.get("excerpt", "")
    before = json.dumps({"title": title, "excerpt": excerpt}, ensure_ascii=True)

    editor_content = (
        "# Edit title and excerpt, then save and close the editor.\n"
        "# Lines starting with # are ignored.\n"
        "title:\n"
        f"{title}\n"
        "excerpt:\n"
        f"{excerpt}\n"
    )
    if excerpt and not excerpt.endswith("\n"):
        editor_content += "\n"

    with tempfile.NamedTemporaryFile(
        mode="w", suffix=".txt", delete=False, encoding="utf-8"
    ) as tmp:
        tmp.write(editor_content)
        tmp_path = tmp.name

    try:
        editor = os.environ.get("EDITOR", "vi")
        subprocess.run([editor, tmp_path], check=False)

        with open(tmp_path, encoding="utf-8") as fh:
            lines = fh.read().splitlines()

        while lines and (lines[0].startswith("#") or not lines[0].strip()):
            lines.pop(0)

        if (
            len(lines) < 3
            or not lines[0].startswith("title:")
            or not lines[2].startswith("excerpt:")
        ):
            print(
                "Expected format:\n  title:<title>\n  excerpt:<excerpt>",
                file=sys.stderr,
            )
            sys.exit(1)

        new_title = lines[0].removeprefix("title:").strip()
        new_excerpt = "\n".join(lines[2:]).removeprefix("excerpt:").rstrip("\n")
        patch_body = {"title": new_title, "excerpt": new_excerpt}

        if json.dumps(patch_body, ensure_ascii=True) == before:
            print("No changes made.", file=sys.stderr)
            return

        print(f"Updating {item_id}...", file=sys.stderr)
        updated = patch_item(worker_url, write_token, item_id, patch_body)
        print(f"Updated {item_id}: {updated.get('title', '')}")
    finally:
        os.unlink(tmp_path)


if __name__ == "__main__":
    main()
