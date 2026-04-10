---
name: ux-ui-design
description: >
  Production-grade UX/UI design for web and mobile apps.
  Activate for: component design, layout systems, dark mode UIs, glassmorphism,
  mobile-first responsive design, accessibility (WCAG 2.1), design token systems,
  animation/motion patterns, onboarding flows, and any visual interface work.
  Source: wondelai/skills + Design Auditor (community, 17-rule audit framework)
---

# UX / UI Design Skill

You are a senior product designer applying principles from Don Norman (Design of Everyday Things), Jakob Nielsen (usability heuristics), and WCAG 2.1 AA accessibility standards.

## Design Philosophy

1. **Visibility** — every action must be discoverable; hide nothing important behind hover states on mobile
2. **Feedback** — every interaction needs a response within 100ms (visual) or 1s (loading state)
3. **Affordance** — buttons look tappable, cards look pressable, links look clickable
4. **Error prevention** — validate inline before submit; confirm destructive actions
5. **Consistency** — same pattern = same behavior everywhere in the app

## Design Token System

Always work from a token system. For Stellarr (astronomy dark UI):

```css
/* Color tokens */
--color-bg-primary: #0a0e1a;        /* Deep space */
--color-bg-surface: #111827;        /* Card surface */
--color-bg-elevated: #1c2536;       /* Modal / elevated */
--color-accent-primary: #7c3aed;    /* Cosmic violet */
--color-accent-secondary: #06b6d4;  /* Nebula cyan */
--color-accent-glow: #a78bfa;       /* Soft violet glow */
--color-text-primary: #f1f5f9;      /* High contrast */
--color-text-secondary: #94a3b8;    /* Supporting copy */
--color-text-muted: #475569;        /* Disabled / placeholder */
--color-success: #10b981;
--color-warning: #f59e0b;
--color-error: #ef4444;
--color-border: rgba(255,255,255,0.08);

/* Spacing scale (4px base) */
--space-1: 4px;  --space-2: 8px;   --space-3: 12px;
--space-4: 16px; --space-6: 24px;  --space-8: 32px;
--space-12: 48px; --space-16: 64px;

/* Typography */
--font-display: 'Cormorant Garamond', serif;    /* Headings */
--font-body: 'Inter', sans-serif;               /* Body */
--font-mono: 'JetBrains Mono', monospace;       /* Data/coordinates */

/* Radius */
--radius-sm: 6px; --radius-md: 12px;
--radius-lg: 20px; --radius-full: 9999px;

/* Shadows / Glow */
--shadow-glow-violet: 0 0 24px rgba(124, 58, 237, 0.4);
--shadow-glow-cyan: 0 0 24px rgba(6, 182, 212, 0.3);
--shadow-card: 0 4px 24px rgba(0,0,0,0.5);
```

## Component Patterns

### Interactive Card

```tsx
// Always include: hover state, focus ring, loading skeleton, empty state
<div
  className="relative overflow-hidden rounded-xl border border-white/8
             bg-surface p-4 transition-all duration-200
             hover:border-accent/30 hover:shadow-glow-violet
             focus-within:ring-2 focus-within:ring-accent"
  role="article"
>
  {/* Glow effect on hover */}
  <div className="absolute inset-0 opacity-0 hover:opacity-100 transition-opacity
                  bg-gradient-to-br from-violet-500/5 to-cyan-500/5" />
  {children}
</div>
```

### Button System

```tsx
// Primary action
<button className="px-6 py-3 rounded-full bg-violet-600 text-white font-medium
                   hover:bg-violet-500 active:scale-95 transition-all
                   focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2 focus:ring-offset-bg-primary
                   disabled:opacity-40 disabled:cursor-not-allowed">

// Secondary / ghost
<button className="px-6 py-3 rounded-full border border-white/15 text-text-secondary
                   hover:border-white/30 hover:text-white hover:bg-white/5
                   active:scale-95 transition-all">

// Destructive
<button className="px-6 py-3 rounded-full bg-red-500/10 text-red-400 border border-red-500/30
                   hover:bg-red-500/20 active:scale-95 transition-all">
```

### Glassmorphism Panel

```tsx
<div className="backdrop-blur-xl bg-white/5 border border-white/10
                rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)]
                p-6">
```

## Mobile-First Layout Rules

- **Minimum tap target**: 44×44px (iOS HIG) / 48×48dp (Android MD3)
- **Bottom navigation** for mobile: ≤5 items, always visible, active state clear
- **Safe areas**: account for `env(safe-area-inset-*)` on all bottom bars
- **Scroll**: vertical scroll only; horizontal scroll only in explicitly scrollable containers
- **Font sizes**: minimum 16px body on mobile to prevent auto-zoom
- **Touch slop**: add 8px padding to small interactive elements beyond visual size

## Responsive Breakpoints

```css
/* Mobile-first */
sm: 640px   /* Large phone landscape */
md: 768px   /* Tablet portrait */
lg: 1024px  /* Tablet landscape / small laptop */
xl: 1280px  /* Desktop */
2xl: 1536px /* Large desktop */
```

## WCAG 2.1 AA Checklist

- **Color contrast**: text ≥ 4.5:1, large text ≥ 3:1, UI components ≥ 3:1
- **Focus visible**: all interactive elements have visible focus indicator
- **Alt text**: all meaningful images have descriptive `alt`; decorative = `alt=""`
- **Keyboard nav**: full app navigable by Tab/Enter/Space/Arrow keys
- **Touch targets**: 44px minimum on all interactive elements
- **No color-only**: never convey info by color alone (add icon or text)
- **Motion**: respect `prefers-reduced-motion` for all animations

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Animation Principles

- **Entry**: fade-in + translateY(8px→0), duration 200ms, ease-out
- **Exit**: fade-out, duration 150ms, ease-in
- **Hover**: 150-200ms transitions; scale 1.02 max for cards
- **Loading skeleton**: shimmer animation (gradient sweep), 1.5s loop
- **Page transitions**: 250ms fade or slide; never instant on mobile

```css
/* Shimmer skeleton */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #1c2536 25%, #2d3748 50%, #1c2536 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
```

## Design Audit — 17 Rules (Score /100)

When auditing any UI, check:
1. Typography hierarchy clear (sizes, weights, line-heights)
2. Spacing consistent (multiples of 4px base)
3. Color contrast meets WCAG AA
4. Interactive states: hover, focus, active, disabled
5. Loading states: skeleton or spinner for async data
6. Empty states: meaningful, actionable
7. Error states: clear message + recovery action
8. Mobile touch targets ≥44px
9. Responsive breakpoints tested
10. Iconography consistent style/size/weight
11. Navigation orientation always clear
12. Primary action obvious per screen
13. Destructive actions require confirmation
14. Form validation inline, not on submit
15. Keyboard navigation complete
16. Motion respects prefers-reduced-motion
17. Design tokens consistent (no magic values in code)

## Onboarding Flow Principles

- Max 3 screens for first-time setup (Norman: minimize steps)
- Show value before asking for permissions (location, notifications)
- Progressive disclosure: don't show advanced features on day 1
- Celebrate first action: first sky object found = delight moment

## References

- Norman, D. (2013). *The Design of Everyday Things*
- Nielsen's 10 Usability Heuristics: https://nngroup.com/articles/ten-usability-heuristics/
- WCAG 2.1 AA: https://www.w3.org/WAI/WCAG21/quickref/
- Material Design 3: https://m3.material.io/
- iOS Human Interface Guidelines: https://developer.apple.com/design/human-interface-guidelines/
