import type { IParser } from '@/types'
import { MIN_PRICE_INR } from '@/constants'

// ─── Meesho Parser ────────────────────────────────────────────────────────────

/**
 * Parser for Meesho (meesho.com).
 *
 * Meesho uses styled-components with hashed class names (e.g. sc-dOfePm).
 * Verified via live DOM inspection (July 2026):
 *
 *   Listing page selling price:  H5 class="sc-dOfePm jSZBdj"  → ₹435
 *   PDP main selling price:      H4 class="sc-dOfePm haKcEH"  → ₹642   ← key discovery
 *   PDP MRP (crossed-out):       P  class="...StrikeThroughStyled..." → ₹2499  ← SKIP
 *   PDP related product prices:  H5 class="sc-dOfePm jSZBdj"  → multiple ← skip on PDP
 *
 * KEY INSIGHT:
 *   - Listing page  → H5 elements are the prices (one per card) ✅
 *   - PDP           → H4 element is the MAIN price; H5 elements are recommendations ❌
 *
 * Strategy order:
 *   1. H4 with ₹ (PDP selling price) — try this first; if found, we're on a PDP
 *   2. data-testid attributes (most stable, works if Meesho adds them)
 *   3. H5 with ₹ (listing page selling price)
 *
 * Filters always applied:
 *   - Must contain ₹ symbol
 *   - Skip elements whose className contains "StrikeThrough" (MRP)
 *   - Skip elements whose computed style has text-decoration: line-through
 */
export class MeeshoParser implements IParser {
  supports(url: string): boolean {
    return /^https?:\/\/(www\.)?meesho\.com\//.test(url)
  }

  findPriceNodes(): Element[] {
    // Strategy 1: PDP — H4 is the main selling price on product detail pages
    const h4Nodes = this.findRupeeElements('h4')
    if (h4Nodes.length > 0) {
      // Found H4 with ₹ — we're on a PDP, return only H4 prices
      return this.deduplicate(h4Nodes)
    }

    // Strategy 2: data-testid attributes (most stable if Meesho adds them)
    const testIdNodes = this.queryFiltered([
      '[data-testid="selling-price"]',
      '[data-testid="product-price"]',
      '[data-testid*="price"]',
    ])
    if (testIdNodes.length > 0) return this.deduplicate(testIdNodes)

    // Strategy 3: Listing page — H5 elements are the selling prices per card
    const h5Nodes = this.findRupeeElements('h5')
    if (h5Nodes.length > 0) return this.deduplicate(h5Nodes)

    // Strategy 4: Partial class name match fallbacks
    return this.deduplicate(this.queryFiltered([
      '[class*="sellingPrice"]',
      '[class*="SellingPrice"]',
      '[class*="selling-price"]',
      '[class*="pdp-price"]',
    ]))
  }

  extractPrice(element: Element): number | null {
    const rawText = element.textContent?.trim() ?? ''

    // Must contain ₹ — prevents percentages, ratings etc. from being parsed
    if (!rawText.includes('₹')) return null

    // Skip MRP/crossed-out prices (class name contains StrikeThrough)
    if (this.isStrikeThrough(element)) return null

    const price = this.parseINRString(rawText)
    if (price !== null && price >= MIN_PRICE_INR) return price

    return null
  }

  // ─── Core Helpers ─────────────────────────────────────────────────────────

  /**
   * Finds all elements matching the given tag that:
   *   - Contain ₹ in their text
   *   - Are leaf nodes (no child elements) — the price text itself
   *   - Are NOT struck-through (MRP)
   */
  private findRupeeElements(tag: 'h4' | 'h5' | 'p' | 'span'): Element[] {
    try {
      return [...document.querySelectorAll(tag)].filter((el) => {
        const text = el.textContent?.trim() ?? ''
        if (!text.includes('₹')) return false
        if (this.isStrikeThrough(el)) return false
        return true
      })
    } catch {
      return []
    }
  }

  /**
   * Queries selectors in order, returning results from the first match.
   * Filters to only ₹-containing non-strikethrough elements.
   */
  private queryFiltered(selectors: string[]): Element[] {
    for (const selector of selectors) {
      try {
        const found = [...document.querySelectorAll(selector)].filter((el) => {
          const text = el.textContent?.trim() ?? ''
          if (!text.includes('₹')) return false
          if (this.isStrikeThrough(el)) return false
          return true
        })
        if (found.length > 0) return found
      } catch {
        // skip invalid selector
      }
    }
    return []
  }

  /**
   * Returns true if the element appears to be a struck-through MRP price.
   * Meesho marks MRP using a class name containing "StrikeThrough".
   */
  private isStrikeThrough(element: Element): boolean {
    // Class name check (styled-components class contains "StrikeThrough")
    if (/StrikeThrough|strikethrough/i.test(element.className)) return true
    // Check parent element class too (price might be wrapped)
    const parent = element.parentElement
    if (parent && /StrikeThrough|strikethrough/i.test(parent.className)) return true
    return false
  }

  private deduplicate(elements: Element[]): Element[] {
    return [...new Set(elements)]
  }

  /**
   * Parses an INR price string into a number.
   * Meesho uses "₹899" and "₹1,051" formats.
   * Handles: ₹12,999 · ₹1,23,456 · 12999
   */
  private parseINRString(text: string): number | null {
    const cleaned = text.replace(/[₹,\s]/g, '').trim()
    const match = /^(\d+(?:\.\d{1,2})?)/.exec(cleaned)
    if (!match) return null
    const num = parseFloat(match[1])
    return isNaN(num) ? null : num
  }
}
