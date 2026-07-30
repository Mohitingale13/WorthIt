import type { IParser } from '@/types'
import { AmazonParser } from './amazon/AmazonParser'

// ─── Parser Registry ──────────────────────────────────────────────────────────

/**
 * Registry of all supported website parsers.
 *
 * To add a new website:
 *   1. Create a new parser in src/content/parsers/<site>/
 *   2. Import it here and add it to PARSERS
 *
 * The registry checks each parser's supports() method against the current URL.
 */
const PARSERS: readonly IParser[] = [
  new AmazonParser(),
  // Future: new FlipkartParser(),
  // Future: new MyntraParser(),
  // Future: new AjioParser(),
]

/**
 * Returns the parser that supports the given URL.
 * Returns null if no parser supports the URL.
 */
export function getParser(url: string = window.location.href): IParser | null {
  for (const parser of PARSERS) {
    if (parser.supports(url)) {
      return parser
    }
  }
  return null
}

export { AmazonParser }
