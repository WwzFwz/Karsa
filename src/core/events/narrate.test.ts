import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { narrate } from './narrate'
import type { EventType } from './types'
import { event } from '../testing/fixtures'
import { setLang } from '../i18n'

/*
  Rule 5: every operation has a sentence. Listing the types with
  `satisfies Record<EventType, true>` makes a new event type a compile error
  here until someone gives it a sentence.
*/
const ALL_TYPES = {
  createNode: true,
  renameNode: true,
  setNodeKind: true,
  setNodeState: true,
  setNodeNote: true,
  setNodeTool: true,
  voteNode: true,
  unvoteNode: true,
  moveNode: true,
  reorderNode: true,
  deleteNode: true,
  addRelation: true,
  removeRelation: true,
  relabelRelation: true,
  addComment: true,
  resolveComment: true,
  setRoomTitle: true,
  setRoomShape: true,
  cycleResolved: true,
  undo: true,
} satisfies Record<EventType, true>

for (const language of ['id', 'en'] as const) {
  describe(`rule 5: every event has a sentence (${language})`, () => {
    for (const type of Object.keys(ALL_TYPES) as EventType[]) {
      it(type, () => {
        setLang(language)
        const sentence = narrate(event(type, 'a1', { title: 'Uji', tool: 'suara' }), 'Ani')
        assert.ok(sentence.trim().length > 0)
        assert.ok(!sentence.includes('undefined'), sentence)
      })
    }
  })
}
