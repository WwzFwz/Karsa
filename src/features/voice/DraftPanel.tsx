/**
 * The draft panel: what the system heard, what it understood, and what it will
 * do -- before it does any of it (rule 8).
 *
 * Three outcomes get equal room, on purpose:
 *   - understood, shown as a checklist of operations
 *   - unsure, shown as a question with choices
 *   - not understood, shown as the plain words, editable
 *
 * The system never guesses on a shared canvas, so the third case must be a
 * first-class state and not an error toast.
 */

import { useState } from 'react'
import { QuestionCard } from './QuestionCard'
import { useRoom } from '../../app/RoomContext'
import { bilingual, tr } from '../../core/i18n'
import { useLang } from '../../ui/useLang'
import { Icon } from '../../ui/icons'
import { AGENTS, type Intent } from '../../core/agent/types'

const INTENT_LABEL: Record<Intent, string> = bilingual(
  { 'alat-diminta': 'Alat diminta langsung', 'alat-diusulkan': 'Alat diusulkan', susun: 'Isi biasa', ambigu: 'Perlu dipilih', 'tak-dikenali': 'Tidak dikenali', tanya: 'Perlu dijelaskan' },
  { 'alat-diminta': 'Tool asked for', 'alat-diusulkan': 'Tool suggested', susun: 'Ordinary content', ambigu: 'Needs a choice', 'tak-dikenali': 'Not recognised', tanya: 'Needs clarifying' },
)

