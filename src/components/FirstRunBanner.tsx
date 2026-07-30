interface FirstRunBannerProps {
  onDismiss: () => void
}

/**
 * FirstRunBanner — shown once the first time WorthIt finds a price on a page.
 * Dismisses permanently on click. Never shown again after dismissal.
 */
export function FirstRunBanner({ onDismiss }: FirstRunBannerProps) {
  return (
    <div
      className="wi-banner"
      role="alertdialog"
      aria-label="WorthIt introduction"
      aria-live="polite"
    >
      <div className="wi-banner-header">
        <span className="wi-banner-brand">WorthIt</span>
        <button
          className="wi-banner-close"
          onClick={onDismiss}
          aria-label="Dismiss WorthIt introduction"
          type="button"
        >
          ×
        </button>
      </div>
      <p className="wi-banner-text">
        WorthIt translates prices into your work time.
        All calculations stay on your device.
      </p>
    </div>
  )
}
