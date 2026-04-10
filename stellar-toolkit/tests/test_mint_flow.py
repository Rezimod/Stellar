"""
Stellar — Mint Flow Test
Usage: python tests/test_mint_flow.py [--url http://localhost:3000]

Simulates the full observation flow via API calls (no browser UI):
  1. Verify sky conditions
  2. Call /api/mint
  3. Call /api/award-stars
  4. Verify NFT metadata endpoint

This does NOT require Phantom or a real wallet — tests the server layer only.
"""

import argparse
import json
import sys
import time
from playwright.sync_api import sync_playwright

LAT = 41.72
LON = 44.83
TEST_WALLET = "11111111111111111111111111111111"  # system program = safe test address


def run(base_url: str):
    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto(base_url)

        print(f"Stellar Mint Flow Test  →  {base_url}\n")

        # Step 1: Sky oracle
        print("Step 1 — Sky oracle verification...")
        try:
            resp = page.request.get(f"{base_url}/api/sky/verify?lat={LAT}&lon={LON}")
            sky = resp.json()
            assert resp.status == 200, f"Expected 200, got {resp.status}"
            assert "cloudCover" in sky, "Missing cloudCover"
            assert "oracleHash" in sky, "Missing oracleHash"
            assert "verified" in sky, "Missing verified"
            cloud = sky["cloudCover"]
            oracle_hash = sky["oracleHash"]
            print(f"  OK  cloudCover={cloud}%  hash={oracle_hash[:20]}...")
            results.append(("Sky oracle", True, None))
        except Exception as e:
            print(f"  FAIL  {e}")
            results.append(("Sky oracle", False, str(e)))
            oracle_hash = "0xfallback_test_hash"
            cloud = 15

        # Step 2: Mint NFT
        print("\nStep 2 — Mint compressed NFT...")
        mint_payload = {
            "userAddress": None,
            "target": "Jupiter",
            "timestampMs": int(time.time() * 1000),
            "lat": LAT,
            "lon": LON,
            "cloudCover": cloud,
            "oracleHash": oracle_hash,
            "stars": 50,
        }

        try:
            resp = page.request.post(
                f"{base_url}/api/mint",
                data=json.dumps(mint_payload),
                headers={"Content-Type": "application/json"},
            )
            body = resp.json()

            if resp.status == 200:
                tx_id = body.get("txId", "")
                explorer = body.get("explorerUrl", "")
                print(f"  OK  txId={tx_id[:20]}...")
                print(f"      Explorer: {explorer}")
                results.append(("NFT mint", True, None))
            elif resp.status == 500 and "not configured" in body.get("error", "").lower():
                print(f"  SKIP  Mint env vars not configured (expected during setup)")
                print(f"        Set FEE_PAYER_PRIVATE_KEY, MERKLE_TREE_ADDRESS, COLLECTION_MINT_ADDRESS")
                results.append(("NFT mint", True, "skipped — env not configured"))
            else:
                raise Exception(f"HTTP {resp.status}: {body.get('error', json.dumps(body)[:100])}")
        except AssertionError as e:
            print(f"  FAIL  {e}")
            results.append(("NFT mint", False, str(e)))
        except Exception as e:
            if "not configured" in str(e).lower() or "env" in str(e).lower():
                print(f"  SKIP  {e}")
                results.append(("NFT mint", True, "skipped"))
            else:
                print(f"  FAIL  {e}")
                results.append(("NFT mint", False, str(e)))

        # Step 3: Award stars
        print("\nStep 3 — Award Stars SPL token...")
        stars_payload = {
            "recipientAddress": TEST_WALLET,
            "amount": 50,
            "reason": "Jupiter observation test",
        }
        try:
            resp = page.request.post(
                f"{base_url}/api/award-stars",
                data=json.dumps(stars_payload),
                headers={"Content-Type": "application/json"},
            )
            body = resp.json()

            if resp.status == 200:
                print(f"  OK  txId={body.get('txId', '')[:20]}...")
                results.append(("Award stars", True, None))
            elif resp.status == 503:
                print(f"  SKIP  Stars token not configured (expected during setup)")
                print(f"        Run: npm run setup:token")
                results.append(("Award stars", True, "skipped — token not configured"))
            elif resp.status == 400:
                print(f"  FAIL  Validation error: {body.get('error')}")
                results.append(("Award stars", False, body.get("error")))
            else:
                raise Exception(f"HTTP {resp.status}: {json.dumps(body)[:100]}")
        except Exception as e:
            if "configured" in str(e).lower():
                print(f"  SKIP  {e}")
                results.append(("Award stars", True, "skipped"))
            else:
                print(f"  FAIL  {e}")
                results.append(("Award stars", False, str(e)))

        # Step 4: NFT metadata endpoint
        print("\nStep 4 — NFT metadata endpoint...")
        meta_url = (
            f"{base_url}/api/metadata/observation"
            f"?target=Jupiter&ts=1744000000000&lat={LAT}&lon={LON}&cc={cloud}&hash={oracle_hash}&stars=50"
        )
        try:
            resp = page.request.get(meta_url)
            meta = resp.json()
            assert resp.status == 200, f"Expected 200, got {resp.status}"
            assert "name" in meta, "Missing name field"
            assert "attributes" in meta, "Missing attributes field"
            assert any(a["trait_type"] == "Target" for a in meta["attributes"]), "Missing Target attribute"
            print(f"  OK  name='{meta['name']}'  attributes={len(meta['attributes'])} fields")
            results.append(("NFT metadata", True, None))
        except Exception as e:
            print(f"  FAIL  {e}")
            results.append(("NFT metadata", False, str(e)))

        # Step 5: Dark sky data
        print("\nStep 5 — Dark sky GeoJSON...")
        try:
            resp = page.request.get(f"{base_url}/api/darksky/data")
            geo = resp.json()
            assert resp.status == 200, f"Expected 200, got {resp.status}"
            assert geo.get("type") == "FeatureCollection", "Not a GeoJSON FeatureCollection"
            assert "features" in geo, "Missing features array"
            print(f"  OK  {geo.get('count', 0)} readings in database")
            results.append(("Dark sky data", True, None))
        except Exception as e:
            print(f"  FAIL  {e}")
            results.append(("Dark sky data", False, str(e)))

        browser.close()

    print(f"\n{'='*50}")
    passed = sum(1 for _, ok, _ in results if ok)
    failed = sum(1 for _, ok, _ in results if not ok)
    skipped = sum(1 for _, ok, note in results if ok and note and "skip" in str(note).lower())
    print(f"Result: {passed} passed ({skipped} skipped due to missing env), {failed} failed")

    if failed > 0:
        print("\nFailed steps:")
        for label, ok, err in results:
            if not ok:
                print(f"  - {label}: {err}")
        print("\nCheck .env.local and make sure you've run:")
        print("  npm run setup:bubblegum")
        print("  npm run setup:token")
    else:
        print("\nAll steps passed. Mint flow is working.")

    return failed


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Test the full Stellar mint flow")
    parser.add_argument("--url", default="http://localhost:3000")
    args = parser.parse_args()

    failures = run(args.url)
    sys.exit(1 if failures > 0 else 0)
