---
inclusion: always
---

# Kuroko — UI Design System

This is the canonical design system for Kuroko. Every agent, every task, every code change MUST follow these rules exactly. Do not deviate from this system under any circumstances.

---

## Core Aesthetic

**Brutalist terminal dashboard.** Think Bloomberg terminal meets hacker UI.

- Zero border-radius on EVERYTHING — `border-radius: 0` always
- No shadows except the orange glow on the brand accent
- No gradients
- No rounded corners
- Sharp, dense, information-first layout

---

## Color Palette

These are the ONLY colors used in this codebase. Do not introduce new colors.

| Purpose | Value |
|---|---|
| Page background | `#0d0d0d` |
| Panel background | `#111111` |
| Panel hover | `#161616` |
| Primary text | `#f0f0f0` |
| Secondary text | `#a0a0a0` |
| Muted / disabled text | `#555555` |
| Tertiary / very dim | `#333333` |
| Brand orange | `#ff4500` |
| Orange dim bg | `rgba(255, 69, 0, 0.15)` |
| Orange glow shadow | `rgba(255, 69, 0, 0.5)` |
| Default border | `rgba(255, 255, 255, 0.08)` |
| Hover border | `rgba(255, 255, 255, 0.15)` |
| Active border | `rgba(255, 255, 255, 0.20)` |
| Positive / YES | `#4ade80` |
| Negative / NO | `#f87171` |
| Warning / fallback | `#f59e0b` |
| Separator dim | `rgba(255, 255, 255, 0.06)` |

CSS variables defined in `globals.css`:
```css
--background: #0d0d0d
--foreground: #ededed
--orange: #ff4500
--orange-dim: rgba(255, 69, 0, 0.15)
--border: rgba(255, 255, 255, 0.08)
--panel: #111111
--text-primary: #ededed
--text-secondary: #999999
--text-tertiary: #666666
```

---

## Typography

### Fonts
- **Body**: Geist Sans — `var(--font-geist-sans)` — loaded via `GeistSans` from `geist/font/sans`
- **Terminal/Mono**: Geist Mono — `var(--font-geist-mono)` — loaded via `GeistMono` from `geist/font/mono`

### Rules
- ALL labels, nav links, stats, badges, numbers, section headers → use mono font
- Body copy, market questions, descriptions → use sans font
- Labels are ALWAYS: `10–11px`, `tracking-widest`, `uppercase`, mono
- Never use `font-size` larger than `text-2xl` for terminal numbers
- Never use `font-weight` lighter than `font-bold` for terminal labels

### CSS Classes (defined in globals.css — do not remove or change)
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
  color: var(--text-tertiary); /* #666 */
}

.t-label-accent {
  color: var(--orange); /* #ff4500 */
}

.orange-glow {
  color: var(--orange);
  text-shadow: 0 0 8px rgba(255, 69, 0, 0.5);
}
```

---

## Panel System

### `.panel-bracket` (signature component style)
Every major panel/card uses this class. It adds a 3px orange left accent bar.

```css
.panel-bracket {
  position: relative;
  background-color: var(--panel); /* #111 */
  border: 1px solid var(--border); /* rgba(255,255,255,0.08) */
  border-radius: 0;
}
.panel-bracket::before {
  content: '';
  position: absolute;
  top: 0; left: 0;
  width: 3px; height: 100%;
  background: var(--orange); /* #ff4500 */
}
```

Usage pattern:
```tsx
<div className="border panel-bracket"
  style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
```

### Panel hover state
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

### Primary CTA
```tsx
style={{ backgroundColor: '#ff4500', color: '#000', borderRadius: 0 }}
className="font-terminal text-xs font-bold uppercase tracking-widest"
```

### Secondary / Ghost
```tsx
style={{ backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.15)', color: '#a0a0a0', borderRadius: 0 }}
className="border font-terminal text-xs uppercase tracking-widest"
```

### Hover for secondary
```tsx
onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.30)'; e.currentTarget.style.color = '#f0f0f0'; }}
onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.color = '#a0a0a0'; }}
```

---

## Navigation (TopNav)

- Height: `h-12`
- Background: `#0d0d0d`
- Bottom border: `rgba(255,255,255,0.08)`
- Max width: `1400px` centered

### Logo
- Small `PA` box: `w-5 h-5`, orange border, `rgba(255,69,0,0.1)` bg, orange mono `9px` text
- Full name: `POLYMARKET` in `#f0f0f0`, `ALPHA` in `#ff4500` — both mono uppercase

