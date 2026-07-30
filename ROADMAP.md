# WorthIt — Roadmap

This roadmap is organized into milestones. Each milestone is shipped and validated before the next begins.

---

## ✅ Milestone 1 — Project Initialization (Complete)

- [x] Initialize Vite + React + TypeScript project
- [x] Configure @crxjs/vite-plugin
- [x] Configure Manifest V3
- [x] Configure TailwindCSS v4
- [x] Configure ESLint + Prettier
- [x] Configure strict TypeScript
- [x] Verify build passes

---

## ✅ Milestone 2 — Popup UI & Storage (Complete)

- [x] Type-safe chrome.storage.local wrappers
- [x] UserProfile type definition
- [x] Salary tier constants
- [x] Onboarding view with live preview card
- [x] Settings view with stat cards
- [x] Profile persistence and reactive updates

---

## ✅ Milestone 3 — Amazon Parser & Content Script (Complete)

- [x] IParser interface
- [x] AmazonParser (3 strategies, multiple fallbacks)
- [x] ParserRegistry
- [x] PriceScanner (debounced MutationObserver)
- [x] Shadow DOM injector
- [x] Content script orchestrator
- [x] Excluded pages (checkout, payment)

---

## ✅ Milestone 4 — Calculator, Formatter, Tooltip & First-Run (Complete)

- [x] Pure calculation engine
- [x] Number formatting (hours/work-days)
- [x] WorthItLabel component with hover tooltip
- [x] First-run dismissible banner
- [x] Dark mode support
- [x] Accessibility (ARIA, reduced-motion)

---

## ✅ Milestone 5 — Polish, Tests & Chrome Web Store (Complete)

- [x] Unit tests — Calculator (20 tests)
- [x] Unit tests — Storage wrappers (11 tests)
- [x] Unit tests — Parser (AmazonParser + Registry) (15 tests — 11 parser, 4 registry)
- [x] `npm test` — 70/70 passing, 0 failures
- [x] Vitest configured with coverage thresholds (80% lines/functions, 75% branches)
- [x] Chrome Web Store submission guide — `STORE_SUBMISSION.md`
- [x] `scripts/resize-icons.mjs` — tool to generate proper 16/32/48px icons
- [x] ⚠️ Run icon resize script before publishing (`node scripts/resize-icons.mjs`)
- [ ] ⚠️ Capture 4 screenshots for the store listing (see `STORE_SUBMISSION.md`)
- [ ] ⚠️ Submit to Chrome Web Store (user action — see `STORE_SUBMISSION.md`)

---

## ✅ Milestone 6 — Multi-Site Expansion (Complete)

- [x] FlipkartParser — multi-strategy with partial class name matching
- [x] MyntraParser — BEM-style selectors + Rs./₹ price format support
- [x] MeeshoParser — data-testid targeting for styled-components resilience
- [x] manifest.json v1.1.0 — all 3 sites added to `content_scripts`, `host_permissions`, `web_accessible_resources`
- [x] Parser Registry updated with all 4 parsers
- [x] Unit tests for all 3 new parsers (supports() URL matching, registry routing)
- [x] `npm test` — 70/70 passing, 0 failures

---

## 🔮 Future Milestones

### More Sites
- [ ] Ajio parser
- [ ] Nykaa parser
- [ ] Tata CLiQ parser
- [ ] Snapdeal parser

### Features
- [ ] Price history tracking
- [ ] Monthly spending summary
- [ ] "Is it worth it?" goal-setting mode

### UX Enhancements
- [ ] Cart total injection (show total hours for entire cart)
- [ ] Salary tier quick-switch from tooltip
- [ ] Currency detection for non-INR prices

### Advanced Features
- [ ] Monthly budget tracker (optional, local-only)
- [ ] "Worth it?" reflection prompt for expensive items (configurable threshold)
- [ ] Keyboard shortcut to toggle WorthIt labels
