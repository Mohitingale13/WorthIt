# WorthIt — Chrome Web Store Submission Guide

This document is a step-by-step checklist for publishing WorthIt to the Chrome Web Store.

---

## Pre-Submission Checklist

### ✅ Code
- [x] All milestones 1–4 complete
- [x] Build passes (`npm run build`) — 0 errors, 0 warnings
- [x] Type check passes (`npm run type-check`) — 0 errors
- [x] All 57 unit tests pass (`npm test`)
- [x] Content Security Policy is Manifest V3 compliant
- [x] No remote code execution
- [x] No external network requests
- [x] `tabs` permission justified (reload active tab after settings save)
- [x] `storage` permission justified (local profile only)

### 📦 Build Output
Run `npm run build` — the `dist/` folder is your extension package.

---

## Store Assets Required

### Icons (already in dist/)
| Size | File | Status |
|---|---|---|
| 16×16 | `public/assets/icon16.png` | ⚠️ Currently upscaled copy of 128px |
| 32×32 | `public/assets/icon32.png` | ⚠️ Currently upscaled copy of 128px |
| 48×48 | `public/assets/icon48.png` | ⚠️ Currently upscaled copy of 128px |
| 128×128 | `public/assets/icon128.png` | ✅ |

> **Fix before submission:** Run `node scripts/resize-icons.mjs` (requires `npm install --save-dev sharp`) to create properly sized icons.

### Screenshots (required)
Google requires **1–5 screenshots**, minimum 1280×800 or 640×400 pixels.

**Recommended screenshots to capture:**

1. **Amazon product page with WorthIt label** — shows `≈ 7.4 hours of your work` beneath a price
2. **Hover tooltip** — shows the WORTHIT card with Profile, Your Hourly Value, calculation
3. **Popup — Settings view** — shows the extension popup with salary tier and active status
4. **Popup — Onboarding view** — shows first-time setup with live preview

> Capture at 1280×800 using Chrome DevTools device toolbar or a screen recording tool.

### Promotional Images (optional but recommended)
| Asset | Size |
|---|---|
| Small promotional tile | 440×280 px |
| Marquee promotional tile | 1400×560 px |

---

## Submission Steps

### 1. Create a Developer Account
- Go to: https://chrome.google.com/webstore/devconsole
- Pay the one-time $5 developer registration fee
- Verify your email

### 2. Zip the dist/ folder
```powershell
Compress-Archive -Path dist\* -DestinationPath worthit-v1.0.0.zip
```

### 3. Upload the extension
1. Open the Chrome Web Store Developer Dashboard
2. Click **New Item**
3. Upload `worthit-v1.0.0.zip`

### 4. Fill in the Store Listing

**Name:** WorthIt

**Short Description (up to 132 chars):**
> See every price on Amazon, Flipkart, Myntra & Meesho as hours of your work. What does it truly cost — in your time?

**Full Description:**

```
WorthIt helps you understand the real cost of purchases by translating prices into the work time required to earn them.

Every purchase costs more than money. It costs your time. Money is replaceable. Time isn't.

──────────────────────────────────────
SUPPORTED WEBSITES
──────────────────────────────────────
✓ Amazon India (amazon.in)
✓ Flipkart (flipkart.com)
✓ Myntra (myntra.com)
✓ Meesho (meesho.com)

──────────────────────────────────────
HOW IT WORKS
──────────────────────────────────────
1. Click the WorthIt icon and choose your salary tier (Student / Entry / Mid / Senior / Custom)
2. Visit any product page on a supported shopping site
3. See "≈ X hours of your work" appear beneath every price — automatically
4. Hover for a full breakdown: your hourly value, calculation, and the result

──────────────────────────────────────
FEATURES
──────────────────────────────────────
✓ Instant price-to-time conversion on Amazon India product pages
✓ Hover tooltip with full calculation breakdown
✓ 4 salary tiers + custom salary input
✓ Works on both product detail pages and search results
✓ Automatically updates when you change your salary tier
✓ Dark mode support

──────────────────────────────────────
PRIVACY FIRST
──────────────────────────────────────
✗ No account required
✗ No data collected
✗ No network requests
✗ No analytics or tracking
✓ Everything calculated locally on your device
✓ Your salary stays on your device

──────────────────────────────────────
PERMISSIONS EXPLAINED
──────────────────────────────────────
• storage — saves your salary settings locally on your device
• tabs — reloads the active Amazon tab when you update your settings (so labels refresh immediately)

WorthIt never reads tab URLs beyond checking if you're on Amazon India.
```

**Category:** Productivity

**Language:** English (India)

### 5. Privacy Practices
- **Does your extension collect user data?** No
- **Single purpose:** Converts Amazon India prices into work-hour equivalents

### 6. Submit for Review
- Review typically takes 1–7 business days
- You'll receive an email when approved or if changes are requested

---

## Post-Submission

### If Rejected (common reasons)
| Rejection reason | Fix |
|---|---|
| "Misleading description" | Remove any comparative claims |
| "Excessive permissions" | Justify each permission in listing |
| "Remote code execution" | Ensure no eval() or dynamic script loading |
| "Icon doesn't match store tile" | Create proper sized icons |

### Version Updates
1. Update `version` in `manifest.json` and `package.json`
2. Run `npm run build`
3. Zip the new `dist/`
4. Upload in the Developer Dashboard → **Manage existing** → **Upload new package**

---

## Quick Commands Reference

```powershell
# Build extension
npm run build

# Run all tests
npm test

# Check TypeScript
npm run type-check

# Zip dist for upload
Compress-Archive -Path dist\* -DestinationPath worthit-v1.0.0.zip -Force
```
