import type { SalaryTier, UserProfile } from '@/types'

// ─── Salary Tiers ─────────────────────────────────────────────────────────────

export const SALARY_TIERS: readonly SalaryTier[] = [
  {
    id: 'student',
    label: 'Student',
    description: 'Average student / intern salary',
    annualSalaryINR: 120_000, // ₹1.2 LPA
  },
  {
    id: 'entry',
    label: 'Entry Level',
    description: '0–3 years of experience',
    annualSalaryINR: 400_000, // ₹4 LPA
  },
  {
    id: 'mid',
    label: 'Mid Level',
    description: '3–7 years of experience',
    annualSalaryINR: 1_000_000, // ₹10 LPA
  },
  {
    id: 'senior',
    label: 'Senior',
    description: '7+ years of experience',
    annualSalaryINR: 2_500_000, // ₹25 LPA
  },
  {
    id: 'custom',
    label: 'Custom Salary',
    description: 'Enter your own annual salary',
    annualSalaryINR: 0, // resolved from UserProfile.customSalary
  },
] as const

// ─── Working Defaults ─────────────────────────────────────────────────────────

export const DEFAULT_WORKING_DAYS_PER_MONTH = 22
export const DEFAULT_WORKING_HOURS_PER_DAY = 8

// ─── Default Profile ──────────────────────────────────────────────────────────

export const DEFAULT_USER_PROFILE: UserProfile = {
  salaryTier: 'entry',
  customSalary: 400_000,
  workingDaysPerMonth: DEFAULT_WORKING_DAYS_PER_MONTH,
  workingHoursPerDay: DEFAULT_WORKING_HOURS_PER_DAY,
  displayMode: 'auto',
  extensionVersion: '1.0.0',
  onboardingComplete: false,
  firstRunDismissed: false,
}

// ─── Extension Meta ───────────────────────────────────────────────────────────

export const EXTENSION_VERSION = '1.0.0'
export const EXTENSION_NAME = 'WorthIt'

// ─── DOM Markers ──────────────────────────────────────────────────────────────

/** Data attribute set on a price element once WorthIt has processed it */
export const WORTHIT_PROCESSED_ATTR = 'data-worthit-processed'

/** Data attribute set on the shadow host wrapper element */
export const WORTHIT_HOST_ATTR = 'data-worthit-host'

// ─── Thresholds ───────────────────────────────────────────────────────────────

/** If computed hours exceed this, switch to "work days" display */
export const HOURS_PER_WORKDAY = DEFAULT_WORKING_HOURS_PER_DAY

/** Minimum price (INR) to process — ignore tiny prices like ₹0 or ₹1 */
export const MIN_PRICE_INR = 50
