import { useState, useEffect, useCallback } from 'react'
import type { UserProfile, SalaryTierId } from '@/types'
import { SALARY_TIERS, DEFAULT_USER_PROFILE, EXTENSION_VERSION } from '@/constants'
import { getUserProfile, setUserProfile } from '@/storage'
import {
  calculateHourlyRate,
  resolveAnnualSalary,
  calculate,
  formatINR,
  formatHourlyRate,
} from '@/core/calculator'

// ─── Tab Reload Helper ───────────────────────────────────────────────────────

/**
 * Reloads the currently-active tab if it is an Amazon India page.
 * This ensures the content script picks up the new profile immediately
 * without the user needing to manually refresh.
 */
async function reloadActiveAmazonTab(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id && tab.url && /amazon\.in/.test(tab.url)) {
      await chrome.tabs.reload(tab.id)
    }
  } catch {
    // Silently ignore — tab reload is best-effort
  }
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── View Types ───────────────────────────────────────────────────────────────

type View = 'onboarding' | 'settings'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Preview price for the live calculation demo in the UI */
const PREVIEW_PRICE_INR = 8999

function getTierLabel(tierId: SalaryTierId): string {
  return SALARY_TIERS.find((t) => t.id === tierId)?.label ?? 'Custom'
}

// ─── Clock Icon ───────────────────────────────────────────────────────────────

function ClockIcon() {
  return (
    <svg
      width="14"
      height="14"
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
  )
}

function ShieldIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

// ─── Live Preview Card ─────────────────────────────────────────────────────────

