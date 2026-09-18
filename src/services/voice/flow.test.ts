import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Command } from '../../core/commands/types'
import { LATCH_MS, VoiceFlow, type VoiceFlowDeps } from './flow'
import { emptyDraft } from './pipeline'
import type { Draft } from './types'

/*
  A room with a fake microphone, a fake model and a clock that only moves when
  the test says so. Every behaviour listed in the impact table for this refactor
  has a test here.
*/

const addIdea: Command = { type: 'createNode', parentId: null, kind: 'idea', title: 'Pelatihan dosen' }

function proposal(transcript: string, extra: Partial<Draft> = {}): Draft {
  return {
    ...emptyDraft(),
    status: 'ready',
    transcript,
    operations: [{ id: 'op_0', command: addIdea, preview: 'Tambah gagasan', confidence: 0.9, accepted: true }],
    ...extra,
  }
}

function question(): Draft {
  return {
    ...emptyDraft(),
    status: 'ready',
    transcript: 'hapus yang itu',
    ambiguities: [
      {
        id: 'amb_0',
        question: 'Simpul mana?',
        choices: [
          { id: 'c1', label: 'Kirim draf', commands: [addIdea] },
          { id: 'c2', label: 'Hubungi vendor', commands: [addIdea] },
        ],
      },
    ],
  }
}

function room(options: { model?: string } = { model: 'whisper' }) {
  let clock = 0
  const timers: { at: number; fn: () => void; live: boolean }[] = []
  const log = {
    announced: [] as string[],
    commands: [] as { command: Command; via: string }[],
    batches: [] as { commands: Command[]; via: string }[],
    errors: [] as string[],
    speaking: [] as boolean[],
  }
  const mic = {
    listening: false,
    ready: true,
    heard: { text: 'tambahkan gagasan pelatihan dosen' } as { text: string; error?: string },
    failWith: null as Error | null,
    cancelled: false,
    watching: false,
    utter: null as ((text: string) => void) | null,
    watchError: null as ((message: string) => void) | null,
  }
  const answers: { input: unknown; declined?: readonly string[]; resolve: (draft: Draft) => void }[] = []

  const deps: VoiceFlowDeps = {
    recogniser: {
      get listening() {
        return mic.listening
      },
      isReady: () => mic.ready,
      load: () => {},
      start: async () => {
        if (mic.failWith) throw mic.failWith
        mic.listening = true
      },
      stop: async () => {
        mic.listening = false
        return mic.heard
      },
      cancel: () => {
        mic.cancelled = true
      },
      /*
        Mode Menyimak with no microphone and no model: the test drives the
        detector by hand, calling `heard` when a sentence would have finished.
        What is under test is the rule about who was addressed, not the audio.
      */
      watch: async (handlers) => {
        mic.watching = true
        mic.utter = handlers.onUtterance
        mic.watchError = handlers.onError
      },
      unwatch: () => {
        mic.watching = false
        mic.utter = null
      },
    },
    asrModel: () => options.model,
    nextCannedUtterance: () => ({ transcript: 'kalimat contoh', build: () => ({ operations: [] }) }),
    understand: (input, _pending, declined) => new Promise((resolve) => answers.push({ input, declined, resolve })),
    runCommand: (command, via) => void log.commands.push({ command, via }),
    runBatch: (commands, via) => {
      log.batches.push({ commands, via })
      return { ok: true }
    },
    announce: (text) => void log.announced.push(text),
    earcon: () => {},
    setSpeaking: (active) => void log.speaking.push(active),
    reportError: (message) => void log.errors.push(message),
    now: () => clock,
    after: (ms, fn) => {
      const timer = { at: clock + ms, fn, live: true }
      timers.push(timer)
      return () => {
        timer.live = false
      }
    },
  }

  const flow = new VoiceFlow(deps)
  const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
  /** Moves time forward, firing each timer at its own moment, including ones scheduled on the way. */
  const advance = async (ms: number) => {
    const target = clock + ms
    for (;;) {
      const due = timers
        .filter((t) => t.live && t.at <= target)
        .sort((a, b) => a.at - b.at)[0]
      if (!due) break
      clock = due.at
      due.live = false
      due.fn()
    }
    clock = target
    await settle()
  }

  return { flow, log, mic, answers, advance, settle, status: () => flow.getState().draft.status }
}

