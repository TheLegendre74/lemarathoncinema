import sharp from 'sharp'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = join(__dirname, '..', 'public', 'cursors')
mkdirSync(OUT, { recursive: true })

const SIZE = 32

// --- Reticle cursor: orange crosshair ---
const reticleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="10" fill="none" stroke="#FF6B1F" stroke-width="1.5" opacity="0.8"/>
  <circle cx="16" cy="16" r="3" fill="none" stroke="#FF6B1F" stroke-width="1"/>
  <line x1="16" y1="2" x2="16" y2="10" stroke="#FF6B1F" stroke-width="1.5"/>
  <line x1="16" y1="22" x2="16" y2="30" stroke="#FF6B1F" stroke-width="1.5"/>
  <line x1="2" y1="16" x2="10" y2="16" stroke="#FF6B1F" stroke-width="1.5"/>
  <line x1="22" y1="16" x2="30" y2="16" stroke="#FF6B1F" stroke-width="1.5"/>
  <circle cx="16" cy="16" r="1" fill="#FF6B1F"/>
</svg>`

// --- Car cursor: 8 orientations (0=up, 1=up-right, ... 7=up-left) ---
function carSvg(angle) {
  const cx = 16, cy = 16
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 32 32">
  <g transform="rotate(${angle * 45} ${cx} ${cy})">
    <rect x="12" y="7" width="8" height="18" rx="2" fill="#E8EDF2"/>
    <rect x="13" y="9" width="6" height="6" rx="1" fill="#17A2C9" opacity="0.7"/>
    <rect x="10" y="10" width="2" height="5" rx="1" fill="#8B99A7"/>
    <rect x="20" y="10" width="2" height="5" rx="1" fill="#8B99A7"/>
    <rect x="10" y="19" width="2" height="4" rx="1" fill="#FF6B1F"/>
    <rect x="20" y="19" width="2" height="4" rx="1" fill="#FF6B1F"/>
    <rect x="14" y="21" width="4" height="2" rx="0.5" fill="#C2201C"/>
  </g>
</svg>`
}

// --- Wreck cursor ---
const wreckSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 32 32">
  <rect x="11" y="8" width="10" height="16" rx="1" fill="#5A6773" opacity="0.8"/>
  <rect x="12" y="10" width="8" height="5" fill="#3A3A3A" opacity="0.6"/>
  <line x1="12" y1="9" x2="20" y2="15" stroke="#FF6B1F" stroke-width="0.8" opacity="0.6"/>
  <line x1="20" y1="9" x2="12" y2="15" stroke="#FF6B1F" stroke-width="0.8" opacity="0.6"/>
  <rect x="9" y="11" width="2" height="4" rx="0.5" fill="#5A6773" transform="rotate(-15 10 13)"/>
  <rect x="21" y="11" width="2" height="4" rx="0.5" fill="#5A6773" transform="rotate(10 22 13)"/>
  <rect x="9" y="19" width="3" height="3" rx="0.5" fill="#4A4A4A" transform="rotate(-20 10 20)"/>
  <rect x="20" y="20" width="3" height="3" rx="0.5" fill="#4A4A4A" transform="rotate(15 21 21)"/>
  <circle cx="14" cy="22" r="1" fill="#FF6B1F" opacity="0.5"/>
  <circle cx="19" cy="8" r="0.8" fill="#FFA23D" opacity="0.4"/>
</svg>`

// --- Comédie: gloved hand cursor (point chaud at tip of index finger, ~10,3) ---
const gantSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 32 32">
  <g fill="#F6E9CE" stroke="#BFA88C" stroke-width="0.8">
    <rect x="9" y="3" width="5" height="14" rx="2.5"/>
    <rect x="14" y="5" width="5" height="13" rx="2.5"/>
    <rect x="19" y="7" width="4.5" height="11" rx="2.2"/>
    <rect x="4" y="8" width="5" height="10" rx="2.5"/>
    <rect x="7" y="14" width="18" height="12" rx="4"/>
    <ellipse cx="6.5" cy="18" rx="3" ry="4"/>
  </g>
  <line x1="11.5" y1="14" x2="11.5" y2="22" stroke="#BFA88C" stroke-width="0.5" opacity="0.5"/>
  <line x1="16.5" y1="14" x2="16.5" y2="22" stroke="#BFA88C" stroke-width="0.5" opacity="0.5"/>
  <line x1="21" y1="14" x2="21" y2="20" stroke="#BFA88C" stroke-width="0.5" opacity="0.5"/>
</svg>`

// --- Western: colt revolver cursor (point chaud at tip of barrel, ~2,8) ---
const coltSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 32 32">
  <g fill="none" stroke="#C3AB7E" stroke-width="1.2">
    <rect x="1" y="6" width="22" height="5" rx="1" fill="#8A6A3C"/>
    <rect x="3" y="5" width="3" height="7" rx="1" fill="#6E5E45"/>
    <circle cx="5" cy="8.5" r="2.5" fill="#3A2A1B" stroke="#6E5E45"/>
  </g>
  <rect x="18" y="10" width="6" height="10" rx="1" fill="#5A3E22" stroke="#8A6A3C" stroke-width="0.8"/>
  <rect x="14" y="18" width="4" height="8" rx="1.5" fill="#6B4A28" stroke="#8A6A3C" stroke-width="0.8"/>
  <rect x="19" y="18" width="5" height="3" rx="1" fill="#3A2A1B" stroke="#6E5E45" stroke-width="0.6"/>
  <circle cx="28" cy="8.5" r="1.5" fill="#3A2A1B"/>
  <line x1="23" y1="8.5" x2="26.5" y2="8.5" stroke="#8A6A3C" stroke-width="1"/>
</svg>`

async function generate() {
  // Reticle
  await sharp(Buffer.from(reticleSvg))
    .resize(SIZE, SIZE)
    .png()
    .toFile(join(OUT, 'action-reticle.png'))
  console.log('  action-reticle.png')

  // 8 car orientations
  for (let i = 0; i < 8; i++) {
    await sharp(Buffer.from(carSvg(i)))
      .resize(SIZE, SIZE)
      .png()
      .toFile(join(OUT, `action-car-${i}.png`))
    console.log(`  action-car-${i}.png`)
  }

  // Wreck
  await sharp(Buffer.from(wreckSvg))
    .resize(SIZE, SIZE)
    .png()
    .toFile(join(OUT, 'action-car-epave.png'))
  console.log('  action-car-epave.png')

  // Comédie gloved hand
  await sharp(Buffer.from(gantSvg))
    .resize(SIZE, SIZE)
    .png()
    .toFile(join(OUT, 'comedie-gant.png'))
  console.log('  comedie-gant.png')

  // Western colt
  await sharp(Buffer.from(coltSvg))
    .resize(SIZE, SIZE)
    .png()
    .toFile(join(OUT, 'western-colt.png'))
  console.log('  western-colt.png')

  console.log('Done: 12 cursor PNGs generated.')
}

generate().catch(e => { console.error(e); process.exit(1) })
