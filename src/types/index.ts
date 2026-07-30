// ─── Salary Tiers ────────────────────────────────────────────────────────────

export type SalaryTierId =
  | 'student'
  | 'entry'
  | 'mid'
  | 'senior'
  | 'custom'

export interface SalaryTier {
  id: SalaryTierId
  label: string
  description: string
  /** Annual salary in INR */
  annualSalaryINR: number
}

// ─── User Profile ─────────────────────────────────────────────────────────────

export interface UserProfile {
  /** Selected salary tier */
  salaryTier: SalaryTierId
  /** Custom annual salary in INR — only used when salaryTier === 'custom' */
  customSalary: number
  /** Number of working days per month. Default: 22 */
  workingDaysPerMonth: number
  /** Number of working hours per day. Default: 8 */
  workingHoursPerDay: number
  /** UI display mode preference */
  displayMode: 'auto' | 'light' | 'dark'
  /** Extension version when profile was created */
  extensionVersion: string
  /** Whether onboarding is complete */
  onboardingComplete: boolean
  /** Whether the first-run tooltip has been dismissed */
  firstRunDismissed: boolean
}

// ─── Calculation Result ───────────────────────────────────────────────────────

export interface CalculationResult {
  /** Price in INR */
  priceINR: number
  /** Hourly rate derived from salary profile */
  hourlyRate: number
  /** Raw time in hours */
  hours: number
  /** Formatted display string e.g. "14.5 hours" or "1.8 work days" */
  displayText: string
  /** Whether the time exceeds a full work day */
  isWorkDays: boolean
  /** Number of work days (if isWorkDays) */
  workDays: number
}

// ─── Price Detection ──────────────────────────────────────────────────────────

export interface DetectedPrice {
  /** The DOM element containing the price text */
  element: Element
  /** The parsed numeric price in INR */
  priceINR: number
  /** The original price string as shown on the page */
  originalText: string
}

// ─── Parser Interface ─────────────────────────────────────────────────────────

export interface IParser {
  /** Returns true if this parser supports the current page/URL */
  supports(url: string): boolean
  /**
   * Finds all price container elements on the current page.
   * Should use multiple fallback selectors.
   */
  findPriceNodes(): Element[]
  /**
   * Extracts a numeric INR price from an element.
   * Returns null if extraction fails.
   */
  extractPrice(element: Element): number | null
}

// ─── Storage Keys ─────────────────────────────────────────────────────────────

export type StorageKey = 'userProfile'

export interface StorageSchema {
  userProfile: UserProfile
}