export function DraftPanel() {
  const { draft, setDraft, applyDraft, discardDraft, talking, startTalking, stopTalking, submitText } =
    useRoom()
  const [typed, setTyped] = useState('')
  useLang()

  const accepted = draft.operations.filter((op) => op.accepted).length

  return (
    <section className="panel" aria-labelledby="draft-heading">
      <header className="panel-head">
        <h2 id="draft-heading">
          <Icon name="sparkles" size={15} />
          {tr('Pemeriksaan perintah', 'Command review')}
        </h2>
        <span className={`status-pill status-${draft.status}`}>{statusLabel(draft.status)}</span>
      </header>

      <p className="panel-note">
        {tr('Tidak ada yang berubah sampai Anda menekan Terapkan.', 'Nothing changes until you press Apply.')}
      </p>

      <div className="transcript">
        <span className="field-label">{tr('Yang didengar', 'What was heard')}</span>
        <p className="transcript-text">
          {draft.transcript || <em>{tr('Tahan Bicara atau tekan spasi.', 'Hold Talk or press space.')}</em>}
          {draft.status === 'listening' && <span className="caret" aria-hidden="true" />}
        </p>
      </div>

      {/*
        The same sentence, typed. Goes through exactly the understanding a
        spoken one does, so nobody needs a microphone to reach the assistant
        and a mishearing can be fixed by writing what was meant (rule 6).
      */}
      <form
        className="typed-command"
        onSubmit={(e) => {
          e.preventDefault()
          submitText(typed)
          setTyped('')
        }}
      >
        <label className="field-label" htmlFor="typed-command">
          {tr('Atau ketik perintahnya', 'Or type the command')}
        </label>
        <div className="typed-row">
          <input
            id="typed-command"
            className="text-input"
            value={typed}
            placeholder={draft.status === 'ready' ? tr('ya / batal, atau perintah baru', 'yes / cancel, or a new command') : tr('tambahkan gagasan ... di bawah ...', 'add an idea ... under ...')}
            onChange={(e) => setTyped(e.target.value)}
            onKeyDown={(e) => e.stopPropagation()}
            disabled={talking || draft.status === 'thinking' || draft.status === 'applying'}
          />
          <button type="submit" className="btn" disabled={!typed.trim() || talking}>
            {tr('Kirim', 'Send')}
          </button>
        </div>
      </form>

      {draft.status === 'thinking' && (
        <p className="thinking">
          <Icon name="sparkles" size={14} />
          {tr('Menyusun di perangkat ini.', 'Building on this device.')}
        </p>
      )}

      {/*
        Why it answered the way it did, before what it wants to do. An
        assistant that shows only its conclusion can only be obeyed or ignored;
        one that shows its routing can be corrected on the part that is wrong.
      */}
      {draft.status === 'ready' && draft.reason && (
        <p className={`routing routing-${draft.intent ?? 'susun'}`}>
          <Icon name={draft.intent === 'alat-diusulkan' ? 'sparkles' : 'target'} size={14} />
          <span>
            <strong>{INTENT_LABEL[draft.intent ?? 'susun']}.</strong> {draft.reason}
          </span>
        </p>
      )}

      {draft.operations.length > 0 && (
        <div className="draft-ops">
          <span className="field-label">{tr('Usulan operasi', 'Proposed operations')}</span>
          <ul className="op-list">
            {draft.operations.map((op) => (
              <li key={op.id} className="op-item">
                <label className="op-check">
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
                    {/* Which stage produced this. Named so a person can
                        disagree with one part instead of the whole answer. */}
                    {op.agent && (
                      <span className="op-agent">
                        <Icon name="sparkles" size={11} />
                        {AGENTS[op.agent].label}
                        {op.source && <span className="op-source">{op.source.label}</span>}
                        {op.extraCommands && op.extraCommands.length > 0 && (
                          <span className="op-source">
                            {op.extraCommands.length + 1} {tr('simpul, satu keputusan', 'nodes, one decision')}
                          </span>
                        )}
                      </span>
                    )}
                    <span className="op-preview">{op.preview}</span>
                    <span className={`confidence ${op.confidence < 0.6 ? 'is-low' : ''}`}>
                      <Icon name={op.confidence < 0.6 ? 'alert' : 'check'} size={12} />
                      {tr('keyakinan', 'confidence')} {Math.round(op.confidence * 100)} {tr('persen', 'percent')}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* What the assistant was told, verbatim. Section 8 promises structure
          rather than a screenshot; this is that promise made checkable. */}
      {draft.status === 'ready' && draft.context && (
        <details className="agent-context">
          <summary>{tr('Yang dikirim ke model', 'What was sent to the model')}</summary>
          <p className="panel-note">
            {tr('Struktur, bukan tangkapan layar. Tanpa audio.', 'Structure, not a screenshot. No audio.')}
          </p>
          <pre>{draft.context}</pre>
        </details>
      )}

      {draft.ambiguities.map((amb) => (
        <QuestionCard key={amb.id} amb={amb} />
      ))}

      {draft.rawText && (
        <div className="raw-text">
          <label className="field-label" htmlFor="raw-text">
            {tr('Tidak dikenali sebagai perintah', 'Not recognised as a command')}
          </label>
          <textarea
            id="raw-text"
            className="text-input"
            rows={3}
            value={draft.rawText}
            onChange={(e) => setDraft({ ...draft, rawText: e.target.value })}
          />
          <p className="field-help">
            {tr('Bisa disunting, lalu simpan sebagai simpul — atau biarkan.', 'Editable, then save as a node — or leave it.')}
          </p>
        </div>
      )}

      <div className="panel-actions">
        <button
          type="button"
          className={`btn ${talking ? 'is-on' : ''}`}
          onPointerDown={startTalking}
          onPointerUp={stopTalking}
          onPointerLeave={() => talking && stopTalking()}
        >
          <Icon name={talking ? 'mic' : 'micOff'} size={16} />
          {talking ? tr('Mendengarkan', 'Listening') : tr('Tahan untuk bicara', 'Hold to talk')}
        </button>
        <span className="topbar-spacer" />
        <button type="button" className="btn" onClick={discardDraft} disabled={draft.status === 'idle'}>
          <Icon name="x" size={16} />
          {tr('Batalkan', 'Cancel')}
        </button>
        <button type="button" className="btn btn-primary" onClick={applyDraft} disabled={accepted === 0}>
          <Icon name="check" size={16} />
          {tr('Terapkan', 'Apply')} {accepted > 0 ? accepted : ''}
        </button>
      </div>

      <p className="privacy-note">
        <Icon name="shield" size={13} />
        {tr('Diproses di perangkat ini. Jalur masukan yang tercatat:', 'Processed on this device. Input path recorded:')}{' '}
        {draft.via === 'keyboard' ? tr('papan ketik', 'keyboard') : tr('suara', 'voice')}.
      </p>
    </section>
  )
}

function statusLabel(status: string): string {
  switch (status) {
    case 'listening':
      return tr('Mendengarkan', 'Listening')
    case 'thinking':
      return tr('Memahami', 'Understanding')
    case 'ready':
      return tr('Menunggu persetujuan', 'Waiting for approval')
    case 'applied':
      return tr('Sudah diterapkan', 'Applied')
    case 'discarded':
      return tr('Dibatalkan', 'Discarded')
    default:
      return tr('Siap', 'Ready')
  }
}
