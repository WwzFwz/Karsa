/**
 * The dock: the agent's presence, floating over whatever view is open.
 *
 * Borrowed from Trido, which gets one thing very right -- the agent announces
 * that it is ready and then waits, in the same place you are looking, instead
 * of finishing quietly in a panel you have to go and find. Two pieces of that
 * are worth copying outright:
 *
 *   - a status line that names what the agent is doing right now, and
 *   - an honest elapsed-time counter instead of a spinner, colour-coded once it
 *     runs long. On-device speech recognition takes two to six seconds; a number
 *     that keeps moving reads as working, a spinner reads as broken.
 *
 * What is NOT borrowed is autonomy. Trido's agent moves a cursor and acts on the
 * board. Here the agent may only ever hand a person a proposal (rule 8), so the
 * dock always ends in Terapkan or Batalkan, never in a change that already
 * happened.
 *
 * The dock lives outside the three views on purpose. It is chrome, not a fourth
 * view: everything it produces lands in the document, which all three views then
 * read.
 */

import { useState } from 'react'
import { QuestionCard } from './QuestionCard'
import { useRoom } from '../../app/RoomContext'
import { tr } from '../../i18n/lang'
import { Icon } from '../../ui/icons'

function pace(seconds: number): { label: string; tone: string } {
  if (seconds > 12) return { label: 'agak lambat', tone: 'is-slow' }
  if (seconds > 5) return { label: 'wajar', tone: 'is-mid' }
  return { label: 'cepat', tone: 'is-fast' }
}

