# Sidera design system

The brief for every Sidera page. Read `docs/sidera/RULES.md` (tone and vocabulary) first. If a composition could be the frontispiece of a 1960s observatory annual report, it is on brand.

## Opting in

Sidera pages wrap themselves in `SideraShell`. Nothing else is needed:

```tsx
import SideraShell from '@/components/sidera/SideraShell';

export default function Page() {
  return (
    <SideraShell>
      <section className="sd-container">…</section>
    </SideraShell>
  );
}
```

The shell puts `.sidera` on its root. That class scopes every token below, re-points `--font-display`, `--font-body` and `--font-mono` to the two Sidera faces, and hides the legacy Stellar nav, footer, bottom tabs and starfield while the page is mounted (`html:has(.sidera)`). Legacy pages do not change. The shell provides a sticky top bar (wordmark, Set 001, Capsules, Collection, account control — Tonight joins it in Phase 8) and a footer line. Do not render a second `<main>`; the root layout already has one.

Sidera is dark-only. The light theme and the `data-theme` toggle do not reach inside `.sidera`. Field mode (red night vision) still applies, on purpose.

## Tokens (`src/styles/sidera-tokens.css`)

| Token | Value | Use |
| --- | --- | --- |
| `--sd-ground` | `#0b0c0e` | Page ground. Near-black, faintly cool. Never `#000`. |
| `--sd-plate` / `--sd-plate-hover` | `#131417` / `#181a1d` | A card plate, a menu, a raised panel. |
| `--sd-ink` | `#ece7da` | Bone white. Object names, headings, body. 15.9:1. |
| `--sd-ink-2` | `#b3aea1` | Secondary copy, data values. 8.8:1. |
| `--sd-ink-3` | `#8a867c` | Captions, data labels. The floor for text: 5.4:1. |
| `--sd-ink-4` | `#5f5c55` | Outlines of unowned plates, disabled. Not for text. |
| `--sd-rule` / `--sd-rule-strong` | ink at 12% / 24% | 1px hairlines. The only separators. |
| `--brass` | `#c9a84c` | The one warm accent. Defined on `:root` too. |
| `--sd-rarity-common` | `#978d72` | Brass ramp, nearest the neutrals. |
| `--sd-rarity-rare` | `#b09a5f` | |
| `--sd-rarity-epic` | `#c9a84c` | `= --brass` |
| `--sd-rarity-legendary` | `#e2c77a` | Brightest brass. |
| `--sd-status-dedicated` / `-eligible` / `-not-available` | ink / ink-2 / ink-3 | Observation status. Monochrome. |
| `--sd-gutter` / `--sd-max` / `--sd-bar-h` | `16px` / `1040px` / `56px` | Layout. |

The same rarity hexes live in `RARITY_MAP` in `src/lib/rarity.ts`; `rarityInfo(r).color` is safe to use for an SVG stroke or a share image.

Utilities: `.sd-container` (gutter and measure), `.sd-display`, `.sd-name`, `.sd-mono`, `.sd-data`, `.sd-label`, `.sd-rule`. They are unlayered, so they beat the global `p` and `h1`–`h6` rules and also Tailwind utilities. Do not combine an `sd-*` type class with a Tailwind font or tracking class on the same element.

## Type — two faces, nothing else

- **Baskervville** (`--font-sidera-serif`, `.sd-serif`), a transitional serif revived from Baskerville's 1757 type, the face of mid-century institutional print. Wordmark, object names, headings, body copy. Regular weight, and italic for a Latin or catalogue name. It has no small caps, so the wordmark uses capitals, widely tracked.
- **IBM Plex Mono** (`--font-sidera-mono`, `.sd-mono`), a typewriter-lineage mono with tabular figures. Use it for all data: coordinates, UTC timestamps, edition numbers, magnitudes, node IDs, prices, counts, rarity and status words. Any number that came off an instrument goes in mono.

No sans. No Orbitron, Geist or JetBrains Mono on a Sidera page. The minimum text size is 12px.

## The brass rule