describe('the talk switch (D4b)', () => {
  it('a short tap latches the microphone on, and a second tap ends the request', async () => {
    const r = room()
    r.flow.press()
    await r.advance(LATCH_MS - 100)
    r.flow.release()
    assert.equal(r.flow.getState().latched, true)
    assert.equal(r.flow.getState().talking, true)

    r.flow.press()
    await r.settle()
    assert.equal(r.flow.getState().talking, false)
    assert.equal(r.status(), 'thinking')
  })

  it('holding past the latch time behaves as push-to-talk', async () => {
    const r = room()
    r.flow.press()
    await r.advance(LATCH_MS + 100)
    r.flow.release()
    await r.settle()
    assert.equal(r.flow.getState().talking, false)
    assert.deepEqual(r.log.speaking, [true, false])
  })

  it('streams partial transcripts while listening', async () => {
    const r = room()
    r.flow.press()
    await r.settle()
    assert.equal(r.status(), 'listening')
  })
})

describe('from words to a proposal', () => {
  it('a heard sentence becomes a waiting proposal', async () => {
    const r = room()
    r.flow.press()
    await r.advance(LATCH_MS + 1)
    r.flow.release()
    await r.settle()
    r.answers[0].resolve(proposal('tambahkan gagasan pelatihan dosen'))
    await r.settle()
    assert.equal(r.status(), 'ready')
    assert.equal(r.flow.getState().draft.via, 'voice')
  })

  it('silence goes back to idle and says so', async () => {
    const r = room()
    r.mic.heard = { text: '', error: 'Tidak ada suara yang terekam.' }
    r.flow.press()
    await r.advance(LATCH_MS + 1)
    r.flow.release()
    await r.settle()
    assert.equal(r.status(), 'idle')
    assert.ok(r.log.announced.includes('Tidak ada suara yang terekam.'))
  })

  it('a typed sentence is recorded as keyboard, not voice (D68)', async () => {
    const r = room()
    r.flow.submitText('tambahkan gagasan pelatihan dosen')
    r.answers[0].resolve(proposal('x'))
    await r.settle()
    assert.equal(r.flow.getState().draft.via, 'keyboard')
  })

  it('a microphone that cannot open reports why and stops listening', async () => {
    const r = room()
    r.mic.failWith = new Error('Izin mikrofon ditolak.')
    r.flow.press()
    await r.settle()
    assert.equal(r.flow.getState().talking, false)
    assert.deepEqual(r.log.errors, ['Izin mikrofon ditolak.'])
  })
})

describe('the latest request wins', () => {
  it('drops a slow answer to a sentence that was already replaced', async () => {
    const r = room()
    r.flow.submitText('kalimat pertama')
    r.flow.submitText('kalimat kedua')
    r.answers[1].resolve(proposal('kalimat kedua'))
    await r.settle()
    r.answers[0].resolve(proposal('kalimat pertama'))
    await r.settle()
    assert.equal(r.flow.getState().draft.transcript, 'kalimat kedua')
  })

  it('drops an answer that arrives after the draft was discarded', async () => {
    const r = room()
    r.flow.submitText('kalimat')
    r.flow.discard()
    r.answers[0].resolve(proposal('kalimat'))
    await r.settle()
    assert.equal(r.status(), 'discarded')
  })
})

