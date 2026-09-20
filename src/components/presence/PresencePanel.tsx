/**
 * Who is here, who is speaking, and what they are pointing at.
 *
 * Pointing is stored as a node id, never as a cursor position. That single
 * choice is what lets "yang ini" reach all three views: a ring on the canvas, a
 * description on the outline row, and a name in this list -- and it is also why
 * nothing about pointing violates rule 2.
 */

import { useDocument } from '../../state/room/DocumentProvider'
import { usePresence } from '../../state/room/PresenceProvider'
import { useView } from '../../state/room/ViewProvider'
import { MODE_LABEL } from '../shared/labels'
import { Icon } from '../shared/icons'
import { WaitingRoom } from '../rooms/WaitingRoom'
import { serverMode } from '../../services/rooms/rooms'
import { useRoomAccess } from '../../state/rooms/useRoomAccess'
import { tr } from '../../core/i18n'

export function PresencePanel() {
  const { doc, simulateConflict } = useDocument()
  const { participants, selfId, pointAt } = usePresence()
  const { setFocus, focusId } = useView()
  const online = participants
  // People at the door come before people in the room: they are the only ones
  // here who are waiting on a decision.
  const { access } = useRoomAccess()

  return (
    <section className="panel" aria-labelledby="presence-heading">
      <header className="panel-head">
        <h2 id="presence-heading">
          <Icon name="users" size={15} />{tr('Peserta', 'People')}</h2>
        <span className="pill pill-ok">{tr(`${online.length} hadir`, `${online.length} here`)}</span>
      </header>

      {/* Without a server nobody else can reach the room, so there is no door. */}
      {serverMode() && access && <WaitingRoom access={access} />}

      <h3 className="panel-sub">{tr('Di dalam ruang', 'In the room')}</h3>
      <ul className="people">
        {online.map((p) => {
          const pointed = p.pointingNodeId ? doc.nodes[p.pointingNodeId] : null
          const focused = p.focusNodeId ? doc.nodes[p.focusNodeId] : null
          return (
            <li key={p.actorId} className="person" style={{ ['--hue' as string]: String(p.hue) }}>
              <span className={`avatar ${p.talking ? 'is-talking' : ''}`} aria-hidden="true">
                {p.displayName.charAt(0)}
              </span>
              <div className="person-body">
                <p className="person-name">
                  {p.displayName}
                  {p.actorId === selfId && <span className="tag">{tr('Anda', 'You')}</span>}
                  {p.talking && (
                    <span className="tag tag-talking">
                      <Icon name="mic" size={11} />
                      bicara
                    </span>
                  )}
                  <span className="tag">
                    <Icon name={p.mode === 'meeting' ? 'presentation' : 'eye'} size={11} />
                    {MODE_LABEL[p.mode]}
                  </span>
                </p>
                <p className="person-where">
                  {pointed ? (
                    <>
                      <Icon name="pointer" size={12} />
                      Menunjuk{' '}
                      <button type="button" className="link" onClick={() => setFocus(pointed.id)}>
                        {pointed.title}
                      </button>
                    </>
                  ) : focused ? (
                    <>
                      <Icon name="target" size={12} />
                      Fokus di{' '}
                      <button type="button" className="link" onClick={() => setFocus(focused.id)}>
                        {focused.title}
                      </button>
                    </>
                  ) : (
                    tr('Belum menempati simpul mana pun', 'Not on any node yet')
                  )}
                </p>
              </div>
            </li>
          )
        })}
      </ul>

      <div className="panel-actions">
        <button type="button" className="btn btn-small" onClick={() => pointAt(focusId)} disabled={!focusId}>
          <Icon name="pointer" size={15} />{tr('Tunjuk simpul terfokus', 'Point at the focused node')}</button>
        <button type="button" className="btn btn-small" onClick={() => pointAt(null)}>
          <Icon name="x" size={15} />{tr('Berhenti menunjuk', 'Stop pointing')}</button>
      </div>

      <div className="danger-zone">
        <h3 className="panel-sub">{tr('Uji perilaku bentrok', 'Test conflict behaviour')}</h3>
        <p className="panel-note">
          {tr(
            'Yjs tidak punya operasi pindah yang aman. Tombol ini memaksa dua pemindahan bersilangan seperti yang terjadi setelah penggabungan, supaya pemulihannya bisa didengar dan dibaca, bukan sekadar dijelaskan.',
            'Yjs has no safe move operation. This button forces two crossing moves, the kind that happen after a merge, so the repair can be heard and read rather than merely described.',
          )}
        </p>
        <button type="button" className="btn btn-danger btn-small" onClick={simulateConflict}>
          <Icon name="alert" size={15} />{tr('Paksa pemindahan bersilangan', 'Force a crossing move')}</button>
      </div>
    </section>
  )
}
