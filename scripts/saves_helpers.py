"""Shared helpers for saves management scripts."""

import json
import os
import subprocess
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError


def load_env(script_dir: str) -> None:
    """Load .env file from project root if present."""
    env_path = os.path.join(script_dir, "..", ".env")
    if not os.path.isfile(env_path):
        return
    with open(env_path, encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            key, _, value = line.partition("=")
            key = key.strip()
            value = value.strip().strip("\"'")
            os.environ.setdefault(key, value)


def get_config() -> tuple[str, str, str]:
    """Return (worker_url, read_token, write_token), exiting on missing vars."""
    worker_url = os.environ.get("SAVES_WORKER_URL")
    read_token = os.environ.get("SAVES_READ_TOKEN")
    write_token = os.environ.get("SAVES_WRITE_TOKEN")
    missing = []
    if not worker_url:
        missing.append("SAVES_WORKER_URL")
    if not read_token:
        missing.append("SAVES_READ_TOKEN")
    if not write_token:
        missing.append("SAVES_WRITE_TOKEN")
    if missing:
        print(f"Missing env vars: {', '.join(missing)}", file=sys.stderr)
        sys.exit(1)
    return worker_url, read_token, write_token


def require_fzf() -> None:
    """Exit if fzf is not on PATH."""
    if (
        subprocess.run(
            ["command", "-v", "fzf"],
            shell=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        ).returncode
        != 0
    ):
        print("fzf required: brew install fzf", file=sys.stderr)
        sys.exit(1)


def _make_request(
    url: str,
    method: str = "GET",
    headers: dict | None = None,
    data: bytes | None = None,
) -> tuple[int, bytes]:
    """Make HTTP request with urllib, adding User-Agent to avoid Cloudflare blocks."""
    req = Request(url, data=data, method=method)
    req.add_header("User-Agent", "saves-cli/1.0")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urlopen(req) as resp:
            return resp.status, resp.read()
    except HTTPError as exc:
        return exc.code, exc.read()


def fetch_saves(worker_url: str, read_token: str, limit: int = 200) -> list[dict]:
    """Fetch saves from the worker API. Returns list of item dicts."""
    status, body = _make_request(
        f"{worker_url}/api/list?limit={limit}",
        headers={"Authorization": f"Bearer {read_token}"},
    )
    if status != 200:
        print(f"Failed to fetch saves: HTTP {status}", file=sys.stderr)
        sys.exit(1)
    return json.loads(body).get("items", [])


def format_items(items: list[dict]) -> str:
    """Format items as tab-separated lines for fzf display.

    Returns: 'id\\t[TYPE] Title  URL' with ANSI dim on URL.
    """
    lines = []
    for item in items:
        title = item.get("title", "").replace("\t", " ")
        url = item.get("url", "").replace("\t", " ")
        type_ = item.get("type", "other")
        lines.append(f"{item['id']}\t[{type_}] {title}  \033[2m{url}\033[0m")
    return "\n".join(lines)


def run_fzf(
    formatted: str, prompt: str = "Search: ", header: str = "", multi: bool = False
) -> str:
    """Run fzf with the given formatted input. Returns selected lines."""
    cmd = [
        "fzf",
        "--ansi",
        "--with-nth=2",
        "--delimiter=\t",
        f"--prompt={prompt}",
        "--height=80%",
        "--reverse",
    ]
    if header:
        cmd.append(f"--header={header}")
    if multi:
        cmd.append("--multi")

    result = subprocess.run(
        cmd,
        input=formatted,
        capture_output=True,
        text=True,
    )
    # fzf returns 130 on ESC, 0 on selection
    return result.stdout.strip()


def patch_item(worker_url: str, write_token: str, item_id: str, body: dict) -> dict:
    """Patch a save item via the worker API. Returns the updated item dict."""
    data = json.dumps(body).encode()
    status, resp_body = _make_request(
        f"{worker_url}/api/item/{item_id}",
        method="PATCH",
        headers={
            "Authorization": f"Bearer {write_token}",
            "Content-Type": "application/json",
        },
        data=data,
    )
    if status != 200:
        print(f"Failed to patch item: HTTP {status}", file=sys.stderr)
        sys.exit(1)
    return json.loads(resp_body)


def delete_item(worker_url: str, write_token: str, item_id: str) -> bool:
    """Delete a single item via the worker API. Returns True on success."""
    status, _ = _make_request(
        f"{worker_url}/api/item/{item_id}",
        method="DELETE",
        headers={"Authorization": f"Bearer {write_token}"},
    )
    return status == 200
