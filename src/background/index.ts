// WorthIt background service worker
// Manifest V3 requires a service worker as the background script.
// For WorthIt, this is intentionally minimal — all logic runs in
// content scripts and the popup. The service worker handles only
// extension lifecycle events.

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === chrome.runtime.OnInstalledReason.INSTALL) {
    // On first install, open the popup by opening the options page.
    // Note: We can't programmatically open the popup, but we can
    // open a new tab pointing to the popup's HTML for onboarding.
    void chrome.tabs.create({
      url: chrome.runtime.getURL('src/popup/index.html'),
    })
  }
})
