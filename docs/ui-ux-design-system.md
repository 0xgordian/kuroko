# Kuroko — UI/UX Design System

**Last updated:** May 18, 2026

---

## Design Philosophy

**Arc-aware trading terminal.** Dense, high-contrast, information-first UI with enough polish for wallet-driven execution.

- Restrained radius on cards and controls, generally `8px` or `12px`
- No decorative gradients or background blobs
- No gradients
- Sharp, dense, information-first layout
- Monospace typography for all labels, numbers, and UI chrome

---

## Color Palette

| Purpose | Value |
|---|---|
| Page background | `#09090b` |
| Panel background | `#111111` |
| Panel hover | `#1a1a1a` |
| Primary text | `#f0f0f0` |
| Secondary text | `#a0a0a0` |
| Muted / disabled | `#555555` |
| Tertiary / very dim | `#333333` |
| Brand purple | `#7c3aed` |
| Purple hover | `#8b5cf6` |
| Purple light | `#a78bfa` |
| Purple dim bg | `rgba(124, 58, 237, 0.12)` |
| Arc blue | `#3b82f6` |
| Default border | `rgba(255, 255, 255, 0.08)` |
| Hover border | `rgba(255, 255, 255, 0.15)` |
| Active border | `rgba(255, 255, 255, 0.20)` |
| Positive / YES | `#4ade80` |
| Negative / NO | `#f87171` |
| Warning | `#f59e0b` |
| Separator dim | `rgba(255, 255, 255, 0.06)` |

---

## Typography

**Body:** Geist Sans — `var(--font-geist-sans)`
**Terminal/Mono:** Geist Mono — `var(--font-geist-mono)`

Rules:
- All labels, nav links, stats, badges, numbers, section headers → mono font
- Body copy, market questions, descriptions → sans font
- Labels are always 10–11px, tracking-widest, uppercase, mono
- Never use font-size larger than text-2xl for terminal numbers

CSS classes defined in `globals.css`:

```css
.font-terminal {
  font-family: var(--font-mono);
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.t-label {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--text-tertiary);
}

.t-label-accent {
  color: var(--brand-light);
}

.orange-glow {
  color: var(--brand-light);
  text-shadow: 0 0 16px var(--brand-glow);
}
```

---

## Panel System

Every major panel uses `.panel-bracket` for the standard dark surface, border, hover transition, and clipping.

```css
.panel-bracket {
  background-color: var(--surface-2);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
}
```

Usage:
```tsx
<div className="border panel-bracket"
  style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 12 }}>
```

Panel hover state:
```tsx
onMouseEnter={(e) => {
  e.currentTarget.style.backgroundColor = '#161616';
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
}}
onMouseLeave={(e) => {
  e.currentTarget.style.backgroundColor = '#111';
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)';
}}
```

---

## Buttons

Primary CTA:
```tsx
style={{ backgroundColor: '#7c3aed', color: '#fff', borderRadius: 12 }}
className="font-terminal text-xs font-bold uppercase tracking-widest"
```

Secondary / Ghost:
```tsx
style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.15)', color: '#a0a0a0', borderRadius: 12 }}
className="border font-terminal text-xs uppercase tracking-widest"
```

---

## Navigation

TopNav height: `h-12`
Background: `#09090b`
Bottom border: `rgba(255,255,255,0.08)`
Max width: `1400px` centered

Nav links: mono, 11px, tracking-widest, uppercase
- Inactive: `#555`, hover `#a0a0a0`
- Active: `#f0f0f0` on a subtle dark pill
- Arc mode: show official Arc logo badge with blue accent when chain ID is `5042002`

Right status bar:
- Live dot: green `#4ade80` when live
- Wallet address: `#4ade80` green mono when connected
- Desktop nav starts at `lg`; smaller widths use hamburger/mobile nav to avoid collisions

---

## Layout Rules

- Max content width: `1400px`, `mx-auto`, `px-4`
- Desktop grid: `grid-cols-12`, `gap-5`
- All spacing between panels: `space-y-5` or `gap-5`
- Page padding: `py-6`
- Cards and buttons should stay at `8px` or `12px` radius
- Never use decorative box shadows except intentional focus/glow states
- Never use gradients

---

## What Agents Must Never Do

- Use colors outside the palette above
- Use `font-size` larger than `text-2xl` for UI chrome
- Use Tailwind's default color classes (`blue-500`, `gray-300`, etc.) — always use inline styles
- Create nav layouts where links can collide with wallet/status controls
- Change the TopNav height from `h-12`
- Render raw trade-card JSON above the interactive card

---

## Responsive Layout

Desktop: Multi-column grids (3–4 columns depending on page)
Mobile: Tab-based navigation with swipe support

Network behavior:
- Polygon and Arc should be visually obvious in the nav and control bar
- Arc execution states should distinguish `ready_on_arc` from simulation-only markets
- Disabled real-tx states need clear text, not silent grey buttons

Portfolio mobile tabs: Portfolio / Chart / Alerts / Guards / History
Trade mobile tabs: Markets / Trending / Analysis / AI

---

## Accessibility

- High contrast: `#f0f0f0` on `#0d0d0d` = 15.9:1 ratio
- Focus states on all interactive elements
- ARIA labels on icon-only buttons
- Error boundaries on all data panels
- Empty states for all zero-data scenarios
- Skeleton loading states (no content jump)
