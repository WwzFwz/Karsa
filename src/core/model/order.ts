/**
 * Fractional indexing for sibling order.
 *
 * Inserting between two siblings must not renumber anything else -- with a
 * plain integer index, two people inserting at the same slot fight; with a
 * string key, they simply land next to each other and a stable tie-break on id
 * decides the winner. Nobody's node disappears either way.
 */

const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

function digitAt(key: string, i: number, fallback: number): number {
  if (i >= key.length) return fallback
  const found = DIGITS.indexOf(key[i])
  return found < 0 ? fallback : found
}

/** Smallest sensible key strictly greater than `lower`, unbounded above. */
function above(lower: string): string {
  let out = ''
  let i = 0
  for (;;) {
    const a = digitAt(lower, i, 0)
    if (DIGITS.length - a > 1) {
      return out + DIGITS[a + Math.floor((DIGITS.length - a) / 2)]
    }
    out += DIGITS[a]
    i += 1
  }
}

/** A key strictly between `lower` and `upper`. Either bound may be null. */
export function orderBetween(lower: string | null, upper: string | null): string {
  const lo = lower ?? ''
  const hi = upper ?? ''
  if (lo && hi && lo >= hi) {
    // Should not happen; degrade instead of throwing so the UI stays usable.
    return above(lo)
  }
  let out = ''
  let i = 0
  for (;;) {
    const a = digitAt(lo, i, 0)
    const b = i < hi.length ? digitAt(hi, i, DIGITS.length) : DIGITS.length
    if (b - a > 1) {
      return out + DIGITS[a + Math.floor((b - a) / 2)]
    }
    if (b - a === 1) {
      // The upper bound stops constraining below this digit.
      out += i < lo.length ? lo[i] : DIGITS[0]
      return out + above(lo.slice(i + 1))
    }
    out += DIGITS[a]
    i += 1
  }
}

/** Total order for siblings. Id breaks ties so every device agrees. */
export function compareSiblings(
  a: { order: string; id: string },
  b: { order: string; id: string },
): number {
  if (a.order === b.order) return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  return a.order < b.order ? -1 : 1
}
