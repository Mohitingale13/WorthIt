/**
 * Unit tests for src/core/calculator.ts
 *
 * Covers: resolveAnnualSalary, calculateHourlyRate, calculate,
 *         formatDecimal, formatINR, formatHourlyRate
 */

import {
  resolveAnnualSalary,
  calculateHourlyRate,
  calculate,
  formatDecimal,
  formatINR,
  formatHourlyRate,
} from './calculator'
import type { UserProfile } from '@/types'

// ─── Test Fixtures ─────────────────────────────────────────────────────────────

const baseProfile: UserProfile = {
  salaryTier: 'entry',
  customSalary: 0,
  workingDaysPerMonth: 22,
  workingHoursPerDay: 8,
  displayMode: 'auto',
  extensionVersion: '1.0.0',
  onboardingComplete: true,
  firstRunDismissed: false,
}

const studentProfile: UserProfile = { ...baseProfile, salaryTier: 'student' }
const midProfile: UserProfile = { ...baseProfile, salaryTier: 'mid' }
const seniorProfile: UserProfile = { ...baseProfile, salaryTier: 'senior' }
const customProfile: UserProfile = {
  ...baseProfile,
  salaryTier: 'custom',
  customSalary: 1_200_000, // ₹12 LPA
}
const zeroCustomProfile: UserProfile = {
  ...baseProfile,
  salaryTier: 'custom',
  customSalary: 0,
}

// ─── resolveAnnualSalary ──────────────────────────────────────────────────────

describe('resolveAnnualSalary', () => {
  it('returns 1.2L for student tier', () => {
    expect(resolveAnnualSalary(studentProfile)).toBe(120_000)
  })

  it('returns 4L for entry tier', () => {
    expect(resolveAnnualSalary(baseProfile)).toBe(400_000)
  })

  it('returns 10L for mid tier', () => {
    expect(resolveAnnualSalary(midProfile)).toBe(1_000_000)
  })

  it('returns 25L for senior tier', () => {
    expect(resolveAnnualSalary(seniorProfile)).toBe(2_500_000)
  })

  it('returns customSalary when tier is custom', () => {
    expect(resolveAnnualSalary(customProfile)).toBe(1_200_000)
  })

  it('returns 0 for custom tier with zero salary', () => {
    expect(resolveAnnualSalary(zeroCustomProfile)).toBe(0)
  })
})

// ─── calculateHourlyRate ──────────────────────────────────────────────────────

describe('calculateHourlyRate', () => {
  it('correctly computes hourly rate for entry level', () => {
    // ₹4L / 12 months / (22 days × 8 hrs) = ₹189.39/hr
    const rate = calculateHourlyRate(baseProfile)
    expect(rate).toBeCloseTo(189.39, 1)
  })

  it('correctly computes hourly rate for student', () => {
    // ₹1.2L / 12 / (22 × 8) = ₹56.82/hr
    const rate = calculateHourlyRate(studentProfile)
    expect(rate).toBeCloseTo(56.82, 1)
  })

  it('correctly computes hourly rate for senior', () => {
    // ₹25L / 12 / (22 × 8) = ₹1,183.71/hr
    const rate = calculateHourlyRate(seniorProfile)
    expect(rate).toBeCloseTo(1183.71, 1)
  })

  it('returns 0 when annual salary is 0', () => {
    expect(calculateHourlyRate(zeroCustomProfile)).toBe(0)
  })

  it('respects custom working days and hours', () => {
    const profile: UserProfile = {
      ...baseProfile,
      workingDaysPerMonth: 20,
      workingHoursPerDay: 6,
    }
    // ₹4L / 12 / (20 × 6) = ₹277.78/hr
    const rate = calculateHourlyRate(profile)
    expect(rate).toBeCloseTo(277.78, 1)
  })
})

// ─── calculate ────────────────────────────────────────────────────────────────

