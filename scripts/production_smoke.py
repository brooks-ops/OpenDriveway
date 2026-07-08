import os
import sys
import urllib.error
import urllib.request


def fetch(url: str) -> tuple[int, str]:
    try:
        with urllib.request.urlopen(url, timeout=15) as response:
            body = response.read().decode("utf-8", errors="replace")
            return response.status, body
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        return exc.code, body


def require(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    api_url = os.environ.get("PRODUCTION_API_URL", "").rstrip("/")
    frontend_url = os.environ.get("PRODUCTION_FRONTEND_URL", "").rstrip("/")
    if not api_url or not frontend_url:
        print("Set PRODUCTION_API_URL and PRODUCTION_FRONTEND_URL before running this smoke test.", file=sys.stderr)
        return 2

    checks = [
        ("API health", f"{api_url}/healthz", lambda status, body: status == 200 and '"status":"ok"' in body.replace(" ", "")),
        ("Frontend home", frontend_url, lambda status, body: status == 200 and "OpenDriveway" in body),
        ("Frontend search route", f"{frontend_url}/search", lambda status, body: status == 200 and "OpenDriveway" in body),
        ("Frontend login route", f"{frontend_url}/login", lambda status, body: status == 200 and "OpenDriveway" in body),
        ("Frontend terms route", f"{frontend_url}/terms", lambda status, body: status == 200 and "OpenDriveway" in body),
        ("Frontend privacy route", f"{frontend_url}/privacy", lambda status, body: status == 200 and "OpenDriveway" in body),
    ]

    for label, url, predicate in checks:
        status, body = fetch(url)
        require(predicate(status, body), f"{label} failed for {url}: HTTP {status}")
        print(f"ok - {label}")

    print("Production smoke checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
