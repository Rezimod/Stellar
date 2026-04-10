# Stellar Dev Toolkit

Drop this folder into the root of your Stellar repo. Run any tool from there at any time.

## Setup (one time)

```bash
pip install playwright requests --break-system-packages
playwright install chromium
```

Make sure your dev server is running on localhost:3000 before running tests.

---

## Tools

### 1. Screenshot Crawler — see every page instantly
```bash
python tests/screenshot_all.py
# Output: /tmp/stellar_screenshots/ — desktop + mobile PNGs of every page
```

### 2. Console Error Detector — find broken pages
```bash
python tests/detect_errors.py
# Prints: OK or N issues per page, with error details
```

### 3. API Smoke Tests — verify all endpoints
```bash
python tests/test_api.py
# Checks: /api/sky/verify, /api/mint, /api/award-stars, /api/darksky/data
```

### 4. Mint Flow Test — simulate full observation
```bash
python tests/test_mint_flow.py
# Simulates: sky verify → mint NFT → award stars → check gallery
```

### 5. Visual Audit — page-by-page design scoring
```bash
python visual-audit/audit.py
# Prints: score + findings per page, saves report to /tmp/stellar_audit.md
```

### 6. Mobile vs Desktop diff — side-by-side comparison
```bash
python tests/screenshot_diff.py
# Saves: /tmp/stellar_screenshots/*_compare.png (mobile left, desktop right)
```

### 7. Stress Test — hammer the mint API
```bash
python tests/stress_mint.py
# Sends 10 requests with varied payloads, reports pass/fail
```

### 8. Full suite — run everything
```bash
python scripts/run_all.py
# Runs all tests + audit, saves combined report
```

---

## Where to copy this in your repo

```
your-stellar-repo/
├── stellar-toolkit/          ← this folder
│   ├── README.md
│   ├── tests/
│   ├── visual-audit/
│   └── scripts/
├── src/
├── package.json
└── ...
```

Then from your repo root:
```bash
python stellar-toolkit/tests/screenshot_all.py
```
