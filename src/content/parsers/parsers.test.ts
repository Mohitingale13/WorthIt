/**
 * Unit tests for src/content/parsers
 *
 * Tests the AmazonParser price extraction logic and ParserRegistry routing.
 * DOM tests use lightweight string manipulation — no JSDOM required.
 */

import { AmazonParser } from './amazon/AmazonParser'
import { FlipkartParser } from './flipkart/FlipkartParser'
import { MyntraParser } from './myntra/MyntraParser'
import { MeeshoParser } from './meesho/MeeshoParser'
import { getParser } from './index'

// ─── AmazonParser.supports ────────────────────────────────────────────────────

describe('AmazonParser.supports()', () => {
  const parser = new AmazonParser()

  it('matches www.amazon.in', () => {
    expect(parser.supports('https://www.amazon.in/dp/B09XYZ')).toBe(true)
  })

  it('matches amazon.in without www', () => {
    expect(parser.supports('https://amazon.in/dp/B09XYZ')).toBe(true)
  })

  it('does NOT match amazon.com', () => {
    expect(parser.supports('https://www.amazon.com/dp/B09XYZ')).toBe(false)
  })

  it('does NOT match flipkart.com', () => {
    expect(parser.supports('https://www.flipkart.com/product')).toBe(false)
  })

  it('does NOT match amazon.co.uk', () => {
    expect(parser.supports('https://www.amazon.co.uk/dp/B09XYZ')).toBe(false)
  })
})

// ─── AmazonParser.extractPrice ────────────────────────────────────────────────

describe('AmazonParser.extractPrice()', () => {
  const parser = new AmazonParser()

  /**
   * Creates a minimal DOM element for testing extractPrice.
   * Uses structuredClone-safe approach with globalThis.document.
   *
   * Note: Vitest runs in Node environment, so we create minimal mock elements.
   */
  function makePriceElement(html: string): Element {
    // Simple approach: parse with regex to simulate what extractPrice would see
    // We test the private parseINRString via public extractPrice by creating
    // a mock Element that has querySelector and textContent
    const texts = new Map<string, string>()

    // Extract .a-offscreen text
    const offscreenMatch = /<span class="a-offscreen">(.*?)<\/span>/.exec(html)
    if (offscreenMatch) texts.set('.a-offscreen', offscreenMatch[1])

    // Extract .a-price-whole text
    const wholeMatch = /<span class="a-price-whole">(.*?)<\/span>/.exec(html)
    if (wholeMatch) texts.set('.a-price-whole', wholeMatch[1])

    const rawText = html.replace(/<[^>]+>/g, '')

    return {
      querySelector(selector: string): Element | null {
        const text = texts.get(selector)
        if (!text) return null
        return {
          textContent: text,
          querySelector: () => null,
        } as unknown as Element
      },
      textContent: rawText,
    } as unknown as Element
  }

  it('extracts price from .a-offscreen span (primary method)', () => {
    const el = makePriceElement(`
      <span class="a-price">
        <span class="a-offscreen">₹8,999.00</span>
        <span aria-hidden="true"><span class="a-price-whole">8,999</span></span>
      </span>
    `)
    expect(parser.extractPrice(el)).toBe(8999)
  })

  it('handles prices with Indian lakh comma formatting', () => {
    const el = makePriceElement(`
      <span class="a-price">
        <span class="a-offscreen">₹1,23,456.00</span>
      </span>
    `)
    expect(parser.extractPrice(el)).toBe(123456)
  })

  it('returns null for prices below MIN_PRICE_INR (₹50)', () => {
    const el = makePriceElement(`
      <span class="a-price">
        <span class="a-offscreen">₹10.00</span>
      </span>
    `)
    expect(parser.extractPrice(el)).toBeNull()
  })

  it('returns null when no price text is found', () => {
    const el = makePriceElement('<span class="a-price"></span>')
    expect(parser.extractPrice(el)).toBeNull()
  })

  it('extracts from .a-price-whole when .a-offscreen is absent', () => {
    const el = makePriceElement(`
      <span class="a-price">
        <span class="a-price-whole">1,399</span>
      </span>
    `)
    expect(parser.extractPrice(el)).toBe(1399)
  })

  it('handles round numbers correctly', () => {
    const el = makePriceElement(`
      <span class="a-price">
        <span class="a-offscreen">₹899.00</span>
      </span>
    `)
    expect(parser.extractPrice(el)).toBe(899)
  })

  it('handles prices without ₹ symbol', () => {
    const el = makePriceElement(`
      <span class="a-price">
        <span class="a-offscreen">8,999.00</span>
      </span>
    `)
    expect(parser.extractPrice(el)).toBe(8999)
  })
})

