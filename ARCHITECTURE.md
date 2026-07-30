# WorthIt — Architecture

This document describes the architectural decisions behind WorthIt.

---

## Design Philosophy

Every architectural decision in WorthIt is guided by these principles:

1. **Never break the host page** — The extension must fail silently on any error
2. **Zero style pollution** — Shadow DOM ensures complete CSS isolation
3. **Privacy by design** — No external requests, ever
4. **Single responsibility** — Each module does one thing well
5. **Scalability** — Adding new shopping sites requires minimal code

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Chrome Extension                          │
│                                                                  │
│  ┌──────────────┐   ┌──────────────────────────────────────┐   │
│  │   Popup UI   │   │           Content Script              │   │
│  │              │   │                                        │   │
│  │  Onboarding  │   │  ParserRegistry                       │   │
│  │  Settings    │   │       └── AmazonParser                │   │
│  │  Live Preview│   │                 ↓                     │   │
│  └──────┬───────┘   │  PriceScanner (MutationObserver)      │   │
│         │           │       └── debounced scan               │   │
│  chrome.storage.local│               ↓                      │   │
│         │           │  ShadowInjector                        │   │
│         └──────────►│       └── React root per price         │   │
│                     │            └── WorthItLabel            │   │
│  ┌──────────────┐   │            └── Tooltip                 │   │
│  │  Background  │   │                                        │   │
│  │ Service Worker│  │  FirstRunBanner (page overlay)         │   │
│  │  (Minimal)   │   └──────────────────────────────────────┘   │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

---

## Content Script Architecture

### Parser System

The parser system uses a **Strategy pattern**:

```typescript
interface IParser {
  supports(url: string): boolean
  findPriceNodes(): Element[]
  extractPrice(element: Element): number | null
}
```

Each website implements this interface. The **ParserRegistry** (`src/content/parsers/index.ts`) maps URLs to parsers.

**Adding a new website:**
1. Create `src/content/parsers/myntra/MyntraParser.ts`
2. Implement `IParser`
3. Register in `src/content/parsers/index.ts`

No other files need to change.

### Scanner (MutationObserver)

`PriceScanner` wraps a `MutationObserver` with:

- **Targeted observation** — Observes `document.body` with `subtree: true` but filters to meaningful changes
- **Debouncing** — 150ms debounce prevents rapid re-scanning during SPA navigation
- **Self-exclusion** — Ignores mutations caused by WorthIt's own injections (prevents infinite loops)
- **Idempotency** — `data-worthit-processed` attribute ensures each price element is handled exactly once

### Shadow DOM Injection

Each price injection creates an isolated Shadow DOM:

```
<div data-worthit-host="true">          ← wrapper (display:block)
  #shadow-root (open)
    <style>...</style>                   ← scoped CSS (content.css)
    <div>                               ← React mount point
      <WorthItLabel />
    </div>
</div>
```

**Why Shadow DOM?**
- Host page CSS cannot leak in (Amazon has complex global styles)
- WorthIt CSS cannot leak out
- React renders independently — no conflict with the page's React

### CSS Injection Strategy

CSS for content scripts is imported as a string using Vite's `?inline` suffix:

```typescript
import contentCss from '@/styles/content.css?inline'
```

This string is then injected as a `<style>` tag inside each Shadow root. TailwindCSS is processed by the Vite build pipeline before inlining.

---

## Popup Architecture

The popup is a standard React SPA with two views:

- **Onboarding** — Shown on first launch. Salary tier selector, custom input, live preview
- **Settings** — Shown on subsequent launches. Stat cards, tier selector, save button

State flows:
```
chrome.storage.local → getUserProfile() → useState → UI
UI interactions → setUserProfile() → chrome.storage.local
```

Profile changes in popup propagate to content scripts via `chrome.storage.local.onChanged`.

---

## Calculation Engine

All calculations in `src/core/calculator.ts` are **pure functions** (no side effects, no I/O).

```
Annual Salary (INR)
  ÷ 12
= Monthly Salary
  ÷ (Working Days × Working Hours per day)
= Hourly Rate

Product Price (INR)
  ÷ Hourly Rate
= Hours of Work

If hours > 8:
  Hours ÷ 8 = Work Days
```

---

## Data Flow

```
User sets salary in popup
         ↓
chrome.storage.local.set()
         ↓
onProfileChange() listener fires in content script
         ↓
refreshAllLabels() removes and re-renders all labels
         ↓
calculate() runs with new profile
         ↓
WorthItLabel re-renders with updated time
```

---

## Privacy Architecture

- **Zero network requests** — No `fetch`, no `XMLHttpRequest`, no WebSocket
- **No permissions beyond `storage`** — Minimal permission surface
- **Host permissions scoped** — Only Amazon India URLs
- **No logging** — Only `console.warn/error` allowed (ESLint enforced)
- **No fingerprinting** — We never read browsing history, cookies, or any identifying data

---

## Performance Decisions

| Decision | Why |
|---|---|
| Debounce at 150ms | Amazon's React-based SPA fires many mutations on navigation |
| `data-worthit-processed` attribute | O(1) duplicate detection using DOM as state |
| Skip excluded pages immediately | Avoid any processing overhead on checkout/payment pages |
| One React root per price element | React roots are cheap; easier than coordinating a single root across distributed DOM locations |
| Shadow DOM open mode | Allows DevTools inspection during development |
