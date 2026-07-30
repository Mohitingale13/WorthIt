import type { IParser } from '@/types'
import { WORTHIT_PROCESSED_ATTR, WORTHIT_HOST_ATTR } from '@/constants'

// ─── Price Scanner ─────────────────────────────────────────────────────────────

type PriceFoundCallback = (element: Element, price: number) => void

/**
 * PriceScanner manages the MutationObserver for a given parser.
 *
 * Design decisions:
 * - We do NOT observe the entire document — too expensive.
 * - Instead, we observe the document body but filter to meaningful subtree changes.
 * - We debounce mutation callbacks to batch rapid DOM updates (e.g., React SPAs).
 * - We use a data attribute marker to prevent re-processing already-handled elements.
 * - WeakSet tracks processed nodes for O(1) lookup without preventing GC.
 */
export class PriceScanner {
  private readonly parser: IParser
  private readonly onPriceFound: PriceFoundCallback
  private observer: MutationObserver | null = null
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private readonly debounceMs: number

  constructor(parser: IParser, onPriceFound: PriceFoundCallback, debounceMs = 150) {
    this.parser = parser
    this.onPriceFound = onPriceFound
    this.debounceMs = debounceMs
  }

  // ─── Public API ─────────────────────────────────────────────────────────

  /** Start observing the DOM for price elements */
  start(): void {
    this.scan()
    this.observer = new MutationObserver(this.handleMutations.bind(this))
    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      // We do NOT observe attributes or characterData — price text changes
      // are always accompanied by DOM insertions on Amazon/SPAs
    })
  }

  /** Stop observing and clean up */
  stop(): void {
    this.observer?.disconnect()
    this.observer = null
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
  }

  // ─── Private ────────────────────────────────────────────────────────────

  private handleMutations(mutations: MutationRecord[]): void {
    // Check if any mutation is relevant (not just WorthIt's own injections)
    const hasRelevantMutation = mutations.some((mutation) => {
      if (mutation.type !== 'childList') return false
      // Ignore WorthIt's own shadow host insertions
      for (const node of mutation.addedNodes) {
        if (node instanceof Element && node.hasAttribute(WORTHIT_HOST_ATTR)) {
          continue
        }
        return true
      }
      return false
    })

    if (!hasRelevantMutation) return

    // Debounce the scan to avoid running on every rapid SPA update
    if (this.debounceTimer !== null) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      this.scan()
      this.debounceTimer = null
    }, this.debounceMs)
  }

  /**
   * Scans the page for price elements and fires the callback for new ones.
   */
  private scan(): void {
    let nodes: Element[]
    try {
      nodes = this.parser.findPriceNodes()
    } catch {
      // Parser error — fail silently, never break the page
      return
    }

    for (const node of nodes) {
      // Skip already-processed elements
      if (node.hasAttribute(WORTHIT_PROCESSED_ATTR)) continue
      // Skip elements that are inside a WorthIt shadow host (shouldn't happen but guard)
      if (node.closest(`[${WORTHIT_HOST_ATTR}]`)) continue

      let price: number | null
      try {
        price = this.parser.extractPrice(node)
      } catch {
        continue
      }

      if (price === null || price <= 0) continue

      // Mark as processed before calling callback to prevent duplicate processing
      // in case the callback triggers a DOM update that causes a re-scan
      node.setAttribute(WORTHIT_PROCESSED_ATTR, 'true')
      this.onPriceFound(node, price)
    }
  }
}