describe('answering a proposal (D4c)', () => {
  it('"ya" applies it, one step at a time (D23)', async () => {
    const r = room()
    r.flow.editDraft(proposal('x', { via: 'keyboard' }))
    r.flow.submitText('ya')
    assert.equal(r.status(), 'applying')
    assert.equal(r.log.commands.length, 0)
    await r.advance(280)
    assert.equal(r.log.commands.length, 1)
    assert.equal(r.log.commands[0].via, 'keyboard')
    assert.equal(r.status(), 'applied')
  })

  it('"batal" discards it and the canvas does not change', async () => {
    const r = room()
    r.flow.editDraft(proposal('x'))
    r.flow.submitText('batal')
    await r.advance(1000)
    assert.equal(r.status(), 'discarded')
    assert.equal(r.log.commands.length, 0)
  })

  it('a template lands as one batch, which is one undo (D44)', async () => {
    const r = room()
    const draft = proposal('x')
    draft.operations[0].extraCommands = [addIdea, addIdea]
    r.flow.editDraft(draft)
    r.flow.apply()
    await r.advance(280)
    assert.equal(r.log.batches.length, 1)
    assert.equal(r.log.batches[0].commands.length, 3)
  })

  it('unticked operations are skipped', async () => {
    const r = room()
    const draft = proposal('x')
    draft.operations[0].accepted = false
    r.flow.editDraft(draft)
    r.flow.apply()
    await r.advance(1000)
    assert.equal(r.log.commands.length, 0)
  })
})

describe('answering a question (D71)', () => {
  it('"yang kedua" picks the second option and applies it', async () => {
    const r = room()
    r.flow.editDraft(question())
    r.flow.submitText('yang kedua')
    assert.equal(r.log.batches.length, 1)
    assert.equal(r.status(), 'applied')
  })

  it('free words go back to the model together with the question', async () => {
    const r = room()
    r.flow.editDraft(question())
    r.flow.submitText('yang soal anggaran laboratorium')
    assert.equal(r.answers.length, 1)
    assert.equal(r.flow.getState().draft.transcript, 'hapus yang itu → yang soal anggaran laboratorium')
  })
})

describe('canned lines, for a room without a microphone', () => {
  it('plays the line word by word and understands it on release', async () => {
    const r = room()
    const flow = new VoiceFlow({ ...(r.flow as unknown as { deps: VoiceFlowDeps }).deps, asrModel: () => undefined })
    flow.press()
    await r.advance(200 + 130)
    assert.equal(flow.getState().draft.transcript, 'kalimat contoh')
    await r.advance(LATCH_MS)
    flow.release()
    assert.equal(flow.getState().draft.status, 'thinking')
  })
})

describe('leaving the room', () => {
  it('closes the microphone (D4)', () => {
    const r = room()
    r.flow.dispose()
    assert.equal(r.mic.cancelled, true)
  })
})

describe('a refused board is not offered again (D63)', () => {
  const offered = (transcript: string, id: string): Draft => ({
    ...emptyDraft(),
    status: 'ready',
    transcript,
    intent: 'alat-diusulkan',
    operations: [
      {
        id: 'op_0',
        command: addIdea,
        preview: 'Siapkan papan retro',
        confidence: 0.58,
        accepted: true,
        source: { kind: 'templat', id, label: 'Papan retro' },
      },
    ],
  })

  /** Speak once, take whatever the fake model is told to answer, then decide. */
  const offerThenDecide = async (r: ReturnType<typeof room>, draft: Draft, decide: 'discard' | 'apply') => {
    r.mic.heard = { text: draft.transcript }
    r.flow.press()
    await r.advance(LATCH_MS + 1)
    r.flow.release()
    await r.settle()
    r.answers.at(-1)!.resolve(draft)
    await r.settle()
    if (decide === 'discard') r.flow.discard()
    else r.flow.apply()
    await r.settle()
  }

  /** Say something else, and report what the planner was told had been refused. */
  const askAgain = async (r: ReturnType<typeof room>, text: string) => {
    r.mic.heard = { text }
    r.flow.press()
    await r.advance(LATCH_MS + 1)
    r.flow.release()
    await r.settle()
    return r.answers.at(-1)!.declined ?? []
  }

  it('carries the refusal into the next sentence', async () => {
    const r = room()
    await offerThenDecide(r, offered('apa yang jalan sprint ini', 'retro'), 'discard')
    assert.deepEqual([...(await askAgain(r, 'apa lagi yang belum kelar'))], ['retro'])
  })

  it('keeps quiet about a board that was named out loud', async () => {
    const r = room()
    await offerThenDecide(r, offered('tolong buka papan retro', 'retro'), 'discard')
    // Refusing this retro answers this sentence; it is not a ban on the word.
    assert.deepEqual([...(await askAgain(r, 'apa lagi yang belum kelar'))], [])
  })

  it('counts a refused option in a question too', async () => {
    const r = room()
    const asked: Draft = {
      ...emptyDraft(),
      status: 'ready',
      transcript: 'mana yang duluan dikerjakan',
      intent: 'tanya',
      ambiguities: [
        {
          id: 'amb_0',
          question: 'Mau pakai alat?',
          choices: [
            { id: 'voting', label: 'Pakai alat pemungutan suara', commands: [addIdea] },
            { id: 'pilihan_1', label: 'Catat sebagai gagasan', commands: [addIdea] },
          ],
        },
      ],
    }
    await offerThenDecide(r, asked, 'discard')
    // Only the tool is remembered; `pilihan_1` is not a board anybody can refuse.
    assert.deepEqual([...(await askAgain(r, 'lanjut ke hal lain'))], ['voting'])
  })

  it('forgets nothing when the offer was accepted', async () => {
    const r = room()
    await offerThenDecide(r, offered('apa yang jalan sprint ini', 'retro'), 'apply')
    assert.deepEqual([...(await askAgain(r, 'apa lagi yang belum kelar'))], [])
  })
})

