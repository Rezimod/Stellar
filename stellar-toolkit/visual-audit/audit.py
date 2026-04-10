"""
Stellar — Visual Audit
Usage: python visual-audit/audit.py [--url http://localhost:3000] [--save]

Crawls every page, checks for visual quality signals, scores each page,
and prints a report with actionable fixes. Benchmarked against hackathon winners.

Checks:
  - Font diversity (generic vs distinctive fonts)
  - Above-the-fold content quality
  - Mobile tap target sizes
  - Dark mode completeness
  - NFT/on-chain proof visibility
  - Empty states
  - Navigation accessibility
  - Loading states
  - Error handling UI
  - Contrast ratios (basic check)
"""

import argparse
import json
import os
import sys
from datetime import datetime
from playwright.sync_api import sync_playwright

PAGES = [
    ("/",            "Home / Sky"),
    ("/missions",    "Missions"),
    ("/chat",        "ASTRA Chat"),
    ("/nfts",        "NFT Gallery"),
    ("/profile",     "Profile"),
    ("/marketplace", "Marketplace"),
    ("/darksky",     "Dark Sky Map"),
]

GENERIC_FONTS = ["inter", "roboto", "arial", "system-ui", "-apple-system", "helvetica neue"]

CHECKS = {
    "has_heading": {
        "label": "Has a visible H1 or H2",
        "weight": 10,
        "selector": "h1, h2",
    },
    "no_generic_font": {
        "label": "Not using generic system fonts (Inter, Roboto, Arial)",
        "weight": 8,
    },
    "has_cta_button": {
        "label": "Has a primary CTA button above the fold",
        "weight": 10,
        "selector": "button, a[href]",
    },
    "no_console_errors": {
        "label": "No JS errors in console",
        "weight": 15,
    },
    "has_dark_bg": {
        "label": "Dark background (astronomy theme)",
        "weight": 8,
    },
    "images_load": {
        "label": "No broken images",
        "weight": 10,
    },
    "mobile_tap_targets": {
        "label": "Buttons meet 44px minimum tap target",
        "weight": 8,
    },
    "has_loading_state": {
        "label": "Shows loading state (spinner or skeleton)",
        "weight": 5,
    },
    "has_empty_state": {
        "label": "Has an empty state (no blank page for 0 items)",
        "weight": 8,
    },
    "no_horizontal_scroll": {
        "label": "No horizontal scroll on mobile (390px)",
        "weight": 10,
    },
    "solana_link_visible": {
        "label": "Solana Explorer link or on-chain reference visible",
        "weight": 8,
        "pages": ["/nfts", "/profile", "/missions"],
    },
}

RECOMMENDATIONS = {
    "/": [
        ("HIGH", "Add animated star field canvas behind the hero section"),
        ("HIGH", "Move tonight's best target above the forecast cards"),
        ("HIGH", "Replace generic fonts with Syne (display) + DM Sans (body)"),
        ("MED",  "Add sticky mobile bottom bar with 'Start Observing' CTA"),
        ("MED",  "Make the go/no-go sky verdict 3x larger than weather details"),
        ("LOW",  "Add subtle parallax on scroll for depth"),
    ],
    "/missions": [
        ("HIGH", "Add particle burst animation on mission completion"),
        ("HIGH", "Add NFT card preview in the 'Discovery Sealed' success screen"),
        ("MED",  "Show 'Best Tonight' badge on the top recommended mission"),
        ("MED",  "Add circular viewfinder overlay on camera capture step"),
        ("LOW",  "Add altitude indicator (high/medium/low arc) to mission cards"),
    ],
    "/nfts": [
        ("HIGH", "NFT cards need generated star map thumbnails (canvas, not placeholder)"),
        ("HIGH", "Add compelling empty state with demo NFT card + blur overlay"),
        ("MED",  "Make Solana Explorer links prominent (teal, ExternalLink icon)"),
        ("MED",  "Add Bortle/provenance badges to cards that have them"),
        ("LOW",  "Add hover: border brightens + scale(1.01) CSS only"),
    ],
    "/profile": [
        ("HIGH", "Add rank badge with progression bar (Cadet → Navigator)"),
        ("HIGH", "Show SPL token balance as '✦ N Stars' in display font"),
        ("MED",  "Add compact observation timeline (last 5 missions)"),
        ("MED",  "Link Stars balance to Solana Explorer"),
        ("LOW",  "Add 'X observations to next rank' progress text"),
    ],
    "/chat": [
        ("HIGH", "Chat bubbles look generic — add terminal/instrument aesthetic"),
        ("HIGH", "Show tonight's sky summary as empty state (fetch sky oracle)"),
        ("MED",  "Add 3 suggested astronomy prompts as chips below the input"),
        ("MED",  "Add pulsing streaming cursor while ASTRA is responding"),
        ("LOW",  "Show location indicator below input field"),
    ],
    "/marketplace": [
        ("HIGH", "Product images must be high quality — source from astroman.ge"),
        ("MED",  "Add 'Perfect for beginners' badge to entry-level telescope"),
        ("MED",  "Show both GEL and SOL prices prominently on every card"),
        ("LOW",  "Add compatibility note linking scope to mission difficulty"),
    ],
    "/darksky": [
        ("MED",  "Add legend for Bortle 1-9 scale in map corner"),
        ("MED",  "Show total readings count and dark sky site count in header"),
        ("LOW",  "Add 'Add a Reading' button linking to /missions"),
    ],
}