// ─── ParserRegistry ───────────────────────────────────────────────────────────

describe('getParser() registry', () => {
  it('returns AmazonParser for amazon.in URL', () => {
    const parser = getParser('https://www.amazon.in/dp/B09XYZ')
    expect(parser).toBeInstanceOf(AmazonParser)
  })

  it('returns FlipkartParser for flipkart.com URL', () => {
    const parser = getParser('https://www.flipkart.com/product/p/123')
    expect(parser).toBeInstanceOf(FlipkartParser)
  })

  it('returns MyntraParser for myntra.com URL', () => {
    const parser = getParser('https://www.myntra.com/shoes/nike/123')
    expect(parser).toBeInstanceOf(MyntraParser)
  })

  it('returns MeeshoParser for meesho.com URL', () => {
    const parser = getParser('https://meesho.com/product/123')
    expect(parser).toBeInstanceOf(MeeshoParser)
  })

  it('returns null for empty URL', () => {
    const parser = getParser('')
    expect(parser).toBeNull()
  })

  it('returns null for non-shopping URL', () => {
    const parser = getParser('https://www.google.com/search?q=earbuds')
    expect(parser).toBeNull()
  })
})

// ─── FlipkartParser.supports ──────────────────────────────────────────────────

describe('FlipkartParser.supports()', () => {
  const parser = new FlipkartParser()

  it('matches www.flipkart.com', () => {
    expect(parser.supports('https://www.flipkart.com/product')).toBe(true)
  })

  it('matches flipkart.com without www', () => {
    expect(parser.supports('https://flipkart.com/product')).toBe(true)
  })

  it('does NOT match amazon.in', () => {
    expect(parser.supports('https://www.amazon.in/dp/B09XYZ')).toBe(false)
  })

  it('does NOT match myntra.com', () => {
    expect(parser.supports('https://www.myntra.com/shoes')).toBe(false)
  })
})

// ─── MyntraParser.supports ────────────────────────────────────────────────────

describe('MyntraParser.supports()', () => {
  const parser = new MyntraParser()

  it('matches www.myntra.com', () => {
    expect(parser.supports('https://www.myntra.com/shoes/nike/123')).toBe(true)
  })

  it('matches myntra.com without www', () => {
    expect(parser.supports('https://myntra.com/shoes')).toBe(true)
  })

  it('does NOT match flipkart.com', () => {
    expect(parser.supports('https://www.flipkart.com/product')).toBe(false)
  })
})

// ─── MeeshoParser.supports ────────────────────────────────────────────────────

describe('MeeshoParser.supports()', () => {
  const parser = new MeeshoParser()

  it('matches meesho.com', () => {
    expect(parser.supports('https://meesho.com/product/123')).toBe(true)
  })

  it('matches www.meesho.com', () => {
    expect(parser.supports('https://www.meesho.com/product/123')).toBe(true)
  })

  it('does NOT match myntra.com', () => {
    expect(parser.supports('https://www.myntra.com/shoes')).toBe(false)
  })

  it('does NOT match flipkart.com', () => {
    expect(parser.supports('https://www.flipkart.com/product')).toBe(false)
  })
})
