import type { CalculationResult, UserProfile } from '@/types'
import { SALARY_TIERS } from '@/constants'
import { formatINR, formatHourlyRate, formatDecimal } from '@/core/calculator'

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorthItLabelProps {
  result: CalculationResult
  profile: UserProfile
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getTierLabel(profile: UserProfile): string {
  const tier = SALARY_TIERS.find((t) => t.id === profile.salaryTier)
  return tier?.label ?? 'Custom'
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * WorthItLabel — the inline UI injected next to a product price.
 *
 * Renders:
 *  - A subtle "≈ X hours of your work" text
 *  - A tooltip on hover showing the full calculation breakdown
 *
 * All rendered inside Shadow DOM so it can never conflict with page styles.
 */
export function WorthItLabel({ result, profile }: WorthItLabelProps) {
  const tierLabel = getTierLabel(profile)
  const hourlyRateFormatted = formatHourlyRate(result.hourlyRate)
  const priceFormatted = formatINR(result.priceINR)
  const hoursFormatted = formatDecimal(result.hours)

  return (
    <div className="wi-label" role="note" aria-label={`WorthIt: ${result.displayText}`}>
      {/* ── Inline label text ── */}
      <span className="wi-label-text">
        <svg
          className="wi-icon"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {result.displayText}
      </span>

      {/* ── Hover tooltip ── */}
      <div
        className="wi-tooltip"
        role="tooltip"
        aria-label="WorthIt calculation details"
      >
        {/* Header */}
        <div className="wi-tooltip-header">
          <span className="wi-tooltip-brand">WorthIt</span>
          <span className="wi-tooltip-privacy">Local only</span>
        </div>

        {/* Profile row */}
        <div className="wi-tooltip-row">
          <span className="wi-tooltip-label">Profile</span>
          <span className="wi-tooltip-value">{tierLabel}</span>
        </div>

        {/* Hourly value row */}
        <div className="wi-tooltip-row">
          <span className="wi-tooltip-label">Your Hourly Value</span>
          <span className="wi-tooltip-value">{hourlyRateFormatted}</span>
        </div>

        <div className="wi-tooltip-divider" aria-hidden="true" />

        {/* Calculation breakdown */}
        <div className="wi-tooltip-calc">
          <strong>{priceFormatted}</strong>
          {' ÷ '}
          <strong>{hourlyRateFormatted}</strong>
          {' = '}
          <strong>{hoursFormatted} hrs</strong>
        </div>

        {result.isWorkDays && (
          <div className="wi-tooltip-calc" style={{ marginTop: 4 }}>
            {'≈ '}
            <strong>{formatDecimal(result.workDays)} work {result.workDays === 1 ? 'day' : 'days'}</strong>
          </div>
        )}

        {/* Footer */}
        <div className="wi-tooltip-footer">Private by default.</div>
      </div>
    </div>
  )
}