describe('calculate', () => {
  it('returns empty displayText when hourly rate is 0', () => {
    const result = calculate(10_000, zeroCustomProfile)
    expect(result.displayText).toBe('')
    expect(result.hours).toBe(0)
  })

  it('returns hours display for prices that resolve to < 8 hours', () => {
    // Entry: ₹189/hr. Price ₹500 → 500/189 ≈ 2.6 hrs
    const result = calculate(500, baseProfile)
    expect(result.isWorkDays).toBe(false)
    expect(result.displayText).toContain('hours of your work')
    expect(result.hours).toBeGreaterThan(0)
    expect(result.hours).toBeLessThan(8)
  })

  it('uses singular "hour" when result is exactly 1', () => {
    // Find price that gives exactly 1 hour for entry level (≈ ₹189)
    // We'll use a price slightly above 1× hourly rate
    const hourlyRate = calculateHourlyRate(baseProfile)
    const price = hourlyRate // exactly 1 hour
    const result = calculate(price, baseProfile)
    // hours == 1.0 exactly — should use "hour"
    expect(result.displayText).toMatch(/≈ 1 hour of your work/)
  })

  it('returns work days display for prices exceeding 8 hours', () => {
    // Entry: ₹189/hr. Price ₹10,000 → ~52 hrs → ~6.5 work days
    const result = calculate(10_000, baseProfile)
    expect(result.isWorkDays).toBe(true)
    expect(result.displayText).toContain('work day')
    expect(result.workDays).toBeGreaterThan(0)
  })

  it('uses singular "day" when result rounds to exactly 1 work day', () => {
    // HOURS_PER_WORKDAY = 8, threshold is STRICTLY > 8.
    // So we need price = hourlyRate × 8.1 to cross into work-days territory
    // and result in displayText with "1 work day"
    const hourlyRate = calculateHourlyRate(baseProfile)
    // 8.1 hours → isWorkDays = true, workDays = 8.1/8 = 1.0125 → formatDecimal → "1"
    const price = hourlyRate * 8.1
    const result = calculate(price, baseProfile)
    expect(result.isWorkDays).toBe(true)
    expect(result.displayText).toMatch(/≈ 1 work day/)
  })

  it('priceINR is preserved in result', () => {
    const result = calculate(8_999, baseProfile)
    expect(result.priceINR).toBe(8_999)
  })

  it('hourlyRate is correct in result', () => {
    const result = calculate(1_000, baseProfile)
    expect(result.hourlyRate).toBeCloseTo(calculateHourlyRate(baseProfile), 5)
  })
})

// ─── formatDecimal ────────────────────────────────────────────────────────────

describe('formatDecimal', () => {
  it('removes trailing .0', () => {
    expect(formatDecimal(2.0)).toBe('2')
    expect(formatDecimal(10.0)).toBe('10')
  })

  it('keeps one decimal when needed', () => {
    expect(formatDecimal(2.5)).toBe('2.5')
    expect(formatDecimal(7.4)).toBe('7.4')
  })

  it('rounds to 1 decimal place', () => {
    expect(formatDecimal(14.55)).toBe('14.6')
    expect(formatDecimal(14.54)).toBe('14.5')
  })

  it('handles zero', () => {
    expect(formatDecimal(0)).toBe('0')
  })

  it('handles large numbers', () => {
    expect(formatDecimal(100.0)).toBe('100')
    expect(formatDecimal(99.95)).toBe('100')
  })

  it('rounds 0.5 correctly', () => {
    expect(formatDecimal(0.5)).toBe('0.5')
    expect(formatDecimal(0.05)).toBe('0.1')
  })
})

// ─── formatINR ────────────────────────────────────────────────────────────────

describe('formatINR', () => {
  it('formats 1000 as ₹1,000', () => {
    const result = formatINR(1000)
    expect(result).toContain('1,000')
    expect(result).toContain('₹')
  })

  it('formats 100000 with Indian lakh formatting', () => {
    const result = formatINR(100_000)
    // Indian format: ₹1,00,000
    expect(result).toContain('1,00,000')
  })

  it('omits decimal places', () => {
    const result = formatINR(1234.56)
    expect(result).not.toContain('.')
  })
})

// ─── formatHourlyRate ─────────────────────────────────────────────────────────

describe('formatHourlyRate', () => {
  it('appends /hr suffix', () => {
    const result = formatHourlyRate(189)
    expect(result).toContain('/hr')
  })

  it('rounds to nearest rupee', () => {
    const result = formatHourlyRate(189.39)
    expect(result).toContain('189')
    expect(result).not.toContain('.')
  })

  it('formats with ₹ symbol', () => {
    const result = formatHourlyRate(500)
    expect(result).toContain('₹')
  })
})
