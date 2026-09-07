/**
 * Who is here, who is speaking, and what they are pointing at.
 *
 * Pointing is stored as a node id, never as a cursor position. That single
 * choice is what lets "yang ini" reach all three views: a ring on the canvas, a
 * description on the outline row, and a name in this list -- and it is also why
 * nothing about pointing violates rule 2.
 */

import { useRoom } from '../../app/RoomContext'
import { MODE_LABEL } from '../../ui/labels'
import { Icon } from '../../ui/icons'

export function PresencePanel() {
  const { participants, selfId, doc, setFocus, pointAt, focusId, simulateConflict } = useRoom()
  const online = participants.filter((p) => p.online)
  const offline = participants.filter((p) => !p.online)

  return (
    <section className="panel" aria-labelledby="presence-heading">
      <header className="panel-head">
        <h2 id="presence-heading">
          <Icon name="users" size={15} />
          Peserta
        </h2>
        <span className="pill pill-ok">{online.length} hadir</span>
      </header>

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
                  {p.actorId === selfId && <span className="tag">Anda</span>}
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
                    'Belum menempati simpul mana pun'
                  )}
                </p>
              </div>
            </li>
          )
        })}
      </ul>

      {offline.length > 0 && (
        <>
          <h3 className="panel-sub">Pernah hadir</h3>
          <ul className="people is-dim">
            {offline.map((p) => (
              <li key={p.actorId} className="person" style={{ ['--hue' as string]: String(p.hue) }}>
                <span className="avatar is-off" aria-hidden="true">
                  {p.displayName.charAt(0)}
                </span>
                <div className="person-body">
                  <p className="person-name">{p.displayName}</p>
                  <p className="person-where">
                    <Icon name="wifiOff" size={12} />
                    Terputus
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <div className="panel-actions">
        <button type="button" className="btn btn-small" onClick={() => pointAt(focusId)} disabled={!focusId}>
          <Icon name="pointer" size={15} />
          Tunjuk simpul terfokus
        </button>
        <button type="button" className="btn btn-small" onClick={() => pointAt(null)}>
          <Icon name="x" size={15} />
          Berhenti menunjuk
        </button>
      </div>

      <div className="danger-zone">
        <h3 className="panel-sub">Uji perilaku bentrok</h3>
        <p className="panel-note">
          Yjs tidak punya operasi pindah yang aman. Tombol ini memaksa dua pemindahan bersilangan
          seperti yang terjadi setelah penggabungan, supaya pemulihannya bisa didengar dan dibaca,
          bukan sekadar dijelaskan.
        </p>
        <button type="button" className="btn btn-danger btn-small" onClick={simulateConflict}>
          <Icon name="alert" size={15} />
          Paksa pemindahan bersilangan
        </button>
      </div>
    </section>
  )
}
