import { useState, useEffect, useCallback } from 'react'
import type { UserProfile, SalaryTierId } from '@/types'
import { SALARY_TIERS, DEFAULT_USER_PROFILE, EXTENSION_VERSION } from '@/constants'
import { getUserProfile, setUserProfile } from '@/storage'
import {
  calculateHourlyRate,
  resolveAnnualSalary,
  formatINR,
  formatHourlyRate,
} from '@/core/calculator'

// ─── Tab Reload Helper ───────────────────────────────────────────────────────

async function reloadActiveSupportedTab(): Promise<void> {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    if (tab?.id && tab.url && /amazon\.in|flipkart\.com|myntra\.com|meesho\.com/.test(tab.url)) {
      await chrome.tabs.reload(tab.id)
    }
  } catch {
    // Silently ignore — tab reload is best-effort
  }
}

// ─── View Types ───────────────────────────────────────────────────────────────

type View = 'onboarding' | 'settings'

// ─── Icons ────────────────────────────────────────────────────────────────────

function ClockIcon() {
  return (
    <svg
      width="16"
      height="16"
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

// ─── Onboarding View ──────────────────────────────────────────────────────────

interface OnboardingViewProps {
  profile: UserProfile
  onChange: (updates: Partial<UserProfile>) => void
  onComplete: () => void
  isSaving: boolean
}

function OnboardingView({ profile, onChange, onComplete, isSaving }: OnboardingViewProps) {
  const isCustom = profile.salaryTier === 'custom'
  const isValid = isCustom ? profile.customSalary > 0 : profile.salaryTier !== undefined
  const hourlyRate = calculateHourlyRate(profile)
  const annualSalary = resolveAnnualSalary(profile)

  return (
    <>
      {/* Hero */}
      <div className="hero">
        <div className="hero-icon" aria-hidden="true">
          <ClockIcon />
        </div>
        <h1 className="hero-title">How much is your time worth?</h1>
        <p className="hero-subtitle">
          WorthIt converts prices into the hours you worked to earn them.
        </p>
      </div>

      <div className="divider" aria-hidden="true" />

      {/* Salary Profile */}
      <div className="field-group">
        <label htmlFor="salary-tier-select" className="field-label">
          Your salary profile
        </label>
        <select
          id="salary-tier-select"
          className="field-select"
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
        <span id="salary-hint" className="field-hint">
          {SALARY_TIERS.find((t) => t.id === profile.salaryTier)?.description}
        </span>
      </div>

      {isCustom && (
        <div className="field-group">
          <label htmlFor="custom-salary-input" className="field-label">
            Annual salary (₹)
          </label>
          <input
            id="custom-salary-input"
            type="number"
            className="field-input"
            placeholder="e.g. 1200000 for ₹12 LPA"
            value={profile.customSalary || ''}
            min={1}
            onChange={(e) =>
              onChange({ customSalary: Math.max(0, parseInt(e.target.value, 10) || 0) })
            }
            aria-label="Enter your annual salary in rupees"
          />
        </div>
      )}

      {/* Live derived values — only shown when a valid salary is set */}
      {hourlyRate > 0 && (
        <>
          <div className="divider" aria-hidden="true" />
          <div className="derived-block" aria-label="Your calculated time value">
            <div className="derived-row">
              <span className="derived-label">Your hourly value</span>
              <span className="derived-value accent">{formatHourlyRate(hourlyRate)}</span>
            </div>
            <div className="derived-row">
              <span className="derived-label">{formatINR(annualSalary)} / year</span>
              <span className="derived-label">
                {profile.workingDaysPerMonth} days/mo · {profile.workingHoursPerDay} hrs/day
              </span>
            </div>
          </div>
        </>
      )}

      <div className="divider" aria-hidden="true" />

      <button
        className="btn-primary"
        onClick={onComplete}
        disabled={!isValid || isSaving}
        aria-label="Save salary settings and activate WorthIt"
        type="button"
      >
        {isSaving ? 'Saving…' : 'Activate WorthIt'}
      </button>

      <p className="footer-note">Settings are stored locally on your device.</p>
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
  const annualSalary = resolveAnnualSalary(profile)

  return (
    <>
      {/* Profile summary — replaces the 4-card dashboard */}
      <div className="profile-summary">
        <div className="profile-summary-row">
          <span className="profile-tier">
            {SALARY_TIERS.find((t) => t.id === profile.salaryTier)?.label ?? 'Custom'}
          </span>
          {hourlyRate > 0 && (
            <span className="profile-rate accent">{formatHourlyRate(hourlyRate)}</span>
          )}
        </div>
        {hourlyRate > 0 && (
          <div className="profile-schedule">
            {formatINR(annualSalary)} / year &nbsp;·&nbsp;{' '}
            {profile.workingDaysPerMonth} days/mo · {profile.workingHoursPerDay} hrs/day
          </div>
        )}
      </div>

      <div className="divider" aria-hidden="true" />

      {/* Change profile */}
      <div className="field-group">
        <label htmlFor="settings-salary-tier" className="field-label">
          Change profile
        </label>
        <select
          id="settings-salary-tier"
          className="field-select"
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
        <div className="field-group">
          <label htmlFor="settings-custom-salary" className="field-label">
            Annual salary (₹)
          </label>
          <input
            id="settings-custom-salary"
            type="number"
            className="field-input"
            value={profile.customSalary || ''}
            min={1}
            onChange={(e) =>
              onChange({ customSalary: Math.max(0, parseInt(e.target.value, 10) || 0) })
            }
          />
        </div>
      )}

      <button
        className="btn-primary"
        onClick={onSave}
        disabled={isSaving || savedFeedback}
        aria-label="Save settings"
        type="button"
        style={savedFeedback ? { background: 'var(--color-success)' } : undefined}
      >
        {isSaving ? 'Saving…' : savedFeedback ? '✓ Saved' : 'Save'}
      </button>

      <p className="footer-note">Settings are stored locally on your device.</p>
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
    void reloadActiveSupportedTab()
  }, [profile])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    await setUserProfile(profile)
    setIsSaving(false)
    setSavedFeedback(true)
    setTimeout(() => setSavedFeedback(false), 2000)
    void reloadActiveSupportedTab()
  }, [profile])

  if (isLoading) {
    return (
      <div className="popup-root" aria-busy="true" aria-label="Loading WorthIt">
        <div className="loading-state">Loading…</div>
      </div>
    )
  }

  return (
    <div className="popup-root">
      {/* Header */}
      <header className="popup-header">
        <div className="popup-logo">
          <div className="popup-logo-icon" aria-hidden="true">
            <ClockIcon />
          </div>
          <span className="popup-logo-text">WorthIt</span>
        </div>
      </header>

      {/* Content */}
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
    </div>
  )
}
