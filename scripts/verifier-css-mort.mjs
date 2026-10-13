#!/usr/bin/env node
/**
 * verifier-css-mort.mjs
 * Liste :
 * - chaque classe des feuilles app/styles/themes/*.css absente de tout className des composants
 * - chaque classe des modules components/**\/*.module.css jamais référencée (styles.x) par le fichier qui importe le module
 * - toute règle de thème qui combine un sélecteur universel (*) et !important
 *
 * Sort en erreur si une alerte ne figure pas dans exceptions-verifier.txt.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, relative, basename, dirname, join } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

function walkSync(dir, exts) {
  const results = []
  function walk(d) {
    let entries
    try { entries = readdirSync(d) } catch { return }
    for (const entry of entries) {
      const full = join(d, entry)
      try {
        const st = statSync(full)
        if (st.isDirectory()) {
          if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue
          walk(full)
        } else if (exts.some(e => full.endsWith(e))) {
          results.push(full)
        }
      } catch { /* skip */ }
    }
  }
  walk(resolve(ROOT, dir))
  return results
}

// Load exceptions
const exceptionsPath = resolve(ROOT, 'scripts', 'exceptions-verifier.txt')
const exceptions = new Set()
if (existsSync(exceptionsPath)) {
  const lines = readFileSync(exceptionsPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      const match = trimmed.match(/^CSS-MORT\s+(.+?)(?:\s+—\s+.*)?$/)
      if (match) exceptions.add(match[1].trim())
      const match2 = trimmed.match(/^IMPORTANT-STAR\s+(.+?)(?:\s+—\s+.*)?$/)
      if (match2) exceptions.add('IMPORTANT-STAR:' + match2[1].trim())
    }
  }
}

const alerts = []

// ===== 1. Classes des feuilles de thème =====

const themeCSS = walkSync('app/styles/themes', ['.css'])
const allSourceFiles = [
  ...walkSync('app', ['.tsx', '.ts', '.jsx', '.js']),
  ...walkSync('components', ['.tsx', '.ts', '.jsx', '.js']),
  ...walkSync('lib', ['.tsx', '.ts', '.jsx', '.js']),
]
const allSourceContents = allSourceFiles.map(f => readFileSync(f, 'utf-8'))
const allSourceJoined = allSourceContents.join('\n')

// Also check CSS files for @apply or composes references
const allCSSFiles = [
  ...walkSync('app/styles', ['.css']),
  ...walkSync('components', ['.css']),
]
const allCSSContents = allCSSFiles.map(f => readFileSync(f, 'utf-8'))
const allCSSJoined = allCSSContents.join('\n')

console.log('=== Vérification du CSS mort dans les thèmes ===\n')

let themeDeadCount = 0
let themeAliveCount = 0

for (const cssFile of themeCSS) {
  const rel = relative(ROOT, cssFile).replace(/\\/g, '/')
  const content = readFileSync(cssFile, 'utf-8')

  // Extract class names: .foo in selectors (not inside property values)
  // Simple regex: find all .classname in the CSS
  const classRegex = /\.([a-zA-Z_][\w-]*)/g
  const classesInFile = new Set()
  let m
  while ((m = classRegex.exec(content)) !== null) {
    // Skip pseudo-classes and pseudo-elements
    const cls = m[1]
    if (['hover', 'focus', 'active', 'visited', 'first-child', 'last-child',
         'nth-child', 'not', 'where', 'is', 'has', 'before', 'after',
         'placeholder', 'disabled', 'checked', 'root', 'empty',
         'first-of-type', 'last-of-type', 'only-child', 'target',
         'focus-visible', 'focus-within', 'any-link', 'modal',
         'first-line', 'first-letter', 'selection', 'marker',
         'module', 'global'].includes(cls)) continue
    classesInFile.add(cls)
  }

  const dead = []
  const alive = []

  for (const cls of classesInFile) {
    // Check if this class is used in any source file
    // Look for: className="...cls...", className={`...cls...`}, 'cls', "cls", `cls`
    // Also check for classList.add('cls'), clsx('cls'), etc.
    const escaped = cls.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

    // Check in JS/TSX sources
    const usedInSource = new RegExp(`['"\`\\s]${escaped}['"\`\\s,)]`).test(allSourceJoined) ||
                         new RegExp(`className=.*${escaped}`).test(allSourceJoined) ||
                         new RegExp(`\\b${escaped}\\b`).test(allSourceJoined)

    // Check in other CSS files (composes, @apply)
    const usedInCSS = new RegExp(`@apply[^;]*\\.${escaped}`).test(allCSSJoined)

    if (usedInSource || usedInCSS) {
      alive.push(cls)
      themeAliveCount++
    } else {
      dead.push(cls)
      themeDeadCount++
    }
  }

  if (dead.length > 0) {
    console.log(`${rel} : ${dead.length} morte(s) sur ${classesInFile.size}`)
    for (const d of dead) {
      const key = `${rel}:.${d}`
      const isExcepted = exceptions.has(key)
      console.log(`  ${isExcepted ? '⚠' : '✗'} .${d}${isExcepted ? ' (exception)' : ''}`)
      if (!isExcepted) {
        alerts.push(`CSS-MORT ${key}`)
      }
    }
  } else if (classesInFile.size > 0) {
    console.log(`${rel} : ${classesInFile.size} classe(s), toutes utilisées`)
  }
}

console.log(`\nTotal thèmes : ${themeAliveCount} vivante(s), ${themeDeadCount} morte(s)\n`)

