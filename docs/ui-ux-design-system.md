# Kuroko — UI/UX Design System

**Last updated:** April 28, 2026

---

## Design Philosophy

**Brutalist trading terminal.** Bloomberg Terminal meets hacker UI.

- Zero border-radius on everything
- No shadows except orange glow on brand accent
- No gradients
- Sharp, dense, information-first layout
- Monospace typography for all labels, numbers, and UI chrome

---

## Color Palette

| Purpose | Value |
|---|---|
| Page background | `#0d0d0d` |
| Panel background | `#111111` |
| Panel hover | `#161616` |
| Primary text | `#f0f0f0` |
| Secondary text | `#a0a0a0` |
| Muted / disabled | `#555555` |
| Tertiary / very dim | `#333333` |
| Brand orange | `#ff4500` |
| Orange dim bg | `rgba(255, 69, 0, 0.15)` |
| Orange glow | `rgba(255, 69, 0, 0.5)` |
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
  color: var(--orange);
}

.orange-glow {
  color: var(--orange);
  text-shadow: 0 0 8px rgba(255, 69, 0, 0.5);
}
```

---

## Panel System

Every major panel uses `.panel-bracket` — a 3px orange left accent bar.

```css
.panel-bracket {
  position: relative;
  background-color: var(--panel);
  border: 1px solid var(--border);
  border-radius: 0;
}
.panel-bracket::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 3px; height: 100%;
  background: var(--orange);
}
```

Usage:
```tsx
<div className="border panel-bracket"
  style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
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
style={{ backgroundColor: '#ff4500', color: '#000', borderRadius: 0 }}
className="font-terminal text-xs font-bold uppercase tracking-widest"
```

Secondary / Ghost:
```tsx
style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.15)', color: '#a0a0a0', borderRadius: 0 }}
className="border font-terminal text-xs uppercase tracking-widest"
```

---

## Navigation

TopNav height: `h-12`
Background: `#0d0d0d`
Bottom border: `rgba(255,255,255,0.08)`
Max width: `1400px` centered

Nav links: mono, 11px, tracking-widest, uppercase
- Inactive: `#555`, hover `#a0a0a0`
- Active: `#ff4500` with 2px solid orange bottom bar

Right status bar:
- Live dot: orange `#ff4500` with `box-shadow: 0 0 6px rgba(255,69,0,0.6)` when live
- Wallet address: `#4ade80` green mono when connected

---

## Layout Rules

- Max content width: `1400px`, `mx-auto`, `px-4`
- Desktop grid: `grid-cols-12`, `gap-5`
- All spacing between panels: `space-y-5` or `gap-5`
- Page padding: `py-6`
- Never use `border-radius` > 0 anywhere
- Never use box shadows except `orange-glow`
- Never use gradients

---

## What Agents Must Never Do

- Add `border-radius` to any element
- Use colors outside the palette above
- Use `font-size` larger than `text-2xl` for UI chrome
- Use Tailwind's default color classes (`blue-500`, `gray-300`, etc.) — always use inline styles
- Remove the `panel-bracket` left orange bar from panels
- Change the nav link style (font, size, color, active indicator)
- Change the TopNav height from `h-12`
- Add rounded corners to buttons, inputs, or dropdowns
- Change `#ff4500` to any other orange shade

---

## Responsive Layout

Desktop: Multi-column grids (3–4 columns depending on page)
Mobile: Tab-based navigation with swipe support

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
