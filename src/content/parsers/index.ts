import type { IParser } from '@/types'
import { AmazonParser } from './amazon/AmazonParser'
import { FlipkartParser } from './flipkart/FlipkartParser'
import { MyntraParser } from './myntra/MyntraParser'
import { MeeshoParser } from './meesho/MeeshoParser'

// ─── Parser Registry ──────────────────────────────────────────────────────────

/**
 * Registry of all supported website parsers.
 *
 * To add a new website:
 *   1. Create a new parser in src/content/parsers/<site>/
 *   2. Implement the IParser interface
 *   3. Import it here and add it to PARSERS
 *   4. Add the URL pattern to manifest.json → content_scripts.matches
 *      and host_permissions
 *
 * The registry checks each parser's supports() method against the current URL.
 * Order matters — the first matching parser wins.
 */
const PARSERS: readonly IParser[] = [
  new AmazonParser(),
  new FlipkartParser(),
  new MyntraParser(),
  new MeeshoParser(),
  // Future: new AjioParser(),
  // Future: new NykaaParser(),
  // Future: new TataCliqParser(),
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

export { AmazonParser, FlipkartParser, MyntraParser, MeeshoParser }
