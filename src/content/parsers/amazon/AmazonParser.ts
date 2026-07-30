import type { IParser } from '@/types'
import { MIN_PRICE_INR } from '@/constants'

// ─── Amazon India Parser ──────────────────────────────────────────────────────

/**
 * Parser for Amazon India (www.amazon.in).
 *
 * Amazon's DOM structure is complex and shifts frequently.
 * We use 4 strategies, from most specific to most general.
 *
 * Price extraction order (most to least reliable):
 *   1. .a-offscreen child span — Amazon hides the accessible price string here
 *      e.g. <span class="a-offscreen">₹899.00</span>
 *   2. .a-price-whole + .a-price-fraction child elements
 *   3. Raw textContent of the element
 */
export class AmazonParser implements IParser {
  supports(url: string): boolean {
    return /^https?:\/\/(www\.)?amazon\.in\//.test(url)
  }

  findPriceNodes(): Element[] {
    const nodes: Element[] = []

    // Strategy 1: Product Detail Page — corePriceDisplay block
    const pdpNodes = this.strategy_pdpCorePrice()

    // If PDP prices found, only use those (avoid polluting with search results)
    if (pdpNodes.length > 0) {
      nodes.push(...pdpNodes)
      return this.deduplicate(nodes)
    }

    // Strategy 2: Apex / deal price block
    nodes.push(...this.strategy_pdpApexPrice())
    if (nodes.length > 0) return this.deduplicate(nodes)

    // Strategy 3: Search Results — one price per card
    nodes.push(...this.strategy_searchResults())

    return this.deduplicate(nodes)
  }

  extractPrice(element: Element): number | null {
    // ── Method 1: .a-offscreen hidden span (most reliable on Amazon India) ──
    // Amazon renders an accessible price string inside a hidden span.
    // e.g. <span class="a-offscreen">₹899.00</span>
    const offscreen = element.querySelector('.a-offscreen')
    if (offscreen?.textContent) {
      const price = this.parseINRString(offscreen.textContent)
      if (price !== null && price >= MIN_PRICE_INR) return price
    }

    // ── Method 2: Structured parts (.a-price-whole + .a-price-fraction) ──
    const wholePart = element.querySelector('.a-price-whole')
    if (wholePart?.textContent) {
      const wholeDigits = wholePart.textContent.replace(/[^0-9]/g, '')
      const fracPart = element.querySelector('.a-price-fraction')
      const fracDigits = fracPart?.textContent?.replace(/[^0-9]/g, '') ?? '00'
      if (wholeDigits) {
        const price = parseFloat(`${wholeDigits}.${fracDigits}`)
        if (!isNaN(price) && price >= MIN_PRICE_INR) return price
      }
    }

    // ── Method 3: Raw text fallback ──
    const rawText = element.textContent ?? ''
    if (rawText) {
      const price = this.parseINRString(rawText)
      if (price !== null && price >= MIN_PRICE_INR) return price
    }

    return null
  }

  // ─── Strategies ──────────────────────────────────────────────────────────

  private strategy_pdpCorePrice(): Element[] {
    const selectors = [
      // Primary price in corePriceDisplay (desktop)
      '#corePriceDisplay_desktop_feature_div .a-price:not(.a-text-price)',
      // Alternate IDs used on different product types
      '#corePrice_desktop .a-price:not(.a-text-price)',
      '#corePrice_feature_div .a-price:not(.a-text-price)',
      // Apex offer price
      '#apex_offerDisplay_desktop .a-price:not(.a-text-price)',
      // Legacy price block IDs
      '#priceblock_ourprice',
      '#priceblock_dealprice',
      '#price_inside_buybox',
      // New-style price to pay
      '.priceToPay .a-price:not(.a-text-price)',
      '.apexPriceToPay',
      // Reinvented price
      '#reinventPricePolicyMessage .a-price:not(.a-text-price)',
    ]

    const found: Element[] = []
    for (const selector of selectors) {
      try {
        const els = document.querySelectorAll(selector)
        els.forEach((el) => {
          // Extra guard: skip elements that are struck-through (MRP / original price)
          if (el.classList.contains('a-text-price')) return
          if (el.closest('.a-text-price')) return
          found.push(el)
        })
      } catch {
        // Skip invalid selectors silently
      }
      // Stop at the first selector that yields results
      if (found.length > 0) break
    }

    return found
  }

  private strategy_pdpApexPrice(): Element[] {
    const selectors = [
      '.a-price.apexPriceToPay',
      '.reinventPricePolicyMessage .a-price:not(.a-text-price)',
      '.a-price[data-a-size]:not(.a-text-price)',
    ]
    return this.queryAllFirst(selectors)
  }

  private strategy_searchResults(): Element[] {
    // Get all search result cards, then take the primary price from each
    const cards = document.querySelectorAll(
      '[data-component-type="s-search-result"]',
    )

    if (cards.length === 0) {
      // Flat fallback
      return this.queryAllFirst([
        '.s-result-item .a-price:not(.a-text-price)',
      ])
    }

    const results: Element[] = []
    cards.forEach((card) => {
      // Only the first price per card — avoids duplicating "was price"
      const price = card.querySelector('.a-price:not(.a-text-price)')
      if (price) results.push(price)
    })
    return results
  }

  // ─── Utility ─────────────────────────────────────────────────────────────

  /**
   * Tries each selector in order and returns results from the first one that matches.
   * This avoids duplicates from overlapping selectors.
   */
  private queryAllFirst(selectors: string[]): Element[] {
    for (const selector of selectors) {
      try {
        const found = [...document.querySelectorAll(selector)]
        if (found.length > 0) return found
      } catch {
        // Skip invalid selector
      }
    }
    return []
  }

  private deduplicate(elements: Element[]): Element[] {
    return [...new Set(elements)]
  }

  /**
   * Parses an INR price string into a number.
   * Handles: ₹12,999 · ₹ 12,999.00 · ₹1,23,456 · 12999
   */
  private parseINRString(text: string): number | null {
    // Remove ₹ symbol, commas, whitespace
    const cleaned = text.replace(/[₹,\s]/g, '').trim()
    // Match the first number (including optional decimal)
    const match = /^(\d+(?:\.\d{1,2})?)/.exec(cleaned)
    if (!match) return null
    const num = parseFloat(match[1])
    return isNaN(num) ? null : num
  }
}