// ===== 2. Classes des modules CSS =====

console.log('=== Vérification des modules CSS ===\n')

const moduleCSSFiles = walkSync('components', ['.module.css'])
let moduleDeadCount = 0

for (const cssFile of moduleCSSFiles) {
  const rel = relative(ROOT, cssFile).replace(/\\/g, '/')
  const content = readFileSync(cssFile, 'utf-8')
  const dir_ = dirname(cssFile)
  const moduleName = basename(cssFile)

  // Extract class names from the module
  const classRegex2 = /\.([a-zA-Z_][\w-]*)/g
  const classes = new Set()
  let m2
  while ((m2 = classRegex2.exec(content)) !== null) {
    const cls = m2[1]
    if (['hover', 'focus', 'active', 'visited', 'first-child', 'last-child',
         'nth-child', 'not', 'where', 'is', 'has', 'before', 'after',
         'placeholder', 'disabled', 'checked', 'root', 'empty', 'global',
         'first-of-type', 'last-of-type', 'only-child', 'modal',
         'focus-visible', 'focus-within', 'selection', 'marker'].includes(cls)) continue
    classes.add(cls)
  }

  // Find the file that imports this module
  const importerFiles = allSourceFiles.filter(f => {
    const c = readFileSync(f, 'utf-8')
    return c.includes(moduleName) || c.includes(moduleName.replace('.module.css', ''))
  })

  if (importerFiles.length === 0 && classes.size > 0) {
    console.log(`${rel} : module non importé (${classes.size} classe(s))`)
    for (const cls of classes) {
      const key = `${rel}:.${cls}`
      if (!exceptions.has(key)) {
        alerts.push(`CSS-MORT ${key}`)
        moduleDeadCount++
      }
    }
    continue
  }

  const importerContents2 = importerFiles.map(f => readFileSync(f, 'utf-8'))
  const importerJoined = importerContents2.join('\n')

  const dead = []
  for (const cls of classes) {
    // Check for styles.cls, styles['cls'], styles[`cls`], s.cls
    const camelCase = cls.replace(/-([a-z])/g, (_, c) => c.toUpperCase())
    const usedAsProperty = new RegExp(`\\b(?:styles?|s|css)\\s*\\.\\s*${camelCase}\\b`).test(importerJoined) ||
                           new RegExp(`\\b(?:styles?|s|css)\\s*\\[\\s*['"\`]${cls}['"\`]\\s*\\]`).test(importerJoined) ||
                           new RegExp(`\\b(?:styles?|s|css)\\s*\\.\\s*${cls}\\b`).test(importerJoined)

    // Also check :global(.cls) usage in the module itself (these are global classes)
    const isGlobal = new RegExp(`:global\\(\\s*\\.${cls}`).test(content)

    if (!usedAsProperty && !isGlobal) {
      dead.push(cls)
    }
  }

  if (dead.length > 0) {
    console.log(`${rel} : ${dead.length} morte(s) sur ${classes.size}`)
    for (const d of dead) {
      const key = `${rel}:.${d}`
      const isExcepted = exceptions.has(key)
      console.log(`  ${isExcepted ? '⚠' : '✗'} .${d}${isExcepted ? ' (exception)' : ''}`)
      if (!isExcepted) {
        alerts.push(`CSS-MORT ${key}`)
        moduleDeadCount++
      }
    }
  }
}

console.log(`\nTotal modules : ${moduleDeadCount} morte(s) sans exception\n`)

// ===== 3. Règles universelles avec !important =====

console.log('=== Vérification des règles * + !important dans les thèmes ===\n')

let importantStarCount = 0

for (const cssFile of themeCSS) {
  const rel = relative(ROOT, cssFile).replace(/\\/g, '/')
  const content = readFileSync(cssFile, 'utf-8')

  // Find rules that use * selector and !important
  // Split into rule blocks
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Check if this line or nearby lines have * in selector and !important in value
    if (line.includes('*') && !line.trim().startsWith('/*') && !line.trim().startsWith('//')) {
      // Look forward for !important in the same rule block
      let blockContent = line
      for (let j = i + 1; j < Math.min(i + 20, lines.length); j++) {
        blockContent += '\n' + lines[j]
        if (lines[j].includes('}')) break
      }
      if (blockContent.includes('!important')) {
        const key = `${rel}:${i + 1}`
        const isExcepted = exceptions.has('IMPORTANT-STAR:' + key)
        console.log(`  ${isExcepted ? '⚠' : '✗'} ${rel}:${i + 1} — sélecteur * avec !important${isExcepted ? ' (exception)' : ''}`)
        if (!isExcepted) {
          alerts.push(`IMPORTANT-STAR ${key}`)
          importantStarCount++
        }
      }
    }
  }
}

if (importantStarCount === 0) {
  console.log('Aucune règle * + !important trouvée.\n')
} else {
  console.log(`\n${importantStarCount} règle(s) * + !important sans exception\n`)
}

// ===== Résultat final =====

console.log('=== Résultat ===\n')

if (alerts.length > 0) {
  console.error(`ERREUR : ${alerts.length} alerte(s) sans exception :\n`)
  for (const a of alerts) {
    console.error(`  ✗ ${a}`)
  }
  console.error('\nAjoutez-les dans scripts/exceptions-verifier.txt avec une raison,')
  console.error('ou corrigez le code.\n')
  process.exit(1)
} else {
  console.log('Toutes les alertes sont couvertes par des exceptions.\n')
  process.exit(0)
}
