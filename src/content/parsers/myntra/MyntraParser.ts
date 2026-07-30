import type { IParser } from '@/types'
import { MIN_PRICE_INR } from '@/constants'

// ─── Myntra Parser ────────────────────────────────────────────────────────────

/**
 * Parser for Myntra (www.myntra.com).
 *
 * Myntra is a React SPA. Price selectors are relatively stable because
 * Myntra uses BEM-style class names (pdp-price, pdp-mrp) rather than
 * fully obfuscated names.
 *
 * Price extraction order (most to least reliable):
 *   1. .pdp-price strong — the selling price on the PDP
 *   2. .pdp-discountedPrice — alternate PDP price class
 *   3. [class*="product-price"] — search result card price
 *   4. [class*="price"] partial match
 *   5. Raw textContent fallback
 *
 * Note: .pdp-mrp is the crossed-out original price — we deliberately skip it.
 */
export class MyntraParser implements IParser {
  supports(url: string): boolean {
    return /^https?:\/\/(www\.)?myntra\.com\//.test(url)
  }

  findPriceNodes(): Element[] {
    // Strategy 1: Product Detail Page
    const pdpNodes = this.strategy_pdp()
    if (pdpNodes.length > 0) {
      return this.deduplicate(pdpNodes)
    }

    // Strategy 2: Search / category listing pages
    return this.deduplicate(this.strategy_listing())
  }

  extractPrice(element: Element): number | null {
    // ── Method 1: .pdp-price strong (most reliable on Myntra PDP) ──
    // Myntra renders: <span class="pdp-price"><strong>Rs. 899</strong></span>
    const strongEl = element.querySelector('strong')
    if (strongEl?.textContent) {
      const price = this.parseINRString(strongEl.textContent)
      if (price !== null && price >= MIN_PRICE_INR) return price
    }

    // ── Method 2: Direct textContent of the element ──
    const rawText = element.textContent ?? ''
    if (rawText) {
      const price = this.parseINRString(rawText)
      if (price !== null && price >= MIN_PRICE_INR) return price
    }

    return null
  }

  // ─── Strategies ──────────────────────────────────────────────────────────

  private strategy_pdp(): Element[] {
    return this.queryAllFirst([
      // PDP selling price (most stable — BEM class, rarely changes)
      '.pdp-price',
      '.pdp-discountedPrice',
      // Alternate structural selectors
      '[class*="pdp-price"]',
      '[class*="selling-price"]',
      // Data attribute (most stable if present)
      '[data-testid="price"]',
    ])
  }

  private strategy_listing(): Element[] {
    // Myntra search result cards
    const cards = document.querySelectorAll(
      '.product-base, [class*="productCard"], [class*="product-card"]'
    )

    if (cards.length > 0) {
      const results: Element[] = []
      cards.forEach((card) => {
        const priceEl =
          card.querySelector('.product-discountedPrice') ??
          card.querySelector('[class*="discountedPrice"]') ??
          card.querySelector('[class*="price"]')
        if (priceEl) results.push(priceEl)
      })
      if (results.length > 0) return results
    }

    // Flat fallback
    return this.queryAllFirst([
      '.product-discountedPrice',
      '[class*="discountedPrice"]',
      '[class*="product-price"]',
    ])
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  private queryAllFirst(selectors: string[]): Element[] {
    for (const selector of selectors) {
      try {
        const found = [...document.querySelectorAll(selector)]
        if (found.length > 0) return found
      } catch {
        // skip invalid selector
      }
    }
    return []
  }

  private deduplicate(elements: Element[]): Element[] {
    return [...new Set(elements)]
  }

  /**
   * Parses an INR price string into a number.
   * Myntra uses "Rs. 899" and "MRP Rs. 1,299" formats.
   * Handles: ₹12,999 · Rs. 12,999 · Rs 12,999.00 · 12999
   */
  private parseINRString(text: string): number | null {
    // Remove ₹, Rs., Rs, commas, whitespace
    const cleaned = text.replace(/[₹Rs.,\s]/gi, '').trim()
    const match = /^(\d+(?:\.\d{1,2})?)/.exec(cleaned)
    if (!match) return null
    const num = parseFloat(match[1])
    return isNaN(num) ? null : num
  }
}
