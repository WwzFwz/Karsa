/**
 * Import direction, checked instead of hoped for.
 *
 *   core      -> core only. No React, no browser UI, no store.
 *   store     -> core only.
 *   the rest  -> anything below it.
 *
 * One exception, on purpose: core may import *types* from ui/icons, because
 * the tool and template registries name the icon each entry is drawn with.
 * A type import is erased at build time, so core still runs in node.
 *
 * No dependency: a boundary check that needs an install is one nobody runs.
 */

import { readdirSync, readFileSync } from 'node:fs'
import { join, posix, sep } from 'node:path'

const RULES = [
  { layer: 'src/core', may: ['src/core'], typeOnly: ['src/ui/icons'] },
  { layer: 'src/store', may: ['src/core', 'src/store'], typeOnly: [] },
]

const files = []
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path)
    else if (/[.](ts|tsx)$/.test(entry.name)) files.push(path.replaceAll(sep, '/'))
  }
}
walk('src')

const importRe = /^import\s+(type\s+)?[^'"]*?from\s+'([^']+)'/gm
const violations = []

for (const file of files) {
  const rule = RULES.find((r) => file.startsWith(r.layer + '/'))
  if (!rule) continue
  const text = readFileSync(file, 'utf8')
  for (const match of text.matchAll(importRe)) {
    const [, typeOnly, spec] = match
    const line = text.slice(0, match.index).split('\n').length
    if (spec === 'react' || spec.startsWith('react/') || spec === 'react-dom') {
      violations.push(`${file}:${line}  ${rule.layer} tidak boleh mengimpor React`)
      continue
    }
    if (!spec.startsWith('.')) continue
    const target = posix.normalize(posix.join(posix.dirname(file), spec))
    const inside = (roots) => roots.some((root) => target === root || target.startsWith(root + '/'))
    if (inside(rule.may)) continue
    if (typeOnly && inside(rule.typeOnly)) continue
    violations.push(`${file}:${line}  ${rule.layer} -> ${target}`)
  }
}

if (violations.length > 0) {
  console.error(`Arah impor dilanggar (${violations.length}):\n` + violations.map((v) => '  ' + v).join('\n'))
  process.exit(1)
}
console.log('Arah impor bersih.')
