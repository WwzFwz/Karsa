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

import { useRoom } from '../../app/RoomContext'
import { Icon } from '../../ui/icons'
import { AGENTS, type Intent } from '../../core/agent/types'

const INTENT_LABEL: Record<Intent, string> = {
  'alat-diminta': 'Alat diminta langsung',
  'alat-diusulkan': 'Alat diusulkan',
  susun: 'Isi biasa',
  ambigu: 'Perlu dipilih',
  'tak-dikenali': 'Tidak dikenali',
}

export function DraftPanel() {
  const { draft, setDraft, applyDraft, discardDraft, run, talking, startTalking, stopTalking } =
    useRoom()

  const accepted = draft.operations.filter((op) => op.accepted).length

  return (
    <section className="panel" aria-labelledby="draft-heading">
      <header className="panel-head">
        <h2 id="draft-heading">
          <Icon name="sparkles" size={15} />
          Pemeriksaan perintah
        </h2>
        <span className={`status-pill status-${draft.status}`}>{statusLabel(draft.status)}</span>
      </header>

      <p className="panel-note">
        Perintah suara selalu berhenti di sini dulu. Kanvas bersama tidak berubah sampai Anda
        menekan Terapkan.
      </p>

      <div className="transcript">
        <span className="field-label">Yang didengar</span>
        <p className="transcript-text">
          {draft.transcript || <em>Belum ada ucapan. Tahan tombol Bicara atau tekan spasi.</em>}
          {draft.status === 'listening' && <span className="caret" aria-hidden="true" />}
        </p>
      </div>

      {draft.status === 'thinking' && (
        <p className="thinking">
          <Icon name="sparkles" size={14} />
          Menyusun operasi di perangkat ini. Tidak ada audio yang dikirim keluar.
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
          <span className="field-label">Usulan operasi</span>
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
                            {op.extraCommands.length + 1} simpul, satu keputusan
                          </span>
                        )}
                      </span>
                    )}
                    <span className="op-preview">{op.preview}</span>
                    <span className={`confidence ${op.confidence < 0.6 ? 'is-low' : ''}`}>
                      <Icon name={op.confidence < 0.6 ? 'alert' : 'check'} size={12} />
                      keyakinan {Math.round(op.confidence * 100)} persen
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
          <summary>Yang dikirim ke model</summary>
          <p className="panel-note">
            Struktur, bukan tangkapan layar — dan tidak ada audio. Semuanya tetap di perangkat ini.
          </p>
          <pre>{draft.context}</pre>
        </details>
      )}

      {draft.ambiguities.map((amb) => (
        <div className="ambiguity" key={amb.id}>
          <p className="ambiguity-q">
            <Icon name="help" size={16} />
            {amb.question}
          </p>
          <p className="panel-note">
            Sistem tidak menebak pada kanvas milik bersama. Pilih satu, atau batalkan.
          </p>
          <div className="ambiguity-choices">
            {amb.choices.map((choice) => (
              <button
                key={choice.id}
                type="button"
                className="btn"
                onClick={() => {
                  run(choice.command, 'voice')
                  setDraft({ ...draft, ambiguities: draft.ambiguities.filter((a) => a.id !== amb.id) })
                }}
              >
                <Icon name="pointer" size={15} />
                {choice.label}
              </button>
            ))}
          </div>
        </div>
      ))}

      {draft.rawText && (
        <div className="raw-text">
          <label className="field-label" htmlFor="raw-text">
            Tidak dikenali sebagai perintah
          </label>
          <textarea
            id="raw-text"
            className="text-input"
            rows={3}
            value={draft.rawText}
            onChange={(e) => setDraft({ ...draft, rawText: e.target.value })}
          />
          <p className="field-help">
            Ucapan disimpan apa adanya dan bisa disunting. Kalau ini memang sebuah gagasan, simpan
            sebagai simpul baru. Kalau bukan, biarkan.
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
          {talking ? 'Mendengarkan' : 'Tahan untuk bicara'}
        </button>
        <span className="topbar-spacer" />
        <button type="button" className="btn" onClick={discardDraft} disabled={draft.status === 'idle'}>
          <Icon name="x" size={16} />
          Batalkan
        </button>
        <button type="button" className="btn btn-primary" onClick={applyDraft} disabled={accepted === 0}>
          <Icon name="check" size={16} />
          Terapkan {accepted > 0 ? accepted : ''}
        </button>
      </div>

      <p className="privacy-note">
        <Icon name="shield" size={13} />
        Diproses di perangkat ini. Jalur masukan yang tercatat: suara.
      </p>
    </section>
  )
}

function statusLabel(status: string): string {
  switch (status) {
    case 'listening':
      return 'Mendengarkan'
    case 'thinking':
      return 'Memahami'
    case 'ready':
      return 'Menunggu persetujuan'
    case 'applied':
      return 'Sudah diterapkan'
    case 'discarded':
      return 'Dibatalkan'
    default:
      return 'Siap'
  }
}
