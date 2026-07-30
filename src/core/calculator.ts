import type { UserProfile, CalculationResult } from '@/types'
import { SALARY_TIERS, HOURS_PER_WORKDAY } from '@/constants'

// ─── Salary Resolution ────────────────────────────────────────────────────────

/**
 * Resolves the effective annual salary from a UserProfile.
 * Handles the 'custom' tier specially.
 */
export function resolveAnnualSalary(profile: UserProfile): number {
  if (profile.salaryTier === 'custom') {
    return profile.customSalary
  }
  const tier = SALARY_TIERS.find((t) => t.id === profile.salaryTier)
  return tier?.annualSalaryINR ?? 400_000
}

// ─── Core Calculation ─────────────────────────────────────────────────────────

/**
 * Calculates the hourly rate from a UserProfile.
 *
 * Formula:
 *   Monthly Salary = Annual Salary / 12
 *   Hourly Rate = Monthly Salary / (Working Days × Working Hours)
 */
export function calculateHourlyRate(profile: UserProfile): number {
  const annualSalary = resolveAnnualSalary(profile)
  if (annualSalary <= 0) return 0
  const monthlySalary = annualSalary / 12
  const hoursPerMonth = profile.workingDaysPerMonth * profile.workingHoursPerDay
  return monthlySalary / hoursPerMonth
}

/**
 * Calculates the full CalculationResult for a given price and profile.
 */
export function calculate(priceINR: number, profile: UserProfile): CalculationResult {
  const hourlyRate = calculateHourlyRate(profile)

  if (hourlyRate <= 0) {
    return {
      priceINR,
      hourlyRate: 0,
      hours: 0,
      displayText: '',
      isWorkDays: false,
      workDays: 0,
    }
  }

  const hours = priceINR / hourlyRate
  const isWorkDays = hours > HOURS_PER_WORKDAY
  const workDays = isWorkDays ? hours / HOURS_PER_WORKDAY : 0

  return {
    priceINR,
    hourlyRate,
    hours,
    displayText: formatDisplayText(hours, isWorkDays, workDays),
    isWorkDays,
    workDays,
  }
}

// ─── Formatting ───────────────────────────────────────────────────────────────

/**
 * Formats the primary display text shown beneath the price.
 */
function formatDisplayText(hours: number, isWorkDays: boolean, workDays: number): string {
  if (isWorkDays) {
    return `≈ ${formatDecimal(workDays)} work ${workDays === 1 ? 'day' : 'days'}`
  }
  return `≈ ${formatDecimal(hours)} ${hours === 1 ? 'hour' : 'hours'} of your work`
}

/**
 * Rounds to at most 1 decimal place, but removes trailing .0
 * Examples: 14.55 → "14.6", 2.0 → "2", 0.5 → "0.5"
 */
export function formatDecimal(value: number): string {
  const rounded = Math.round(value * 10) / 10
  return rounded % 1 === 0 ? String(Math.round(rounded)) : rounded.toFixed(1)
}

/**
 * Formats a price in INR for display in the tooltip.
 */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

/**
 * Formats an hourly rate for display in the tooltip.
 */
export function formatHourlyRate(rate: number): string {
  return `${formatINR(Math.round(rate))}/hr`
}
