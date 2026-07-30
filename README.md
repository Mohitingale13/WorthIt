# WorthIt

> Every purchase costs more than money. It costs your time.

**WorthIt** is a privacy-first Chrome Extension that translates prices on India's biggest shopping sites into the actual hours of work it took you to earn them. By providing personal context, it helps you make more intentional purchasing decisions—without creating guilt.

### ✅ Supported Sites
| Site | Status |
|---|---|
| Amazon India (`amazon.in`) | ✅ Supported |
| Flipkart (`flipkart.com`) | ✅ Supported |
| Myntra (`myntra.com`) | ✅ Supported |
| Meesho (`meesho.com`) | ✅ Supported |

---

## 🚀 How to Install and Use (For Normal Users)

Since this extension is completely free and open-source, you can install it directly on your browser without going through the Chrome Web Store.

### Installation Steps

1. Go to the [Releases page](../../releases) on this GitHub repository and download the latest `worthit-vX.X.X.zip` file. *(Alternatively, if a friend sent you the zip file, just use that!)*
2. **Extract** the downloaded `.zip` file into a folder on your computer.
3. Open Google Chrome and go to `chrome://extensions` in the address bar.
4. Turn on **Developer mode** (the toggle switch is in the top right corner).
5. Click the **Load unpacked** button in the top left.
6. Select the folder you extracted in Step 2.

That's it! The extension is installed.

### How to use it

1. Click the WorthIt icon in your Chrome extensions menu.
2. Select your salary tier (or enter a custom annual salary).
3. Browse any product on **Amazon India, Flipkart, Myntra, or Meesho**.
4. See "≈ X hours of your work" appear beneath every price — automatically.
5. Hover over the label to see the exact math!

---

## 🔒 Privacy First

WorthIt is designed to respect your privacy completely:
- **No data leaves your device:** All calculations happen locally on your machine.
- **No accounts or sign-ups:** We don't ask for your email or personal information.
- **No tracking:** We do not track your browsing history or your purchases.
- **Open Source:** The code is fully visible here for anyone to audit.

---

## 🛠️ Development (For Developers)

Want to build it from source or contribute?

### Tech Stack
- **React 19**
- **Vite** + **CRXJS** (for seamless extension building and HMR)
- **TypeScript**
- **Tailwind CSS**
- **Vitest** (Unit testing)

### Getting Started

1. Clone the repository:
   ```bash
   git clone https://github.com/Mohitingale13/WorthIt.git
   cd WorthIt
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run the development server (with Hot Module Replacement):
   ```bash
   npm run dev
   ```
   *This will generate a `dist/` folder. Load this unpacked in Chrome as explained in the installation steps above. HMR is fully supported!*

4. Run Unit Tests:
   ```bash
   npm test
   # Or for coverage:
   npm run test:coverage
   ```

5. Build for Production:
   ```bash
   npm run build
   ```
   *The optimized, minified extension will be in the `dist/` folder.*

### How it works technically
- **Content Script (`src/content`)**: Uses a `MutationObserver` to watch the DOM for price elements on any supported site. When it finds a price, it injects a Shadow DOM element to isolate CSS.
- **Parser Registry (`src/content/parsers`)**: Each supported site has its own `IParser` implementation. The registry picks the correct parser based on the current URL. Adding a new site is as simple as adding one file + one line in the registry.
  - `AmazonParser` — Amazon India
  - `FlipkartParser` — Flipkart
  - `MyntraParser` — Myntra
  - `MeeshoParser` — Meesho
- **Storage (`src/storage`)**: Uses `chrome.storage.local` with strict context invalidation checks.
- **Popup (`src/popup`)**: A React app that manages user onboarding and salary configurations.
