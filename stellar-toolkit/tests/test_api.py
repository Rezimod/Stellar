"""
Stellar — API Smoke Tests
Usage: python tests/test_api.py [--url http://localhost:3000]

Tests every API route with valid and invalid inputs.
Run after any backend change to catch broken endpoints immediately.
"""

import argparse
import json
import sys
from playwright.sync_api import sync_playwright

BASE_PAYLOAD = {
    "userAddress": None,
    "target": "Jupiter",
    "timestampMs": 1744000000000,
    "lat": 41.72,
    "lon": 44.83,
    "cloudCover": 15,
    "oracleHash": "0xabc123def456789",
    "stars": 50,
}

TESTS = [
    # (label, method, path, body, expected_statuses, required_keys)
    ("Sky oracle — valid Tbilisi coords",
     "GET", "/api/sky/verify?lat=41.72&lon=44.83", None,
     [200], ["cloudCover", "oracleHash", "verified", "verifiedAt", "visibility"]),

    ("Sky oracle — missing lat",
     "GET", "/api/sky/verify?lon=44.83", None,
     [400], ["error"]),

    ("Sky oracle — invalid coords",
     "GET", "/api/sky/verify?lat=999&lon=44.83", None,
     [400], ["error"]),

    ("Mint — no body",
     "POST", "/api/mint", {}, [400], []),

    ("Mint — valid payload (no env = 500, env ok = 200)",
     "POST", "/api/mint", BASE_PAYLOAD, [200, 500], []),

    ("Mint — cloud too high (>70)",
     "POST", "/api/mint", {**BASE_PAYLOAD, "cloudCover": 85}, [400], ["error"]),

    ("Mint — empty target",
     "POST", "/api/mint", {**BASE_PAYLOAD, "target": ""}, [400], ["error"]),

    ("Mint — invalid lat",
     "POST", "/api/mint", {**BASE_PAYLOAD, "lat": 999}, [400], ["error"]),

    ("Mint — negative stars",
     "POST", "/api/mint", {**BASE_PAYLOAD, "stars": -1}, [400], ["error"]),

    ("Mint — stars too high",
     "POST", "/api/mint", {**BASE_PAYLOAD, "stars": 9999}, [400], ["error"]),

    ("Award stars — no body",
     "POST", "/api/award-stars", {}, [400, 503], []),

    ("Award stars — invalid address",
     "POST", "/api/award-stars",
     {"recipientAddress": "not-a-pubkey", "amount": 10, "reason": "test"},
     [400], ["error"]),

    ("Award stars — amount too high",
     "POST", "/api/award-stars",
     {"recipientAddress": "11111111111111111111111111111111", "amount": 9999, "reason": "test"},
     [400], ["error"]),

    ("Dark sky data — GeoJSON",
     "GET", "/api/darksky/data", None,
     [200], ["type", "features", "count"]),

    ("Metadata observation — valid params",
     "GET", "/api/metadata/observation?target=Jupiter&ts=1744000000000&lat=41.72&lon=44.83&cc=15&hash=0xabc&stars=50",
     None, [200], ["name", "attributes"]),
]


def run(base_url: str):
    passed = 0
    failed = 0
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(base_url)

        print(f"Stellar API Tests  →  {base_url}\n")
        print(f"  {'RESULT':<6}  {'STATUS':<6}  TEST")
        print(f"  {'-'*6}  {'-'*6}  {'-'*50}")

        for label, method, path, body, expected_statuses, required_keys in TESTS:
            try:
                if method == "GET":
                    resp = page.request.get(f"{base_url}{path}")
                else:
                    resp = page.request.post(
                        f"{base_url}{path}",
                        data=json.dumps(body),
                        headers={"Content-Type": "application/json"},
                    )

                status = resp.status
                status_ok = status in expected_statuses

                keys_ok = True
                if required_keys and status_ok:
                    try:
                        body_json = resp.json()
                        keys_ok = all(k in body_json for k in required_keys)
                    except Exception:
                        keys_ok = not required_keys

                ok = status_ok and keys_ok
                result = "PASS" if ok else "FAIL"
                if ok:
                    passed += 1
                else:
                    failed += 1

                print(f"  {result:<6}  {status:<6}  {label}")
                if not ok:
                    if not status_ok:
                        print(f"           expected status {expected_statuses}, got {status}")
                    if not keys_ok:
                        try:
                            b = resp.json()
                            missing = [k for k in required_keys if k not in b]
                            print(f"           missing keys: {missing}")
                        except Exception:
                            print(f"           response not JSON")

                results.append({"label": label, "ok": ok, "status": status})

            except Exception as e:
                failed += 1
                print(f"  {'ERR':<6}  {'?':<6}  {label}")
                print(f"           exception: {e}")
                results.append({"label": label, "ok": False, "error": str(e)})

        browser.close()

    print(f"\n{'='*50}")
    print(f"Result: {passed} passed, {failed} failed out of {passed+failed} tests")
    if failed > 0:
        print("\nFailed tests:")
        for r in results:
            if not r["ok"]:
                print(f"  - {r['label']}")
    return failed


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="API smoke tests for Stellar")
    parser.add_argument("--url", default="http://localhost:3000")
    args = parser.parse_args()

    failures = run(args.url)
    sys.exit(1 if failures > 0 else 0)
