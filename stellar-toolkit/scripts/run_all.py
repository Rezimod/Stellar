"""
Stellar — Run All Tests
Usage: python scripts/run_all.py [--url http://localhost:3000]

Runs the full test suite in order:
  1. Console error detection
  2. API smoke tests
  3. Mint flow test
  4. Visual audit
  5. Screenshot crawl

Saves a combined report to /tmp/stellar_full_report.md
"""

import argparse
import os
import subprocess
import sys
from datetime import datetime

SCRIPTS = [
    ("Console error scan",   "tests/detect_errors.py"),
    ("API smoke tests",      "tests/test_api.py"),
    ("Mint flow test",       "tests/test_mint_flow.py"),
    ("Visual audit",         "visual-audit/audit.py --save"),
    ("Screenshot crawl",     "tests/screenshot_all.py"),
]


def run_script(name: str, script: str, base_url: str) -> tuple:
    print(f"\n{'='*55}")
    print(f"Running: {name}")
    print(f"{'='*55}")

    parts = script.split()
    cmd = [sys.executable] + parts + ["--url", base_url]
    # Add --save only if the flag is in the script args
    if "--save" not in parts:
        pass

    result = subprocess.run(
        cmd,
        cwd=os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        capture_output=False,
    )
    return result.returncode == 0


def main():
    parser = argparse.ArgumentParser(description="Run all Stellar tests")
    parser.add_argument("--url", default="http://localhost:3000")
    parser.add_argument("--skip-screenshots", action="store_true",
                        help="Skip screenshot crawl (faster)")
    args = parser.parse_args()

    print(f"\nStellar Full Test Suite")
    print(f"URL: {args.url}")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M')}")

    scripts = SCRIPTS
    if args.skip_screenshots:
        scripts = [s for s in SCRIPTS if "screenshot" not in s[0].lower()]

    results = []
    for name, script in scripts:
        ok = run_script(name, script, args.url)
        results.append((name, ok))

    print(f"\n\n{'='*55}")
    print("FINAL RESULTS")
    print(f"{'='*55}")

    passed = 0
    failed = 0
    for name, ok in results:
        status = "PASS" if ok else "FAIL"
        print(f"  {status}  {name}")
        if ok:
            passed += 1
        else:
            failed += 1

    print(f"\n{passed}/{len(results)} suites passed")

    if failed == 0:
        print("\nAll clear. App is ready to demo.")
    else:
        print(f"\n{failed} suite(s) need attention before your Colosseum demo.")

    report_path = "/tmp/stellar_full_report.md"
    with open(report_path, "w") as f:
        f.write(f"# Stellar Test Report\n")
        f.write(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n")
        f.write(f"URL: {args.url}\n\n")
        f.write(f"## Results\n\n")
        for name, ok in results:
            f.write(f"- {'PASS' if ok else 'FAIL'}  {name}\n")
        f.write(f"\n{passed}/{len(results)} suites passed\n")

    print(f"\nReport saved to {report_path}")
    sys.exit(1 if failed > 0 else 0)


if __name__ == "__main__":
    main()
