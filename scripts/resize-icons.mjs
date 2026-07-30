/**
 * WorthIt — Icon Resize Script
 *
 * Resizes the 128px icon to proper 16px, 32px, and 48px sizes
 * using the sharp package (install with: npm install --save-dev sharp)
 *
 * Run with: node scripts/resize-icons.mjs
 */

import sharp from 'sharp'
import { fileURLToPath } from 'url'
import path from 'path'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcIcon = path.resolve(__dirname, '../public/assets/icon128.png')

const sizes = [16, 32, 48]

for (const size of sizes) {
  const dest = path.resolve(__dirname, `../public/assets/icon${size}.png`)
  await sharp(srcIcon)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(dest)
  console.log(`✓ icon${size}.png created`)
}

console.log('\n✓ All icons resized. Run npm run build to bundle them.')