describe('Mode Menyimak (D4, deliberate always-on)', () => {
  /** Speak a whole sentence into the open microphone. */
  const say = async (r: ReturnType<typeof room>, text: string) => {
    r.mic.utter?.(text)
    await r.settle()
  }

  it('opens the microphone only when switched on, and closes it again', async () => {
    const r = room()
    assert.equal(r.flow.getState().watching, false)
    r.flow.startWatching()
    await r.settle()
    assert.equal(r.flow.getState().watching, true)
    assert.equal(r.mic.watching, true)

    r.flow.stopWatching()
    await r.settle()
    assert.equal(r.flow.getState().watching, false)
    assert.equal(r.mic.watching, false)
  })

  it('acts only on sentences addressed by name', async () => {
    const r = room()
    r.flow.startWatching()
    await r.settle()

    // Ordinary meeting talk. The room must not edit itself because of this.
    await say(r, 'kita hapus saja bagian anggaran itu ya')
    assert.equal(r.answers.length, 0)
    assert.equal(r.flow.getState().overheard, 'kita hapus saja bagian anggaran itu ya')
    assert.equal(r.status(), 'idle')

    // Addressed: the name is stripped and only the request is understood.
    await say(r, 'Karsa, tambahkan gagasan pelatihan dosen')
    assert.equal(r.answers.length, 1)
    assert.equal(r.answers[0].input, 'tambahkan gagasan pelatihan dosen')
    assert.equal(r.flow.getState().overheard, null)
  })

  it('reports what it overheard rather than hiding it', async () => {
    // Dropping it silently would make the mode look broken; acting on it would
    // make the room unusable. Showing it is the only honest third option.
    const r = room()
    r.flow.startWatching()
    await r.settle()
    await say(r, 'menurut saya anggarannya kurang')
    assert.equal(r.flow.getState().overheard, 'menurut saya anggarannya kurang')
    await say(r, 'Karsa, buat papan retro')
    assert.equal(r.flow.getState().overheard, null)
  })

  it('refuses to start when this device plays canned lines', async () => {
    const r = room({ model: undefined })
    r.flow.startWatching()
    await r.settle()
    assert.equal(r.flow.getState().watching, false)
    assert.equal(r.log.errors.length, 1)
  })

  it('closes the microphone when the room is left mid-sentence', async () => {
    const r = room()
    r.flow.startWatching()
    await r.settle()
    r.flow.dispose()
    assert.equal(r.mic.watching, false)
  })
})
