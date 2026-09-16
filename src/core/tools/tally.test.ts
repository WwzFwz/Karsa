import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { countVotes, hasVoted } from './tally'
import { emptyDoc, event } from '../testing/fixtures'

/*
  D42: a vote is an event, and the tally is derived with "the last event per
  person wins". The case that proves why: someone changes their mind.
*/
describe('votes derived from the log', () => {
  it('counts the last word of each person, not every vote ever cast', () => {
    const doc = emptyDoc()
    doc.events = [
      event('voteNode', 'a1', { nodeId: 'x' }),
      event('voteNode', 'a2', { nodeId: 'x' }),
      event('unvoteNode', 'a2', { nodeId: 'x' }),
    ]
    assert.equal(countVotes(doc, 'x'), 1)
    assert.equal(hasVoted(doc, 'x', 'a1'), true)
    assert.equal(hasVoted(doc, 'x', 'a2'), false)
  })

  it('a vote cast again after withdrawing counts once', () => {
    const doc = emptyDoc()
    doc.events = [
      event('voteNode', 'a1', { nodeId: 'x' }),
      event('unvoteNode', 'a1', { nodeId: 'x' }),
      event('voteNode', 'a1', { nodeId: 'x' }),
    ]
    assert.equal(countVotes(doc, 'x'), 1)
  })
})
