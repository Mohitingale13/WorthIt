import type { IParser } from '@/types'
import { MIN_PRICE_INR } from '@/constants'

// ─── Flipkart Parser ──────────────────────────────────────────────────────────

/**
 * Parser for Flipkart India (www.flipkart.com).
 *
 * Flipkart uses React Native Web with fully obfuscated, non-semantic class names.
 * Verified via live DOM inspection on a PDP (July 2026):
 *
 *   Real selling price:  class="v1zwn21l v1zwn20 _1psv1zeb9 _1psv1ze0"    ← text="₹322"
 *   Ad/sponsored price:  class="v1zwn21l v1zwn2d _1psv1zeb9 _1psv1ze0 _1psv1zekc" ← text="₹325" (4×)
 *   Discount text:       class="css-146c3p1" ← "₹75 off" — must be ignored
 *
 * KEY INSIGHT: v1zwn2d appears on ADVERTISEMENT prices (multiple occurrences in ad cards).
 *              v1zwn20 appears on the MAIN PRODUCT selling price (single occurrence).
 *              Always try v1zwn20 first.
 *
 * findPriceNodes() order:
 *   1. [class*="v1zwn20"]  — main PDP selling price (confirmed real price)
 *   2. Legacy class names   — older Flipkart builds
 *   3. [class*="v1zwn2d"]  — LAST RESORT only if above fail (may hit ad prices)
 *
 * extractPrice():
 *   - Filters "off" / "MRP" text to skip discount labels
 *   - Filters elements inside ad containers via ancestor checks
 *   - Raw textContent parse (these are leaf elements with no children)
 */
export class FlipkartParser implements IParser {
  supports(url: string): boolean {
    return /^https?:\/\/(www\.)?flipkart\.com\//.test(url)
  }

  findPriceNodes(): Element[] {
    // ── Strategy 1: v1zwn20 = confirmed main product selling price ──
    // This is the class used for the real price on PDPs (verified July 2026).
    const mainPrice = this.queryFiltered(['[class*="v1zwn20"]'])
    if (mainPrice.length > 0) return mainPrice

    // ── Strategy 2: Legacy / alternate class names ──
    const legacy = this.queryFiltered([
      '[class*="Nx9bqj"]',    // older obfuscated class (2023–24)
      '[class*="30jeq3"]',    // older obfuscated class
      '[data-testid*="price"]',
      '[data-id="selling-price"]',
    ])
    if (legacy.length > 0) return legacy

    // ── Strategy 3: v1zwn2d — ONLY if everything else fails ──
    // This class appears on ad/recommended product prices so we avoid it
    // unless we have no other option.
    const adClass = this.queryFiltered(['[class*="v1zwn2d"]'])
    if (adClass.length > 0) {
      // If we get multiple identical prices it's likely an ad carousel —
      // deduplicate by value and only return if there's a single unique price.
      const unique = this.deduplicateByValue(adClass)
      if (unique.length === 1) return unique
    }

    return []
  }

  extractPrice(element: Element): number | null {
    const rawText = element.textContent?.trim() ?? ''

    // Must contain ₹ symbol — prevents '68%', ratings, counts from being parsed
    if (!rawText.includes('₹')) return null

    // Skip discount labels: "₹75 off", "₹100 off"
    if (/off/i.test(rawText)) return null

    // Skip MRP / original price labels
    if (/MRP/i.test(rawText)) return null

    // Skip elements that live inside an ad container
    if (this.isInsideAdContainer(element)) return null

    const price = this.parseINRString(rawText)
    if (price !== null && price >= MIN_PRICE_INR) return price

    return null
  }

  // ─── Utilities ────────────────────────────────────────────────────────────

  /**
   * Queries selectors in order, returning the first one that has results.
   * Already filters out obvious discount/MRP labels.
   */
  private queryFiltered(selectors: string[]): Element[] {
    for (const selector of selectors) {
      try {
        const found = [...document.querySelectorAll(selector)].filter((el) => {
          const text = el.textContent?.trim() ?? ''
          // Must contain ₹ — filters out percentages, ratings, counts etc.
          if (!text.includes('₹')) return false
          // Exclude "off" and "MRP" labels immediately
          if (/off|MRP/i.test(text)) return false
          // Exclude elements inside ad containers
          if (this.isInsideAdContainer(el)) return false
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
   * Checks if an element is inside a Flipkart ad/sponsored container.
   * Flipkart ad units typically use [data-ads-*] or [data-sponsored] attributes,
   * or are inside a parent with "ad" in its aria-label.
   */
  private isInsideAdContainer(element: Element): boolean {
    let el: Element | null = element
    for (let depth = 0; depth < 10; depth++) {
      if (!el) break
      // Check for common ad container markers
      if (
        el.hasAttribute('data-ads-creative-id') ||
        el.hasAttribute('data-sponsored') ||
        el.getAttribute('aria-label')?.toLowerCase().includes('sponsor') ||
        el.getAttribute('aria-label')?.toLowerCase().includes('advertis') ||
        el.getAttribute('data-testid')?.toLowerCase().includes('ad-')
      ) {
        return true
      }
      el = el.parentElement
    }
    return false
  }

  /**
   * Deduplicates elements by their parsed price value.
   * If all elements have the same price (ad carousel pattern), returns them all.
   * If there are distinct prices, returns only the first unique set.
   */
  private deduplicateByValue(elements: Element[]): Element[] {
    const seen = new Map<number, Element>()
    for (const el of elements) {
      const price = this.parseINRString(el.textContent?.trim() ?? '')
      if (price !== null && !seen.has(price)) {
        seen.set(price, el)
      }
    }
    return [...seen.values()]
  }

  /**
   * Parses an INR price string into a number.
   * Handles: ₹12,999 · ₹ 12,999.00 · ₹1,23,456 · 12999
   */
  private parseINRString(text: string): number | null {
    const cleaned = text.replace(/[₹,\s]/g, '').trim()
    const match = /^(\d+(?:\.\d{1,2})?)/.exec(cleaned)
    if (!match) return null
    const num = parseFloat(match[1])
    return isNaN(num) ? null : num
  }
}