### Nav Links
- Font: mono, `11px`, `tracking-widest`, uppercase
- Inactive: `#555`, hover `#a0a0a0`
- Active: `#ff4500` with `2px` solid orange bottom bar

### Right Status Bar
- Live dot: `1.5px` circle, orange `#ff4500` with `box-shadow: 0 0 6px rgba(255,69,0,0.6)` when live
- "LIVE" label: orange mono `10px`
- Pipe separator: `#2a2a2a`
- "PAPER MODE" label: `#444` mono
- Wallet address: `#4ade80` green mono when connected

---

## AI Page (Thread / Chat)

### Welcome Screen
- "KUROKO" label: orange mono `10px` tracking-widest
- Heading "AI Market Intelligence": `font-terminal text-2xl font-bold`, color `#f0f0f0`
- Subtitle: `text-sm`, color `#777`
- Suggestion cards: 2×2 grid, `panel-bracket` style, title `#f0f0f0 text-xs font-semibold`, label `#555 text-xs`
- Suggestion card hover: border shifts to `rgba(255,69,0,0.35)`, bg to `#161616`

### Messages
- Assistant: left `2px` orange accent line at `rgba(255,69,0,0.25)`, text `#e0e0e0`, `text-sm leading-relaxed`
- User: right-aligned bubble, `#161616` bg, `rgba(255,255,255,0.1)` border, `#f0f0f0` text

### Composer
- Sticky bottom, `#0d0d0d` outer bg
- Input box: `#111` bg, `rgba(255,255,255,0.12)` border, `border-radius: 0`
- Focus: border shifts to `rgba(255,69,0,0.5)`
- Send button: solid `#ff4500` square, `#000` icon, `border-radius: 0`
- Quick action buttons (Set Alert, Copy Link, Refresh): mono `text-xs`, transparent bg, `rgba(255,255,255,0.08)` border

### Typing Indicator
- 3 orange bouncing dots + "THINKING" in mono `10px` `#555`

---

## Trade Card (BetSimulation / TradeRecord)

This is the card shown in the screenshot — the paper trade receipt style.

### Structure
```
KUROKO          [PAPER TRADE]
TRADE RECORD

| Market question here (left orange border bar)

SIDE          SHARES
YES           92

ENTRY PRICE   COST
44¢           $40.48

┌─────────────────────────────────────┐
│ IF CORRECT              RETURN      │
│ $92.00                  +127%       │
└─────────────────────────────────────┘

27 Apr 2026, 12:27        kuroko
```

### Styling rules
- Background: `#111` or `#0d0d0d`
- All labels (`SIDE`, `SHARES`, `ENTRY PRICE`, `COST`, `IF CORRECT`, `RETURN`): mono uppercase `#555` or `#666`
- `YES` value: `#4ade80` (green), `NO` value: `#f87171` (red)
- Numbers: mono bold white `#f0f0f0`
- "IF CORRECT" payout: `#ff4500` orange, large mono bold
- "RETURN" percentage: `#4ade80` green, large mono bold
- Bottom highlight box: bordered `rgba(255,255,255,0.08)`, contains payout + return
- "PAPER TRADE" badge: orange border `#ff4500`, orange text, mono uppercase
- Footer: timestamp + "kuroko" in mono `#555`
- Left border accent on market question block: `3px solid #ff4500`

---

## Layout Rules

- Max content width: `1400px`, `mx-auto`, `px-4`
- Desktop grid: `grid-cols-12`, `gap-5`
- All spacing between panels: `space-y-5` or `gap-5`
- Page padding: `py-6`
- NEVER use `border-radius` > 0 anywhere
- NEVER use box shadows except `orange-glow`
- NEVER use gradients

---

## Skeleton / Loading States

```tsx
<div className="animate-pulse border"
  style={{ backgroundColor: '#111', borderColor: 'rgba(255,255,255,0.08)', borderRadius: 0 }}>
  <div className="h-3" style={{ backgroundColor: '#161616' }} />
</div>
```

---

## Scrollbar

```css
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: rgba(255,255,255,0.02); }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
```

---

## What Agents Must NEVER Do

- Add `border-radius` to any element
- Use colors outside the palette above
- Use `font-size` larger than `text-2xl` for UI chrome
- Use `font-weight` lighter than `font-medium` for labels
- Add gradients or box shadows (except orange-glow)
- Change `#ff4500` to any other orange shade
- Use Tailwind's default color classes (`blue-500`, `gray-300`, etc.) — always use inline styles with the palette values
- Remove the `panel-bracket` left orange bar from panels
- Change the nav link style (font, size, color, active indicator)
- Change the TopNav height from `h-12`
- Add rounded corners to buttons, inputs, or dropdowns