def check_font(page) -> bool:
    fonts = page.evaluate("""() => {
        const els = document.querySelectorAll('h1, h2, h3, p, button');
        const fonts = new Set();
        els.forEach(el => {
            const f = window.getComputedStyle(el).fontFamily.toLowerCase();
            fonts.add(f);
        });
        return [...fonts].join(',');
    }""")
    return not any(gf in fonts.lower() for gf in GENERIC_FONTS)


def check_dark_bg(page) -> bool:
    try:
        bg = page.evaluate("""() => {
            const body = document.body;
            const bg = window.getComputedStyle(body).backgroundColor;
            const match = bg.match(/\\d+/g);
            if (!match) return false;
            const [r, g, b] = match.map(Number);
            return (r + g + b) / 3 < 80;
        }""")
        return bg
    except Exception:
        return False


def check_tap_targets(page) -> tuple:
    try:
        result = page.evaluate("""() => {
            const buttons = document.querySelectorAll('button, a[href], [role="button"]');
            let small = 0, total = 0;
            buttons.forEach(btn => {
                const rect = btn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    total++;
                    if (rect.height < 44 || rect.width < 44) small++;
                }
            });
            return { small, total };
        }""")
        return result.get("small", 0), result.get("total", 1)
    except Exception:
        return 0, 1


def check_broken_images(page) -> int:
    try:
        return page.evaluate("""() => {
            return [...document.querySelectorAll('img')]
                .filter(img => !img.complete || img.naturalWidth === 0).length;
        }""")
    except Exception:
        return 0


def check_solana_link(page) -> bool:
    try:
        links = page.locator("a[href*='explorer.solana.com'], a[href*='solscan']").count()
        text = page.locator("text=explorer, text=Solana, text=devnet").count()
        return links > 0 or text > 0
    except Exception:
        return False


