/**
 * WorthIt Content Script — Main Entry Point
 *
 * Bug fixes in this version:
 *  - Content script no longer exits early when onboarding is incomplete.
 *    Instead it always registers the profile change listener so that when
 *    the user completes onboarding in the popup, the scanner starts immediately
 *    without requiring a page reload.
 *  - Properly handles the case where the scanner is started after the fact.
 */

import React from 'react'
import { getParser } from './parsers'
import { PriceScanner } from './scanner/PriceScanner'
import { injectShadowRoot, injectPageOverlay } from './injector/shadowInjector'
import { WorthItLabel } from '@/components/WorthItLabel'
import { FirstRunBanner } from '@/components/FirstRunBanner'
import { getUserProfile, setUserProfile, onProfileChange } from '@/storage'
import { calculate } from '@/core/calculator'
import type { UserProfile, CalculationResult } from '@/types'

// Import our scoped CSS as a string — Vite inlines it
import contentCss from '@/styles/content.css?inline'

// ─── State ────────────────────────────────────────────────────────────────────

/** Current user profile — updated reactively */
let currentProfile: UserProfile | null = null

/** Active scanner instance — only one at a time */
let activeScanner: PriceScanner | null = null

/** Map from price element → its cleanup function */
const injectedLabels = new Map<Element, () => void>()

/** Cleanup for the first-run banner */
let bannerCleanup: (() => void) | null = null

/** Whether this is the first price found on this page load */
let firstPriceOnPage = true

// ─── Initialization ───────────────────────────────────────────────────────────

async function init() {
  // Step 1: Check if a parser supports the current page
  const parser = getParser()
  if (!parser) return

  // Step 2: Bail out early on checkout/payment pages (never inject there)
  if (isExcludedPage()) return

  // Step 3: Load user profile
  currentProfile = await getUserProfile()

  // Step 4: Always listen for profile changes — even before onboarding is complete.
  // This is the critical fix: if the user was on an Amazon page BEFORE completing
  // onboarding, the scanner must start as soon as they save their profile.
  const unsubscribe = onProfileChange((newProfile) => {
    const wasComplete = currentProfile?.onboardingComplete ?? false
    currentProfile = newProfile

    if (!newProfile.onboardingComplete) return

    if (!wasComplete && newProfile.onboardingComplete) {
      // User just completed onboarding — start the scanner now
      startScanner(parser)
      return
    }

    // Profile updated (salary change) — refresh all existing labels
    refreshAllLabels()
  })

  // Step 5: Clean up when the page unloads
  window.addEventListener('unload', () => {
    activeScanner?.stop()
    activeScanner = null
    unsubscribe()
    cleanupAllLabels()
  })

  // Step 6: Only start scanning if onboarding is already complete
  if (currentProfile.onboardingComplete) {
    startScanner(parser)
  }
}

/** Starts the PriceScanner. Safe to call more than once — stops the existing one first. */
function startScanner(parser: ReturnType<typeof getParser>) {
  if (!parser) return
  activeScanner?.stop()
  activeScanner = new PriceScanner(parser, handlePriceFound)
  activeScanner.start()
}

// ─── Event Handlers ───────────────────────────────────────────────────────────

function handlePriceFound(element: Element, priceINR: number) {
  if (!currentProfile) return

  const result = calculate(priceINR, currentProfile)
  if (!result.displayText) return

  injectLabel(element, result, currentProfile)

  // Show the first-run banner the first time a price is found on this page
  if (firstPriceOnPage && !currentProfile.firstRunDismissed) {
    firstPriceOnPage = false
    showFirstRunBanner()
  }
}

function injectLabel(element: Element, result: CalculationResult, profile: UserProfile) {
  // Remove any existing label for this element before re-injecting
  const existing = injectedLabels.get(element)
  if (existing) existing()

  const cleanup = injectShadowRoot(
    element,
    React.createElement(WorthItLabel, { result, profile }),
    contentCss,
  )

  if (cleanup) {
    injectedLabels.set(element, cleanup)
  }
}

function showFirstRunBanner() {
  if (bannerCleanup) return

  bannerCleanup = injectPageOverlay(
    React.createElement(FirstRunBanner, {
      onDismiss: dismissBanner,
    }),
    contentCss,
  )
}

async function dismissBanner() {
  bannerCleanup?.()
  bannerCleanup = null

  if (currentProfile) {
    const updated = { ...currentProfile, firstRunDismissed: true }
    currentProfile = updated
    await setUserProfile(updated)
  }
}

/**
 * Removes all injected labels and re-scans.
 * Called when the user profile changes (e.g., salary tier updated).
 */
function refreshAllLabels() {
  cleanupAllLabels()
  // Remove processed markers so the scanner picks up the elements again
  document
    .querySelectorAll('[data-worthit-processed]')
    .forEach((el) => el.removeAttribute('data-worthit-processed'))
}

function cleanupAllLabels() {
  injectedLabels.forEach((cleanup) => cleanup())
  injectedLabels.clear()
}

// ─── Excluded Pages ───────────────────────────────────────────────────────────

function isExcludedPage(): boolean {
  const url = window.location.href
  const pathname = window.location.pathname

  const excludedPatterns = [
    '/checkout/',
    '/gp/buy/',
    '/ap/signin',
    '/ap/register',
    '/gp/cart/',
    'pay.amazon',
    '/payments/',
  ]

  return excludedPatterns.some(
    (pattern) => url.includes(pattern) || pathname.includes(pattern),
  )
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

// Guard: if the extension context is already invalidated by the time this
// script runs (e.g., extension was reloaded while this tab was open),
// do nothing. This prevents 'Extension context invalidated' errors.
try {
  if (typeof chrome !== 'undefined' && chrome.runtime?.id) {
    void init()
  }
} catch {
  // Context gone — exit silently
}
