/**
 * Ids are lexicographically sortable and roughly monotonic. The ordering is not
 * decorative: cycle repair breaks ties by picking the smallest id in the cycle,
 * so every device must agree on what "smallest" means.
 */

const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz'
let counter = Math.floor(Math.random() * 1296)

function base36(value: number, length: number): string {
  let out = ''
  let n = value
  while (n > 0) {
    out = ALPHABET[n % 36] + out
    n = Math.floor(n / 36)
  }
  return out.padStart(length, '0')
}

export function newId(prefix: string): string {
  counter = (counter + 1) % 1296
  const time = base36(Date.now(), 9)
  const seq = base36(counter, 2)
  const rand = base36(Math.floor(Math.random() * 1679616), 4)
  return `${prefix}_${time}${seq}${rand}`
}

export const newNodeId = () => newId('n')
export const newRelationId = () => newId('r')
export const newCommentId = () => newId('c')
export const newEventId = () => newId('e')
export const newDraftId = () => newId('d')
