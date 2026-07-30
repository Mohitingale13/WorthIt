import type { IParser } from '@/types'
import { MIN_PRICE_INR } from '@/constants'

// ─── Meesho Parser ────────────────────────────────────────────────────────────

/**
 * Parser for Meesho (meesho.com).
 *
 * Meesho is a Next.js/React app. It uses styled-components with
 * hashed class names (e.g. sc-bdXHLW). We use a multi-strategy approach
 * targeting stable attributes and semantic class fragments.
 *
 * Price extraction order (most to least reliable):
 *   1. [data-testid*="price"] / [data-testid*="selling"] — stable data attrs
 *   2. h5 inside the product detail container — Meesho uses h5 for selling price
 *   3. [class*="price"] partial match
 *   4. Raw textContent fallback
 *
 * Note: Meesho shows crossed-out MRP separately — we target only the selling price.
 */
export class MeeshoParser implements IParser {
  supports(url: string): boolean {
    return /^https?:\/\/(www\.)?meesho\.com\//.test(url)
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
    // ── Method 1: data-testid attribute ──
    const testIdEl =
      element.querySelector('[data-testid*="price"]') ??
      element.querySelector('[data-testid*="selling"]')
    if (testIdEl?.textContent) {
      const price = this.parseINRString(testIdEl.textContent)
      if (price !== null && price >= MIN_PRICE_INR) return price
    }

    // ── Method 2: h5 tag (Meesho PDP uses h5 for the price) ──
    const h5 = element.querySelector('h5')
    if (h5?.textContent) {
      const price = this.parseINRString(h5.textContent)
      if (price !== null && price >= MIN_PRICE_INR) return price
    }

    // ── Method 3: Direct textContent of the element ──
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
      // Data attributes (most stable — survives CSS class changes)
      '[data-testid="selling-price"]',
      '[data-testid="product-price"]',
      '[data-testid*="price"]',
      // Meesho PDP uses h5 for the primary price
      '.pdp-price h5',
      '[class*="pdp-price"]',
      // styled-components partial class match
      '[class*="sellingPrice"]',
      '[class*="SellingPrice"]',
      '[class*="selling-price"]',
    ])
  }

  private strategy_listing(): Element[] {
    // Meesho product cards
    const cards = document.querySelectorAll(
      '[class*="ProductCard"], [class*="product-card"], [data-testid*="product"]'
    )

    if (cards.length > 0) {
      const results: Element[] = []
      cards.forEach((card) => {
        const priceEl =
          card.querySelector('[data-testid*="price"]') ??
          card.querySelector('h5') ??
          card.querySelector('[class*="price"]')
        if (priceEl) results.push(priceEl)
      })
      if (results.length > 0) return results
    }

    // Flat fallback
    return this.queryAllFirst([
      '[data-testid*="price"]',
      '[class*="sellingPrice"]',
      '[class*="selling-price"]',
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
   * Meesho uses "₹899" and "Rs 899" formats.
   * Handles: ₹12,999 · Rs 12,999 · 12999
   */
  private parseINRString(text: string): number | null {
    const cleaned = text.replace(/[₹Rs.,\s]/gi, '').trim()
    const match = /^(\d+(?:\.\d{1,2})?)/.exec(cleaned)
    if (!match) return null
    const num = parseFloat(match[1])
    return isNaN(num) ? null : num
  }
}