Brass marks rarity and does nothing else. It is never used for a link, a button, a hover state, a focus ring, a heading, a price or a "live" state. Interactive states use ink and hairlines. If a screen shows brass anywhere except a rarity mark or a rarity-coloured plate rule, it is wrong.

Rarity rises along one ramp: common sits nearest the neutrals and legendary is the brightest brass. It also rises through the glyph: an open diamond, a diamond with a centre, a filled diamond, then a four-point star. Colour alone never carries it.

## Observation status is not rarity

`dedicated` / `eligible` / `not_available` answer whether Node 01 can photograph the card. That question has nothing to do with scarcity: Europa is epic and cannot be observed. The mark uses ink, never brass. Its glyphs are circles, never diamonds: filled, open, and open with a stroke through it. It sits in a hairline outline, dashed for `not_available`. Always show both marks on a plate, side by side.

Node 01 is `commissioning`. No string may imply that it is observing now.

## No decorative glow

No glow, lens flare, starburst, gradient mesh, glass, gradient text or coloured shadow. Light that the object itself emits is fine, and expected: Jupiter and Orion glow in reality. The rule is that every glow must come from the object. Depth comes from hairlines and the ground/plate step, not from shadows. The capsule reveal is the one place for motion, and it uses CSS keyframes only. Respect `prefers-reduced-motion`.

## Card plate anatomy

A card is a plate in a catalogue, one object shot on black, repeated without variation.

```
┌──────────────────────────────┐  --sd-plate, 1px --sd-rule border (rarity colour for epic/legendary)
│                              │
│         [ image ]            │  full width of the plate, object on black
│                              │
├──────────────────────────────┤  <Rule strong />
│ M42                          │  designation — .sd-label
│ Orion Nebula                 │  object name — .sd-name (serif)
│ ◆ EPIC        ○ Eligible     │  <RarityMark> + <ObservationStatusMark>, always both
│ ED 017 / 250 · MAG 4.0 · …   │  <DataRow> in mono, beneath the image
└──────────────────────────────┘
```

Image first, then designation, name, edition number (`017 / 250`, zero-padded, never "mint number"), rarity and observation status. Metadata goes beneath the image in mono, the way a survey captions a detection. An unowned card in `/set/001` is the same plate drawn as an outline (`--sd-ink-4` hairline, no image).

An observation image is shown full width with its real capture data beneath it in a `<Caption>`: node, UTC timestamp, instrument, seeing. That data is the ornament. A third-party image carries its source in the caption, always.

## Primitives (`src/components/sidera/ui/`)

All are server components with no client JavaScript.

| Component | Props | Notes |
| --- | --- | --- |
| `Wordmark` | `size?: 'sm'\|'md'\|'lg'`, `href?`, `asHeading?` | Text-set, serif capitals. No logo file exists yet. |
| `Caption` | `parts?: string[]` or `children`, `source?`, `as?` | Mono line beneath an image, joined with `·`. |
| `DataRow` | `items: {label, value}[]`, `layout?: 'inline'\|'stacked'` | A `<dl>`, so labels pair with values for screen readers. |
| `RarityMark` | `rarity`, `glyphOnly?` | Brass glyph and word. The screen reader hears "Rarity: Epic". |
| `ObservationStatusMark` | `status` | Ink circle and word in a hairline box. |
| `Rule` | `strong?` | 1px hairline `<hr>`. |

The shell itself is `src/components/sidera/SideraShell.tsx`, with `SideraNavLinks` and `SideraAccount` as its only client parts. `SideraAccount` uses the same Privy hooks and `AuthModal` as the legacy nav.

## Layout

Design mobile-first at 360px, with 16px gutters and no horizontal scroll. The content measure is 1040px, centred. Below 640px the top bar drops its links to a second row. Tap targets are at least 36px tall.

## Words

Use: capsule, card, set, observation, Node 01, Collection, holder, edition number. Never write NFT, mint, drop, payload, manifest, registry, airdrop, "verified" (unless plate-solved), exclamation marks or emoji. The copy is English only.
