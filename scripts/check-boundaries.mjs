/**
 * Import direction and folder notes, checked instead of hoped for.
 *
 *   app         -> anything
 *   components  -> components, state, services, core, a11y, audio   (never store)
 *   state       -> state, services, store, core, a11y, audio         (never components)
 *   services    -> services, store, core, audio                      (no React)
 *   store       -> store, core                                       (no React)
 *   core        -> core                                              (no React)
 *
 * Two narrower rules:
 *   - components/shared imports no other component folder, so "shared" stays shared.
 *   - core may import *types* from components/shared/icons: the tool and template
 *     registries name the icon each entry is drawn with, and a type import is
 *     erased at build time, so core still runs in node.
 *
 * And every folder under components/, state/ and services/ has a README.md whose
 * file table names only files that exist, so the notes cannot quietly go stale.
 *
 * No dependency: a check that needs an install is one nobody runs.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join, posix, sep } from 'node:path'

const RULES = [
  { layer: 'src/components/shared', may: ['src/components/shared', 'src/state', 'src/services', 'src/core', 'src/a11y', 'src/audio'] },
  { layer: 'src/components', may: ['src/components', 'src/state', 'src/services', 'src/core', 'src/a11y', 'src/audio'] },
  { layer: 'src/state', may: ['src/state', 'src/services', 'src/store', 'src/core', 'src/a11y', 'src/audio'] },
  { layer: 'src/services', may: ['src/services', 'src/store', 'src/core', 'src/audio'], noReact: true },
  { layer: 'src/store', may: ['src/store', 'src/core'], noReact: true },
  { layer: 'src/core', may: ['src/core'], typeOnly: ['src/components/shared/icons'], noReact: true },
]

const files = []
const dirs = []
const walk = (dir) => {
  dirs.push(dir.replaceAll(sep, '/'))
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (/[.](ts|tsx)$/.test(entry.name)) files.push(path.replaceAll(sep, '/'))
  }
}
walk('src')

const importRe = /^(?:import|export)\s+(type\s+)?[^'"]*?from\s+'([^']+)'/gm
const problems = []

for (const file of files) {
  // Most specific layer first: components/shared before components.
  const rule = RULES.find((r) => file.startsWith(r.layer + '/'))
  if (!rule) continue
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(importRe)) {
    const [, typeOnly, spec] = match
    const line = text.slice(0, match.index).split('\n').length
    if (rule.noReact && (spec === 'react' || spec.startsWith('react/') || spec === 'react-dom')) {
      problems.push(`${file}:${line}  ${rule.layer} tidak boleh mengimpor React`)
      continue
    }
    if (!spec.startsWith('.')) continue
    const target = posix.normalize(posix.join(posix.dirname(file), spec))
    const inside = (roots = []) => roots.some((root) => target === root || target.startsWith(root + '/'))
    if (inside(rule.may)) continue
    if (typeOnly && inside(rule.typeOnly)) continue
    problems.push(`${file}:${line}  ${rule.layer} -> ${target}`)
  }
}

// Folder notes.
const noted = dirs.filter((d) => /^src\/(components|state|services)(\/|$)/.test(d))
for (const dir of noted) {
  const readme = `${dir}/README.md`
  if (!existsSync(readme)) {
    problems.push(`${dir}  belum punya README.md`)
    continue
  }
  for (const row of readFileSync(readme, 'utf8').split('\n')) {
    const cell = row.match(/^\|\s*`?([\w.-]+\.(?:tsx?|md)|[\w-]+\/)`?\s*\|/)
    if (!cell) continue
    if (!existsSync(`${dir}/${cell[1]}`)) problems.push(`${readme}  menyebut ${cell[1]}, yang tidak ada`)
  }
}

if (problems.length > 0) {
  console.error(`Batas dilanggar (${problems.length}):\n` + problems.map((p) => '  ' + p).join('\n'))
  process.exit(1)
}
console.log('Arah impor dan catatan folder bersih.')
