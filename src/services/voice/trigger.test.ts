import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { addressed } from './trigger'

/*
  The whole value of Mode Menyimak rests on this function. If it says yes too
  easily, an open microphone turns ordinary meeting talk into edits to a shared
  document; if it says no too easily, the mode looks broken. The cases below are
  sentences people actually say in a meeting, in both directions.
*/

describe('talking to Karsa', () => {
  it('reads a plain request addressed by name', () => {
    assert.deepEqual(addressed('Karsa, tambahkan pelatihan dosen'), {
      request: 'tambahkan pelatihan dosen',
      heard: 'karsa',
    })
  })

  it('allows a greeting in front of the name', () => {
    assert.equal(addressed('oke Karsa, buat papan retro')?.request, 'buat papan retro')
    assert.equal(addressed('hey Karsa can you add a step')?.request, 'add a step')
  })

  it('drops politeness that follows the name', () => {
    assert.equal(addressed('Karsa tolong hapus simpul itu')?.request, 'hapus simpul itu')
    assert.equal(addressed('Karsa coba bikin voting')?.request, 'bikin voting')
  })

  it('accepts the spellings the recogniser actually produces', () => {
    // Whisper writes the spoken name several ways; none of these is a word.
    for (const heard of ['Kursa', 'Carsa', 'Korsa', 'Kasra']) {
      assert.equal(addressed(`${heard}, tambahkan gagasan`)?.request, 'tambahkan gagasan', heard)
    }
  })
})

describe('talking in front of Karsa', () => {
  it('ignores a sentence that never says the name', () => {
    assert.equal(addressed('kita hapus saja bagian itu ya'), null)
    assert.equal(addressed("let's delete that part"), null)
  })

  it('ignores the name arriving late, even though people talk that way', () => {
    // Accepting a trailing name would mean any sentence that mentions the
    // product halfway through becomes a command.
    assert.equal(addressed('tambahkan ini ya Karsa'), null)
    assert.equal(addressed('menurut saya Karsa sudah cukup bagus'), null)
  })

  it('ignores the name on its own', () => {
    assert.equal(addressed('Karsa'), null)
    assert.equal(addressed('oke Karsa'), null)
    assert.equal(addressed('Karsa tolong'), null)
  })

  it('ignores an empty or silent utterance', () => {
    assert.equal(addressed(''), null)
    assert.equal(addressed('   '), null)
    assert.equal(addressed('...'), null)
  })

  it('is not fooled by a word that merely starts the same', () => {
    assert.equal(addressed('karsinogen itu bahaya'), null)
    assert.equal(addressed('kartu ini kita pindahkan'), null)
  })
})