function PreviewCard({ profile }: { profile: UserProfile }) {
  const result = calculate(PREVIEW_PRICE_INR, profile)
  const hourlyRate = calculateHourlyRate(profile)

  return (
    <div className="preview-card" aria-label="Live calculation preview">
      <div className="preview-card-label">Live Preview</div>
      <div className="preview-price-row">
        <div className="preview-price">₹{PREVIEW_PRICE_INR.toLocaleString('en-IN')}</div>
        {result.displayText ? (
          <div className="preview-time">
            <ClockIcon />
            {result.displayText}
          </div>
        ) : (
          <div className="preview-time" style={{ color: 'var(--color-text-muted)' }}>
            Set a salary to see the calculation
          </div>
        )}
      </div>
      {hourlyRate > 0 && (
        <>
          <div className="preview-divider" aria-hidden="true" />
          <div className="preview-meta">
            <span className="preview-meta-label">Annual Salary</span>
            <span className="preview-meta-value">
              {formatINR(resolveAnnualSalary(profile))}
            </span>
          </div>
          <div className="preview-meta" style={{ marginTop: 4 }}>
            <span className="preview-meta-label">Your hourly rate</span>
            <span className="preview-meta-value">{formatHourlyRate(hourlyRate)}</span>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Onboarding View ──────────────────────────────────────────────────────────

interface OnboardingViewProps {
  profile: UserProfile
  onChange: (updates: Partial<UserProfile>) => void
  onComplete: () => void
  isSaving: boolean
}

function OnboardingView({ profile, onChange, onComplete, isSaving }: OnboardingViewProps) {
  const isCustom = profile.salaryTier === 'custom'
  const isValid =
    isCustom ? profile.customSalary > 0 : profile.salaryTier !== undefined

  return (
    <>
      {/* Hero */}
      <div className="onboarding-hero">
        <span className="onboarding-emoji" role="img" aria-label="Clock">⏱️</span>
        <h1 className="onboarding-title">How much is your time worth?</h1>
        <p className="onboarding-subtitle">
          WorthIt converts prices into the hours you worked to earn them.
        </p>
      </div>

      {/* Salary Tier Selector */}
      <div className="form-group">
        <label htmlFor="salary-tier-select" className="form-label">
          How should WorthIt calculate your time?
        </label>
        <select
          id="salary-tier-select"
          className="form-select"
          value={profile.salaryTier}
          onChange={(e) => onChange({ salaryTier: e.target.value as SalaryTierId })}
          aria-describedby="salary-hint"
        >
          {SALARY_TIERS.map((tier) => (
            <option key={tier.id} value={tier.id}>
              {tier.label}
              {tier.id !== 'custom' && tier.annualSalaryINR > 0
                ? ` — ₹${(tier.annualSalaryINR / 100_000).toFixed(1)}L/yr`
                : ''}
            </option>
          ))}
        </select>
        <span id="salary-hint" className="form-hint">
          {SALARY_TIERS.find((t) => t.id === profile.salaryTier)?.description}
        </span>
      </div>

      {/* Custom Salary Input */}
      {isCustom && (
        <div className="form-group">
          <label htmlFor="custom-salary-input" className="form-label">
            Annual Salary (₹)
          </label>
          <input
            id="custom-salary-input"
            type="number"
            className="form-input"
            placeholder="e.g. 1200000 for ₹12 LPA"
            value={profile.customSalary || ''}
            min={1}
            onChange={(e) =>
              onChange({ customSalary: Math.max(0, parseInt(e.target.value, 10) || 0) })
            }
            aria-label="Enter your annual salary in rupees"
          />
          <span className="form-hint">Enter your annual CTC in ₹</span>
        </div>
      )}

      {/* Live Preview */}
      <PreviewCard profile={profile} />

      {/* Privacy Note */}
      <div className="privacy-note" role="note">
        <ShieldIcon />
        Everything calculated locally. No data leaves your device.
      </div>

      {/* CTA */}
      <button
        className="btn-primary"
        onClick={onComplete}
        disabled={!isValid || isSaving}
        aria-label="Save salary settings and activate WorthIt"
        type="button"
      >
        {isSaving ? 'Saving…' : 'Activate WorthIt →'}
      </button>
    </>
  )
}

// ─── Settings View ────────────────────────────────────────────────────────────

interface SettingsViewProps {
  profile: UserProfile
  onChange: (updates: Partial<UserProfile>) => void
  onSave: () => void
  isSaving: boolean
  savedFeedback: boolean
}

function SettingsView({ profile, onChange, onSave, isSaving, savedFeedback }: SettingsViewProps) {
  const isCustom = profile.salaryTier === 'custom'
  const hourlyRate = calculateHourlyRate(profile)

  return (
    <>
      <div className="settings-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="settings-title">Settings</span>
          <span className="status-active" aria-label="WorthIt is active">
            <span className="status-dot" aria-hidden="true" />
            Active
          </span>
        </div>

        {/* Stats */}
        <div className="stats-grid" aria-label="Your salary statistics">
          <div className="stat-card">
            <div className="stat-label">Salary Tier</div>
            <div className="stat-value">{getTierLabel(profile.salaryTier)}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Hourly Rate</div>
            <div className="stat-value">
              {hourlyRate > 0 ? formatHourlyRate(hourlyRate) : '—'}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Working Days</div>
            <div className="stat-value">{profile.workingDaysPerMonth}/mo</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Working Hours</div>
            <div className="stat-value">{profile.workingHoursPerDay}/day</div>
          </div>
        </div>
      </div>

      {/* Salary settings */}
      <div className="settings-section">
        <div className="settings-section-title">Salary</div>

        <div className="form-group">
          <label htmlFor="settings-salary-tier" className="form-label">
            Salary Tier
          </label>
          <select
            id="settings-salary-tier"
            className="form-select"
            value={profile.salaryTier}
            onChange={(e) => onChange({ salaryTier: e.target.value as SalaryTierId })}
          >
            {SALARY_TIERS.map((tier) => (
              <option key={tier.id} value={tier.id}>
                {tier.label}
                {tier.id !== 'custom' && tier.annualSalaryINR > 0
                  ? ` — ₹${(tier.annualSalaryINR / 100_000).toFixed(1)}L/yr`
                  : ''}
              </option>
            ))}
          </select>
        </div>

        {isCustom && (
          <div className="form-group">
            <label htmlFor="settings-custom-salary" className="form-label">
              Annual Salary (₹)
            </label>
            <input
              id="settings-custom-salary"
              type="number"
              className="form-input"
              value={profile.customSalary || ''}
              min={1}
              onChange={(e) =>
                onChange({ customSalary: Math.max(0, parseInt(e.target.value, 10) || 0) })
              }
            />
          </div>
        )}
      </div>


      {/* Save */}
      <button
        className="btn-primary"
        onClick={onSave}
        disabled={isSaving || savedFeedback}
        aria-label="Save settings"
        type="button"
        style={savedFeedback ? { background: 'var(--color-success)' } : undefined}
      >
        {isSaving ? 'Saving…' : savedFeedback ? '✓ Saved! Reloading page…' : 'Save Settings'}
      </button>
    </>
  )
}

// ─── Root App ─────────────────────────────────────────────────────────────────

export function App() {
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_USER_PROFILE)
  const [view, setView] = useState<View>('onboarding')
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [savedFeedback, setSavedFeedback] = useState(false)

  // Load profile from storage on mount
  useEffect(() => {
    void (async () => {
      const saved = await getUserProfile()
      setProfile(saved)
      setView(saved.onboardingComplete ? 'settings' : 'onboarding')
      setIsLoading(false)
    })()
  }, [])

  const handleChange = useCallback((updates: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...updates }))
  }, [])

  const handleComplete = useCallback(async () => {
    setIsSaving(true)
    const updated: UserProfile = {
      ...profile,
      onboardingComplete: true,
      extensionVersion: EXTENSION_VERSION,
    }
    await setUserProfile(updated)
    setProfile(updated)
    setView('settings')
    setIsSaving(false)
    // Reload active Amazon tab so content script picks up the new profile
    void reloadActiveAmazonTab()
  }, [profile])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    await setUserProfile(profile)
    setIsSaving(false)
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2500)
    // Reload active tab so labels refresh immediately
    void reloadActiveAmazonTab()
  }, [profile])


  if (isLoading) {
    return (
      <div className="popup-root" aria-busy="true" aria-label="Loading WorthIt">
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--color-text-muted)',
            fontSize: 13,
          }}
        >
          Loading…
        </div>
      </div>
    )
  }

  return (
    <div className="popup-root">
      {/* ── Header ── */}
      <header className="popup-header">
        <div className="popup-logo">
          <div className="popup-logo-icon" aria-hidden="true">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <span className="popup-logo-text">WorthIt</span>
        </div>
        <span className="popup-version">v{EXTENSION_VERSION}</span>
      </header>

      {/* ── Content ── */}
      <main className="popup-content">
        {view === 'onboarding' ? (
          <OnboardingView
            profile={profile}
            onChange={handleChange}
            onComplete={() => void handleComplete()}
            isSaving={isSaving}
          />
        ) : (
          <SettingsView
            profile={profile}
            onChange={handleChange}
            onSave={() => void handleSave()}
            isSaving={isSaving}
            savedFeedback={savedFeedback}
          />
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="popup-footer">
        Privacy-first · No data leaves your device · No accounts
      </footer>
    </div>
  )
}
