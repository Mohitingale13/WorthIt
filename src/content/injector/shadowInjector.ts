import { createRoot } from 'react-dom/client'
import type { ReactNode } from 'react'
import { WORTHIT_HOST_ATTR } from '@/constants'

// ─── Shadow DOM Injector ───────────────────────────────────────────────────────

/**
 * Injects a React tree into a Shadow DOM root attached to a new wrapper element.
 *
 * The wrapper is inserted into the DOM at the specified position relative to the
 * target element. Using Shadow DOM ensures complete style isolation — WorthIt's
 * styles never affect the host page, and the host page's styles never affect us.
 *
 * @param targetElement  - The price element to inject next to
 * @param content        - The React node to render inside the shadow
 * @param cssText        - The CSS string to inject into the shadow root
 * @returns A cleanup function that removes the wrapper and unmounts React
 */
export function injectShadowRoot(
  targetElement: Element,
  content: ReactNode,
  cssText: string,
): (() => void) | null {
  try {
    // Create the shadow host wrapper
    const wrapper = document.createElement('div')
    wrapper.setAttribute(WORTHIT_HOST_ATTR, 'true')
    wrapper.style.display = 'block'
    wrapper.style.lineHeight = '1'

    // Insert wrapper after the target element
    targetElement.insertAdjacentElement('afterend', wrapper)

    // Attach shadow DOM in closed mode — prevents external JS access
    const shadow = wrapper.attachShadow({ mode: 'open' })

    // Inject our scoped styles
    const styleEl = document.createElement('style')
    styleEl.textContent = cssText
    shadow.appendChild(styleEl)

    // Create a mount point for React inside the shadow
    const mountPoint = document.createElement('div')
    shadow.appendChild(mountPoint)

    // Mount React
    const root = createRoot(mountPoint)
    root.render(content)

    // Return cleanup function
    return () => {
      root.unmount()
      wrapper.remove()
    }
  } catch (error) {
    // Never break the host page
    console.error('[WorthIt] Failed to inject shadow root:', error)
    return null
  }
}

/**
 * Injects a React tree into a full-page Shadow DOM for overlays (e.g., banners).
 * Appends the shadow host to document.body.
 */
export function injectPageOverlay(
  content: ReactNode,
  cssText: string,
): (() => void) | null {
  try {
    const wrapper = document.createElement('div')
    wrapper.setAttribute(WORTHIT_HOST_ATTR, 'overlay')
    document.body.appendChild(wrapper)

    const shadow = wrapper.attachShadow({ mode: 'open' })

    const styleEl = document.createElement('style')
    styleEl.textContent = cssText
    shadow.appendChild(styleEl)

    const mountPoint = document.createElement('div')
    shadow.appendChild(mountPoint)

    const root = createRoot(mountPoint)
    root.render(content)

    return () => {
      root.unmount()
      wrapper.remove()
    }
  } catch (error) {
    console.error('[WorthIt] Failed to inject page overlay:', error)
    return null
  }
}
