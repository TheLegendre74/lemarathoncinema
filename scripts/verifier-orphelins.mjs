#!/usr/bin/env node
/**
 * verifier-orphelins.mjs
 * Liste tout fichier .tsx de components/ qui n'est importé
 * (import statique, import() ou dynamic()) par aucun fichier
 * de app/, components/ ou lib/.
 *
 * Sort en erreur si une alerte ne figure pas dans exceptions-verifier.txt.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { resolve, relative, basename, join } from 'node:path'

const ROOT = resolve(import.meta.dirname, '..')

function walkSync(dir, ext) {
  const results = []
  function walk(d) {
    for (const entry of readdirSync(d)) {
      const full = join(d, entry)
      try {
        const st = statSync(full)
        if (st.isDirectory()) {
          if (entry === 'node_modules' || entry === '.next' || entry === '.git') continue
          walk(full)
        } else if (full.endsWith(ext)) {
          results.push(full)
        }
      } catch { /* skip broken symlinks */ }
    }
  }
  walk(resolve(ROOT, dir))
  return results
}

// 1. All .tsx files in components/
const componentFiles = walkSync('components', '.tsx')

// 2. All source files that could import them
const importers = [
  ...walkSync('app', '.tsx'),
  ...walkSync('app', '.ts'),
  ...walkSync('components', '.tsx'),
  ...walkSync('components', '.ts'),
  ...walkSync('lib', '.tsx'),
  ...walkSync('lib', '.ts'),
]

// 3. Read all importer contents
const importerContents = importers.map(f => ({
  path: f,
  content: readFileSync(f, 'utf-8'),
}))

// 4. Load exceptions
const exceptionsPath = resolve(ROOT, 'scripts', 'exceptions-verifier.txt')
const exceptions = new Set()
if (existsSync(exceptionsPath)) {
  const lines = readFileSync(exceptionsPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed && !trimmed.startsWith('#')) {
      // Format: "ORPHELIN fichier.tsx — raison"
      const match = trimmed.match(/^ORPHELIN\s+(.+?)(?:\s+—\s+.*)?$/)
      if (match) exceptions.add(match[1].trim())
    }
  }
}

// 5. Check each component file
const orphans = []

for (const compFile of componentFiles) {
  const rel = relative(ROOT, compFile).replace(/\\/g, '/')
  const name = basename(compFile, '.tsx')

  // Build possible import patterns for this file
  // e.g. components/theme/action/ActionFrame.tsx
  // could be imported as:
  //   '@/components/theme/action/ActionFrame'
  //   '../action/ActionFrame'
  //   './ActionFrame'
  //   'components/theme/action/ActionFrame'
  //   dynamic(() => import('...ActionFrame'))

  let imported = false

  for (const { path: importerPath, content } of importerContents) {
    if (importerPath === compFile) continue // don't count self-imports

    // Check for the component name in imports
    // Match: import ... from '.../<Name>' or '.../<Name>.tsx'
    // Match: import('.../<Name>') or import('.../<Name>.tsx')
    // Match: dynamic(() => import('.../<Name>'))
    // Match: require('.../<Name>')

    // Simple but effective: check if the basename (without ext) appears
    // in an import/require/dynamic context
    const patterns = [
      // Static import: from '.../<Name>'
      new RegExp(`from\\s+['"][^'"]*/${name}(?:\\.tsx)?['"]`),
      // Dynamic import: import('.../<Name>')
      new RegExp(`import\\s*\\(\\s*['"][^'"]*/${name}(?:\\.tsx)?['"]`),
      // Re-export: export ... from '.../<Name>'
      new RegExp(`export\\s+.*from\\s+['"][^'"]*/${name}(?:\\.tsx)?['"]`),
    ]

    for (const pat of patterns) {
      if (pat.test(content)) {
        imported = true
        break
      }
    }
    if (imported) break
  }

  if (!imported) {
    orphans.push(rel)
  }
}

// 6. Filter out exceptions
const alerts = orphans.filter(o => !exceptions.has(o))

// 7. Report
console.log('=== Vérification des composants orphelins ===\n')

if (orphans.length === 0) {
  console.log('Aucun composant orphelin trouvé.\n')
} else {
  console.log(`${orphans.length} composant(s) orphelin(s) :\n`)
  for (const o of orphans) {
    const isExcepted = exceptions.has(o)
    console.log(`  ${isExcepted ? '⚠' : '✗'} ${o}${isExcepted ? ' (exception)' : ''}`)
  }
  console.log()
}

if (alerts.length > 0) {
  console.error(`ERREUR : ${alerts.length} orphelin(s) sans exception :\n`)
  for (const a of alerts) {
    console.error(`  ✗ ${a}`)
  }
  console.error('\nAjoutez-les dans scripts/exceptions-verifier.txt avec une raison,')
  console.error('ou branchez-les dans le code.\n')
  process.exit(1)
} else {
  console.log('Toutes les alertes sont couvertes par des exceptions.\n')
  process.exit(0)
}
