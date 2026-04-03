#!/usr/bin/env python3
"""Interactive saves manager — fuzzy search and delete."""

import os
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)

from saves_helpers import (
    delete_item,
    fetch_saves,
    format_items,
    get_config,
    load_env,
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
        prompt="Search: ",
        header="TAB=select  ENTER=delete  ESC=cancel",
        multi=True,
    )

    if not selected:
        print("Nothing selected.", file=sys.stderr)
        return

    lines = selected.splitlines()
    ids = [line.split("\t", 1)[0] for line in lines]
    titles = [line.split("\t", 1)[1] if "\t" in line else line for line in lines]

    count = len(ids)
    print()
    print(f"About to delete {count} item(s):")
    for title in titles:
        print(f"  {title}")
    print()

    confirm = input("Confirm? [y/N] ")
    if confirm.lower() != "y":
        print("Aborted.")
        return

    deleted = 0
    for item_id in ids:
        print(f"  Deleting {item_id}... ", end="", flush=True)
        if delete_item(worker_url, write_token, item_id):
            print("done")
            deleted += 1
        else:
            print("FAILED")

    print(f"Deleted {deleted} item(s).")


if __name__ == "__main__":
    main()