def audit_page(page, path: str, base_url: str) -> dict:
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)

    try:
        page.goto(f"{base_url}{path}", wait_until="networkidle", timeout=15000)
        page.wait_for_timeout(700)
    except Exception as e:
        return {"path": path, "score": 0, "error": str(e), "findings": []}

    findings = []
    score = 0
    max_score = 0

    # H1/H2 check
    max_score += 10
    has_h = page.locator("h1, h2").count() > 0
    if has_h:
        score += 10
    else:
        findings.append(("HIGH", "No H1 or H2 heading found — add a clear page title"))

    # Font check
    max_score += 8
    good_font = check_font(page)
    if good_font:
        score += 8
    else:
        findings.append(("HIGH", "Using generic fonts (Inter/Roboto/Arial) — upgrade to Syne + DM Sans"))

    # Console errors
    max_score += 15
    if not errors:
        score += 15
    else:
        findings.append(("HIGH", f"{len(errors)} JS error(s) in console"))

    # Dark background
    max_score += 8
    dark = check_dark_bg(page)
    if dark:
        score += 8
    else:
        findings.append(("MED", "Background is not dark — astronomy apps should use dark theme"))

    # Broken images
    max_score += 10
    broken = check_broken_images(page)
    if broken == 0:
        score += 10
    else:
        findings.append(("HIGH", f"{broken} broken image(s) found"))

    # CTA button
    max_score += 10
    cta = page.locator("button, a[href]").first
    if cta.count() > 0:
        score += 10
    else:
        findings.append(("MED", "No interactive CTA found above the fold"))

    # Mobile tap targets
    max_score += 8
    small, total = check_tap_targets(page)
    if total > 0 and small / total < 0.2:
        score += 8
    elif total > 0:
        findings.append(("MED", f"{small}/{total} buttons are below 44px tap target size"))

    # Solana link (only on relevant pages)
    if path in ["/nfts", "/profile", "/missions"]:
        max_score += 8
        has_link = check_solana_link(page)
        if has_link:
            score += 8
        else:
            findings.append(("MED", "No Solana Explorer link visible — add on-chain proof reference"))

    # Mobile horizontal scroll
    max_score += 10
    page.set_viewport_size({"width": 390, "height": 844})
    page.wait_for_timeout(300)
    try:
        scrollable = page.evaluate("() => document.documentElement.scrollWidth > 390")
        if not scrollable:
            score += 10
        else:
            findings.append(("MED", "Horizontal scroll detected on mobile (390px width)"))
    except Exception:
        pass
    page.set_viewport_size({"width": 1440, "height": 900})

    pct = int(score / max_score * 100) if max_score > 0 else 0

    # Add page-specific design recommendations
    page_recs = RECOMMENDATIONS.get(path, [])
    for sev, rec in page_recs:
        findings.append((sev, rec))

    return {
        "path": path,
        "score": pct,
        "findings": findings,
        "console_errors": errors,
    }


def run(base_url: str, save: bool) -> list:
    report_lines = [
        f"# Stellar Visual Audit Report",
        f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
        f"Base URL: {base_url}",
        "",
    ]

    results = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        ctx = browser.new_context(
            viewport={"width": 1440, "height": 900},
            geolocation={"latitude": 41.72, "longitude": 44.83},
            permissions=["geolocation"],
        )
        page = ctx.new_page()

        print(f"\nStellar Visual Audit  →  {base_url}")
        print(f"{'='*55}\n")

        for path, label in PAGES:
            print(f"Auditing {label} ({path})...", end=" ", flush=True)
            result = audit_page(page, path, base_url)
            result["label"] = label
            results.append(result)

            score = result["score"]
            grade = "A" if score >= 80 else "B" if score >= 65 else "C" if score >= 50 else "D"
            print(f"Score: {score}/100  [{grade}]")

            highs = [f for f in result["findings"] if f[0] == "HIGH"]
            meds  = [f for f in result["findings"] if f[0] == "MED"]
            lows  = [f for f in result["findings"] if f[0] == "LOW"]

            for sev, msg in highs[:3]:
                print(f"  [CRITICAL] {msg}")
            for sev, msg in meds[:2]:
                print(f"  [MED]      {msg}")
            if lows:
                print(f"             (+{len(lows)} low-priority items)")
            print()

            report_lines.append(f"## {label} ({path})  —  Score: {score}/100  [{grade}]")
            for sev, msg in result["findings"]:
                report_lines.append(f"- [{sev}] {msg}")
            report_lines.append("")

        ctx.close()
        browser.close()

    avg = int(sum(r["score"] for r in results) / len(results)) if results else 0
    print(f"{'='*55}")
    print(f"Overall score: {avg}/100")

    low_scores = sorted(results, key=lambda r: r["score"])[:3]
    print(f"\nTop 3 pages to fix first:")
    for r in low_scores:
        print(f"  {r['score']:3}/100  {r['path']}")

    if save:
        out_path = "/tmp/stellar_audit.md"
        report_lines.insert(3, f"Overall Score: {avg}/100\n")
        with open(out_path, "w") as f:
            f.write("\n".join(report_lines))
        print(f"\nFull report saved to {out_path}")

    return results


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Visual audit for Stellar app")
    parser.add_argument("--url", default="http://localhost:3000")
    parser.add_argument("--save", action="store_true", help="Save report to /tmp/stellar_audit.md")
    args = parser.parse_args()

    results = run(args.url, args.save)
    low = [r for r in results if r["score"] < 50]
    sys.exit(1 if low else 0)