export function VoiceDock() {
  const {
    draft,
    thinkingSeconds,
    talking,
    startTalking,
    applyDraft,
    discardDraft,
    setDraft,
    traversing,
    toggleTraversal,
    traversalIndex,
    visibleIds,
    soundProfile,
    setSoundProfile,
    mode,
    setMode,
    undo,
    canUndo,
    canvasMounted,
    talkLatched,
    endTalkHold,
    linkingFrom,
  } = useRoom()
  const room = useRoom()

  // Folded away by choice, not by state: somebody who trusts the capture
  // should not have to keep reading it.
  const [quietTranscript, setQuietTranscript] = useState(false)

  const accepted = draft.operations.filter((op) => op.accepted).length
  const waiting = draft.status === 'ready'
  const busy = draft.status === 'listening' || draft.status === 'thinking'
  const tempo = pace(thinkingSeconds)

  const status = linkingFrom
    ? {
        text: tr('Pilih simpul tujuan', 'Pick the target node'),
        detail: tr('Klik simpul lain, atau Escape untuk membatalkan', 'Click another node, or Escape to cancel'),
        tone: 'is-wait',
      }
    : talking
    ? {
        text: tr('Mendengarkan', 'Listening'),
        detail:
          room.asrStatus.phase === 'loading' && room.asrMode !== 'contoh'
            ? `${tr('Merekam.', 'Recording.')} ${room.asrStatus.detail}`
            : talkLatched
              ? tr('Terkunci. Ketuk sekali lagi untuk berhenti.', 'Locked on. Tap again to stop.')
              : tr('Lepas tombol untuk berhenti', 'Release to stop'),
        tone: 'is-live',
      }
    : draft.status === 'thinking'
      ? { text: tr('Menyusun usulan', 'Building a proposal'), detail: tr('Di perangkat ini, tanpa mengirim audio', 'On this device, no audio sent'), tone: 'is-live' }
      : waiting
        ? {
            text: tr('Usulan sudah disiapkan', 'Proposal ready'),
            detail: tr('Ketuk Terapkan, atau ucapkan "ya"', 'Tap Apply, or say "yes"'),
            tone: 'is-wait',
          }
        : traversing
          ? { text: tr('Telusur audio', 'Audio browse'), detail: tr(`${traversalIndex + 1} dari ${visibleIds.length} simpul`, `${traversalIndex + 1} of ${visibleIds.length} nodes`), tone: 'is-live' }
          : { text: tr('Semua siap', 'All set'), detail: tr('Mode siaga, tidak ada yang direkam', 'Standing by, nothing is recorded'), tone: '' }

  return (
    <div className="dock-layer">
      {/*
        While recording, the words appear here on every page -- including the
        canvas, where they used to be hidden because the agent cursor was
        considered enough. It is not: the cursor says what will be *done*, and
        this says what was *heard*, and the gap between those two is exactly
        where a mishearing hides. Streaming it is also what makes three seconds
        of thinking feel like none (section 10).

        Once a proposal is standing, the canvas hands the job back to the cursor,
        which says the same thing at the place it will land.
      */}
      {(busy || (waiting && !canvasMounted)) && draft.transcript && (
        <div className={`floater transcript-float ${quietTranscript ? 'is-quiet' : ''}`}>
          <div className="floater-bar">
            <p className="floater-label">
              <Icon name="mic" size={12} />
              Transkripsi
            </p>
            <button
              type="button"
              className="floater-fold"
              aria-expanded={!quietTranscript}
              aria-label={quietTranscript ? 'Tampilkan transkripsi' : 'Sembunyikan transkripsi'}
              onClick={() => setQuietTranscript((current) => !current)}
            >
              <Icon name={quietTranscript ? 'chevronRight' : 'chevronDown'} size={15} />
            </button>
          </div>
          {!quietTranscript && (
            <p className="transcript-text">
              {draft.transcript}
              {draft.status === 'listening' && <span className="caret" aria-hidden="true" />}
            </p>
          )}
        </div>
      )}

      {waiting && !canvasMounted && (
        <div className="floater proposal-float">
          <div className="proposal-head">
            <span className="proposal-avatar" aria-hidden="true">
              <Icon name="sparkles" size={15} />
            </span>
            <div>
              <p className="proposal-title">Usulan sudah disiapkan</p>
              <p className="proposal-sub">
                Kanvas bersama belum berubah. Anda yang memutuskan.
              </p>
            </div>
          </div>

          {draft.operations.length > 0 && (
            <ul className="proposal-list">
              {draft.operations.map((op) => (
                <li key={op.id}>
                  <label className="proposal-check">
                    <input
                      type="checkbox"
                      checked={op.accepted}
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          operations: draft.operations.map((o) =>
                            o.id === op.id ? { ...o, accepted: e.target.checked } : o,
                          ),
                        })
                      }
                    />
                    <span>
                      {op.preview}
                      <span className={`confidence ${op.confidence < 0.6 ? 'is-low' : ''}`}>
                        keyakinan {Math.round(op.confidence * 100)} persen
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          {draft.ambiguities.map((amb) => (
            <QuestionCard key={amb.id} amb={amb} compact />
          ))}

          {draft.rawText && (
            <p className="proposal-raw">
              <Icon name="alert" size={14} />
              Tidak dikenali sebagai perintah. Ucapan disimpan apa adanya di panel Perintah dan bisa
              disunting.
            </p>
          )}

          <div className="proposal-actions">
            <button type="button" className="btn btn-small" onClick={discardDraft}>
              <Icon name="x" size={14} />
              Batalkan
            </button>
            <button
              type="button"
              className="btn btn-small btn-primary"
              onClick={applyDraft}
              disabled={accepted === 0}
            >
              <Icon name="check" size={14} />
              Terapkan {accepted > 0 ? accepted : ''}
            </button>
          </div>
        </div>
      )}

      <div className="dock">
        <div className={`dock-status ${status.tone}`}>
          <span className="dock-dot" aria-hidden="true" />
          <span>
            <span className="dock-status-text">{status.text}</span>
            <span className="dock-status-detail">{status.detail}</span>
          </span>
          {busy && (
            <span className={`dock-timer ${tempo.tone}`} aria-hidden="true">
              <Icon name="clock" size={11} />
              {thinkingSeconds}s · {tempo.label}
            </span>
          )}
        </div>

        <span className="dock-sep" aria-hidden="true" />

        {/* Equal size, side by side. One is how a person who cannot use their
            hands contributes; the other is how a person who cannot see follows. */}
        <button
          type="button"
          className={`dock-prime ${talking ? 'is-on' : ''}`}
          aria-pressed={talking}
          onPointerDown={startTalking}
          onPointerUp={endTalkHold}
        >
          <span className="dock-prime-icon" aria-hidden="true">
            <Icon name={talking ? 'mic' : 'micOff'} size={19} />
          </span>
          <span>
            <span className="dock-prime-label">
              {talking ? (talkLatched ? 'Terkunci' : 'Mendengarkan') : 'Bicara'}
            </span>
            <span className="dock-prime-hint">
              {talking ? 'ketuk untuk berhenti' : 'ketuk atau tahan'}
            </span>
          </span>
        </button>

        <button
          type="button"
          className={`dock-prime ${traversing ? 'is-on' : ''}`}
          aria-pressed={traversing}
          onClick={toggleTraversal}
        >
          <span className="dock-prime-icon" aria-hidden="true">
            <Icon name={traversing ? 'stop' : 'headphones'} size={19} />
          </span>
          <span>
            <span className="dock-prime-label">{traversing ? 'Hentikan' : 'Telusur audio'}</span>
            <span className="dock-prime-hint">titik untuk mulai</span>
          </span>
        </button>

        <span className="dock-sep" aria-hidden="true" />

        <button
          type="button"
          className="icon-btn"
          disabled={!canUndo}
          aria-label="Batalkan perubahan terakhir"
          title="Batalkan perubahan terakhir (Ctrl+Z)"
          onClick={undo}
        >
          <Icon name="undo" size={18} />
        </button>
        <button
          type="button"
          className={`icon-btn ${soundProfile !== 'silent' ? 'is-on' : ''}`}
          aria-pressed={soundProfile !== 'silent'}
          aria-label={soundProfile === 'silent' ? 'Nyalakan bunyi peristiwa' : 'Matikan bunyi peristiwa'}
          title={`Bunyi peristiwa (Ctrl+B) — ${soundProfile === 'silent' ? 'mati' : 'hidup'}`}
          onClick={() => setSoundProfile(soundProfile === 'silent' ? 'sparse' : 'silent')}
        >
          <Icon name={soundProfile === 'silent' ? 'volumeOff' : 'volume'} size={18} />
        </button>
        <button
          type="button"
          className={`icon-btn ${mode === 'review' ? 'is-on' : ''}`}
          aria-pressed={mode === 'review'}
          aria-label={mode === 'meeting' ? 'Beralih ke mode telaah' : 'Beralih ke mode rapat'}
          title={`${mode === 'meeting' ? 'Mode rapat' : 'Mode telaah'} (Ctrl+M)`}
          onClick={() => setMode(mode === 'meeting' ? 'review' : 'meeting')}
        >
          <Icon name={mode === 'meeting' ? 'presentation' : 'eye'} size={18} />
        </button>
      </div>
    </div>
  )
}
