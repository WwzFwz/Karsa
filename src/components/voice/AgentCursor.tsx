/**
 * The agent, present on the canvas.
 *
 * Taken from Trido's AgentCursor, which is the best idea in that product: the
 * assistant is not a panel somewhere else, it is a cursor standing at the place
 * it wants to change, saying what it is doing and waiting there for an answer.
 * A confirmation that appears where the work will land is understood instantly;
 * the same confirmation in a side panel has to be hunted for.
 *
 * Two things are ours rather than theirs:
 *
 *   - The cursor never acts. It points and asks. Applying is always a person's
 *     click or keystroke (rule 8, in its new form: reversible and narrated, and
 *     confirmed when hard to undo).
 *   - Everything the bubble says is also announced and also reachable from the
 *     dock, because a cursor on a canvas is worth nothing to someone who cannot
 *     see the canvas. This is decoration over a path that already exists, never
 *     the only way to answer.
 */

import { useAssistant } from '../../state/room/AssistantProvider'
import { QuestionCard } from './QuestionCard'
import { Icon } from '../shared/icons'
import type { Point } from '../../core/shape/layout'
import { tr } from '../../core/i18n'

function pace(seconds: number): { label: string; tone: string } {
  if (seconds > 12) return { label: 'agak lambat', tone: 'is-slow' }
  if (seconds > 5) return { label: 'wajar', tone: 'is-mid' }
  return { label: 'cepat', tone: 'is-fast' }
}

export function AgentCursor({
  at,
  targetTitle,
  flipX = false,
  flipY = false,
}: {
  at: Point
  targetTitle: string | null
  /** Bubble opens to the left / upward when it would otherwise run off the stage. */
  flipX?: boolean
  flipY?: boolean
}) {
  const { draft, thinkingSeconds, applyDraft, discardDraft, setDraft, agentAction } = useAssistant()

  const thinking = draft.status === 'thinking' || draft.status === 'listening'
  const ready = draft.status === 'ready'
  const applying = draft.status === 'applying'
  if (!thinking && !ready && !applying) return null

  const accepted = draft.operations.filter((op) => op.accepted).length
  const tempo = pace(thinkingSeconds)

  return (
    <div
      className={`agent ${ready ? 'is-ready' : ''} ${applying ? 'is-acting' : ''} ${
        flipX ? 'flip-x' : ''
      } ${flipY ? 'flip-y' : ''}`}
      style={{ transform: `translate(${at.x}px, ${at.y}px)` }}
    >
      <svg className="agent-arrow" width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3 3 10.5 20.5 13.5 13.5 20.5 10.5Z"
          fill="currentColor"
          stroke="var(--surface)"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>

      {thinking && (
        <span className="agent-chip" aria-hidden="true">
          <span className="agent-pulse" />
          {draft.status === 'listening' ? 'Mendengarkan' : 'Menyusun usulan'}
          <span className={`agent-time ${tempo.tone}`}>
            {thinkingSeconds}s · {tempo.label}
          </span>
        </span>
      )}

      {applying && agentAction && (
        <span className="agent-chip is-acting" aria-hidden="true">
          <span className="agent-pulse" />
          {agentAction}
        </span>
      )}

      {ready && (
        <div className="agent-bubble" role="group" aria-label={tr('Usulan dari asisten', 'Assistant suggestion')}>
          <p className="agent-bubble-head">
            <span className="agent-avatar" aria-hidden="true">
              <Icon name="sparkles" size={13} />
            </span>
            <span>
              <strong>{tr('Usulan sudah disiapkan', 'A suggestion is ready')}</strong>
              <span className="agent-bubble-sub">
                {targetTitle ? `Di sekitar "${targetTitle}".` : 'Di kanvas ini.'} Belum ada yang
                berubah.
              </span>
            </span>
          </p>

          {draft.operations.length > 0 && (
            <ul className="agent-ops">
              {draft.operations.map((op) => (
                <li key={op.id}>
                  <label>
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
            <p className="agent-raw">
              <Icon name="alert" size={13} />
              Tidak dikenali sebagai perintah. Teksnya tersimpan di panel Perintah.
            </p>
          )}

          <div className="agent-actions">
            <button type="button" className="btn btn-small" onClick={discardDraft}>{tr('Batalkan', 'Undo')} <kbd>Esc</kbd>
            </button>
            <button
              type="button"
              className="btn btn-small btn-primary"
              onClick={applyDraft}
              disabled={accepted === 0}
            >
              Terapkan {accepted > 0 ? accepted : ''} <kbd>Ctrl</kbd>
              <kbd>Enter</kbd>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
