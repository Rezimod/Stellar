"""
Stellar — Quick Debug Helper
Usage: python scripts/debug.py [command]

Commands:
  balance     Check fee payer devnet SOL balance
  airdrop     Request 2 devnet SOL
  sky         Test sky oracle API
  mint        Test mint API with a sample payload
  token       Check Stars token supply
  env         Validate all required .env.local variables

Example:
  python scripts/debug.py sky
  python scripts/debug.py mint
  python scripts/debug.py env
"""

import argparse
import json
import os
import subprocess
import sys
import urllib.request
import urllib.error
from pathlib import Path


def load_env() -> dict:
    env = {}
    env_path = Path(__file__).parents[2] / ".env.local"
    if env_path.exists():
        for line in env_path.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip()
    return env


def cmd_env(env: dict):
    required = [
        "NEXT_PUBLIC_PRIVY_APP_ID",
        "ANTHROPIC_API_KEY",
        "FEE_PAYER_PRIVATE_KEY",
        "MERKLE_TREE_ADDRESS",
        "COLLECTION_MINT_ADDRESS",
        "STARS_TOKEN_MINT",
        "NEXT_PUBLIC_COLLECTION_MINT_ADDRESS",
        "NEXT_PUBLIC_HELIUS_RPC_URL",
        "NEXT_PUBLIC_APP_URL",
    ]
    optional = [
        "NEXT_PUBLIC_SUPABASE_URL",
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        "SUPABASE_SERVICE_ROLE_KEY",
        "SOLANA_RPC_URL",
    ]

    print("Environment Variables Check\n")
    missing = []
    for key in required:
        val = env.get(key, "")
        if val:
            display = val[:8] + "..." if len(val) > 8 else val
            print(f"  OK  {key} = {display}")
        else:
            print(f"  MISS {key} — REQUIRED")
            missing.append(key)

    print()
    for key in optional:
        val = env.get(key, "")
        if val:
            display = val[:8] + "..." if len(val) > 8 else val
            print(f"  OK  {key} = {display}")
        else:
            print(f"  --  {key} (optional)")

    print()
    if missing:
        print(f"Missing {len(missing)} required variables:")
        for m in missing:
            print(f"  {m}")
        print("\nAdd them to .env.local in your project root.")
    else:
        print("All required variables present.")


def cmd_sky(base_url: str):
    url = f"{base_url}/api/sky/verify?lat=41.72&lon=44.83"
    print(f"Testing: {url}\n")
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read())
            print(f"  Status:      {resp.status}")
            print(f"  cloudCover:  {data.get('cloudCover')}%")
            print(f"  visibility:  {data.get('visibility')}")
            print(f"  verified:    {data.get('verified')}")
            print(f"  oracleHash:  {data.get('oracleHash', '')[:30]}...")
            print(f"  verifiedAt:  {data.get('verifiedAt')}")
            print("\nSky oracle is working correctly.")
    except urllib.error.URLError as e:
        print(f"  Error: {e}")
        print("  Is your dev server running on localhost:3000?")


def cmd_mint(base_url: str):
    url = f"{base_url}/api/mint"
    payload = {
        "userAddress": None,
        "target": "Jupiter",
        "timestampMs": 1744000000000,
        "lat": 41.72,
        "lon": 44.83,
        "cloudCover": 15,
        "oracleHash": "0xdebug_test_hash_123",
        "stars": 50,
    }
    print(f"Testing: POST {url}")
    print(f"Payload: {json.dumps(payload, indent=2)}\n")
    try:
        data = json.dumps(payload).encode()
        req = urllib.request.Request(url, data=data,
                                     headers={"Content-Type": "application/json"},
                                     method="POST")
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read())
            print(f"  Status:      {resp.status}")
            print(f"  txId:        {body.get('txId', '')[:30]}...")
            print(f"  explorerUrl: {body.get('explorerUrl', '')}")
            print("\nMint API is working. Check the Explorer URL above.")
    except urllib.error.HTTPError as e:
        body = json.loads(e.read())
        print(f"  Status: {e.code}")
        print(f"  Error:  {body.get('error', json.dumps(body))}")
        if e.code == 500:
            print("\n  Likely cause: FEE_PAYER_PRIVATE_KEY, MERKLE_TREE_ADDRESS, or COLLECTION_MINT_ADDRESS not set.")
            print("  Run: npm run setup:bubblegum")
    except urllib.error.URLError as e:
        print(f"  Error: {e}")


def main():
    parser = argparse.ArgumentParser(description="Stellar debug helper")
    parser.add_argument("command", nargs="?", default="env",
                        choices=["env", "sky", "mint", "balance", "airdrop", "token"])
    parser.add_argument("--url", default="http://localhost:3000")
    args = parser.parse_args()

    env = load_env()

    if args.command == "env":
        cmd_env(env)

    elif args.command == "sky":
        cmd_sky(args.url)

    elif args.command == "mint":
        cmd_mint(args.url)

    elif args.command == "balance":
        fee_payer = env.get("FEE_PAYER_PRIVATE_KEY", "")
        if not fee_payer:
            print("FEE_PAYER_PRIVATE_KEY not set in .env.local")
            sys.exit(1)
        print("Run this in your terminal:")
        print("  solana balance --url devnet")
        print("  # Or with specific address:")
        print("  solana balance <ADDRESS> --url devnet")
        print("\nYou need at least 5 SOL for minting. Request airdrop if low:")
        print("  python scripts/debug.py airdrop")

    elif args.command == "airdrop":
        print("Run this in your terminal (do it 2-3 times if needed):")
        print("  solana airdrop 2 --url devnet")
        print("\nNote: devnet airdrop is rate-limited. Wait a few minutes between requests.")

    elif args.command == "token":
        token_mint = env.get("STARS_TOKEN_MINT", "")
        if not token_mint:
            print("STARS_TOKEN_MINT not set — run: npm run setup:token")
            sys.exit(1)
        print(f"Stars token mint: {token_mint}")
        print("\nRun this in your terminal to check supply:")
        print(f"  spl-token supply {token_mint} --url devnet")
        print("\nTo check a wallet's balance:")
        print(f"  spl-token balance {token_mint} --owner <WALLET> --url devnet")

    else:
        parser.print_help()


if __name__ == "__main__":
    main()
