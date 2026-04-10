"""
Stellar — Console Error Detector
Usage: python tests/detect_errors.py [--url http://localhost:3000]

Visits every page, collects JS errors, failed fetches, 404s, and React warnings.
Run this after any code change to catch regressions instantly.
"""

import argparse
import sys
from playwright.sync_api import sync_playwright

PAGES = [
    "/",
    "/missions",
    "/chat",
    "/nfts",
    "/profile",
    "/marketplace",
    "/darksky",
    "/leaderboard",
]

IGNORE_PATTERNS = [
    "favicon.ico",
    "hot-update",
    "_next/webpack",
    "ResizeObserver loop",
    "__nextjs",
]

def should_ignore(text: str) -> bool:
    return any(p in text for p in IGNORE_PATTERNS)


def run(base_url: str) -> dict:
    all_results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            geolocation={"latitude": 41.72, "longitude": 44.83},
            permissions=["geolocation"],
        )
        print(f"Stellar Error Detector  →  {base_url}\n")

        for path in PAGES:
            errors = []
            warnings = []
            failed_requests = []

            page = ctx.new_page()

            def on_console(msg, _e=errors, _w=warnings):
                if should_ignore(msg.text):
                    return
                if msg.type == "error":
                    _e.append(msg.text)
                elif msg.type == "warning" and "Warning:" in msg.text:
                    _w.append(msg.text)

            def on_pageerror(err, _e=errors):
                _e.append(f"[uncaught] {err}")

            def on_response(resp, _r=failed_requests):
                if resp.status == 404 and not should_ignore(resp.url):
                    _r.append(f"404 {resp.url}")
                elif resp.status >= 500:
                    _r.append(f"{resp.status} {resp.url}")

            page.on("console", on_console)
            page.on("pageerror", on_pageerror)
            page.on("response", on_response)

            try:
                page.goto(f"{base_url}{path}", wait_until="load", timeout=30000)
                page.wait_for_timeout(800)
            except Exception as e:
                errors.append(f"[navigation] {e}")

            total_issues = len(errors) + len(failed_requests)
            status = "OK " if total_issues == 0 else "ERR"

            print(f"  {status}  {path}")
            for e in errors[:5]:
                print(f"       [error]   {e[:120]}")
            for r in failed_requests[:3]:
                print(f"       [request] {r[:120]}")
            if warnings:
                print(f"       [warn]    {len(warnings)} React warning(s) — run with --verbose to see")

            all_results[path] = {
                "errors": errors,
                "warnings": warnings,
                "failed_requests": failed_requests,
            }

            page.close()

        ctx.close()
        browser.close()

    total_errors = sum(len(v["errors"]) + len(v["failed_requests"]) for v in all_results.values())
    print(f"\n{'='*50}")
    if total_errors == 0:
        print("All pages clean — no errors detected.")
    else:
        print(f"Total issues: {total_errors}")
        print("Fix errors above before submitting to Colosseum.")
    return all_results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Detect JS errors on all Stellar pages")
    parser.add_argument("--url", default="http://localhost:3000")
    parser.add_argument("--verbose", action="store_true", help="Show React warnings too")
    args = parser.parse_args()

    results = run(args.url)
    total = sum(len(v["errors"]) + len(v["failed_requests"]) for v in results.values())
    sys.exit(1 if total > 0 else 0)
