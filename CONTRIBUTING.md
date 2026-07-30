# Contributing to WorthIt

Thank you for your interest in contributing to WorthIt!

---

## Ground Rules

1. **Never break the host page** — All injection code must fail silently
2. **Privacy first** — Never add any external requests, analytics, or tracking
3. **No new dependencies without discussion** — Keep the bundle lean
4. **Follow the architecture** — See [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## Development Setup

```bash
git clone https://github.com/your-username/worthit.git
cd worthit
npm install
npm run build:watch
```

Load `dist/` as an unpacked extension in Chrome.

---

## Adding a New Website Parser

This is the most common contribution. Here's how:

1. **Create the parser file**
   ```
   src/content/parsers/<site>/<Site>Parser.ts
   ```

2. **Implement the `IParser` interface**
   ```typescript
   import type { IParser } from '@/types'

   export class MyntraParser implements IParser {
     supports(url: string): boolean {
       return /myntra\.com/.test(url)
     }

     findPriceNodes(): Element[] {
       // Multiple fallback selectors
       return [...document.querySelectorAll('.product-discountedPrice')]
     }

     extractPrice(element: Element): number | null {
       const text = element.textContent ?? ''
       const match = /[\d,]+/.exec(text.replace(/[₹\s]/g, ''))
       if (!match) return null
       return parseInt(match[0].replace(/,/g, ''), 10) || null
     }
   }
   ```

3. **Register in the parser registry**
   ```typescript
   // src/content/parsers/index.ts
   import { MyntraParser } from './myntra/MyntraParser'

   const PARSERS: readonly IParser[] = [
     new AmazonParser(),
     new MyntraParser(), // ← add here
   ]
   ```

4. **Add host permissions to `manifest.json`**
   ```json
   "content_scripts": [
     {
       "matches": ["https://www.myntra.com/*"],
       ...
     }
   ],
   "host_permissions": [
     "https://www.myntra.com/*"
   ]
   ```

5. **Test manually** — Load the extension, visit a product page, verify the label appears

---

## Code Style

- Run `npm run format` before committing
- Run `npm run lint` to check for issues
- TypeScript strict mode is enforced — no `any`
- No `console.log` — use `console.warn`/`console.error` only

---

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR
- Include manual testing steps in the PR description
- Describe which websites/pages you tested on
