/**
 * The horizontal rail: making things without speaking.
 *
 * Trido has a vertical rail of pen, shape and text. We cannot copy that list --
 * rule 3 forbids free drawing, so a pen tool would be a button that produces
 * content the outline cannot read. What we copy is the *shape* of the thing: a
 * small floating rail with the common act first and a "..." that opens the rest.
 *
 * What goes in it is the honest test: things with no other pointer route. Every
 * button here has a keyboard equivalent already, so this rail adds a route
 * rather than owning one (rule 6, D6b). The one real gap it closes is templates
 * -- until now a person could only get a tool by converting a node they had
 * already made, which is a strange way to start a retro.
 */

import { useEffect, useRef, useState } from 'react'
import { useRoom } from '../../app/RoomContext'
import { useDialogs } from '../../app/DialogContext'
import { Icon } from '../../ui/icons'
import { KIND_LABEL } from '../../ui/labels'
import { NODE_KINDS } from '../../core/rules/invariants'
import { TEMPLATES } from '../../core/templates/registry'
import type { NodeKind } from '../../core/model/types'

type Sheet = 'simpul' | 'templat' | null

export function ToolRail() {
  const room = useRoom()
  const dialogs = useDialogs()
  const { focusId, doc, run, insertTemplate } = room
  const [sheet, setSheet] = useState<Sheet>(null)
  const rail = useRef<HTMLDivElement>(null)

  // A sheet that will not close is a sheet that covers the canvas forever.
  useEffect(() => {
    if (!sheet) return
    const onDown = (event: PointerEvent) => {
      if (!rail.current?.contains(event.target as globalThis.Node)) setSheet(null)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSheet(null)
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [sheet])

  /*
    Everything lands under the focused node, or under the room root when nothing
    is focused. Never at a coordinate: where a thing sits is the layout's
    business, and asking a person to aim would make the rail useless to anyone
    who cannot aim.
  */
  const focused = focusId ? doc.nodes[focusId] : null
  const parentId = focused?.id ?? null
  const parentTitle = focused?.title ?? doc.room.title

  const addNode = (kind: NodeKind) => {
    run({ type: 'createNode', parentId, kind, title: `${KIND_LABEL[kind]} baru` }, 'pointer')
    setSheet(null)
  }

  return (
    <div className="tool-rail" ref={rail}>
      <div className="rail-bar" role="toolbar" aria-label="Alat kanvas">
        <button
          type="button"
          className={`rail-btn ${sheet === 'simpul' ? 'is-on' : ''}`}
          aria-expanded={sheet === 'simpul'}
          aria-haspopup="true"
          title="Tambah simpul (n)"
          onClick={() => setSheet((current) => (current === 'simpul' ? null : 'simpul'))}
        >
          <Icon name="plus" size={18} />
        </button>

        <button
          type="button"
          className="rail-btn"
          title="Hubungkan simpul terfokus (r)"
          disabled={!focusId}
          onClick={() => focusId && dialogs.open({ kind: 'relate', nodeId: focusId })}
        >
          <Icon name="link" size={17} />
        </button>

        <button
          type="button"
          className="rail-btn"
          title="Tulis komentar pada simpul terfokus (c)"
          disabled={!focusId}
          onClick={() => focusId && dialogs.open({ kind: 'comment', nodeId: focusId })}
        >
          <Icon name="message" size={17} />
        </button>

        <span className="rail-sep" aria-hidden="true" />

        <button
          type="button"
          className={`rail-btn ${sheet === 'templat' ? 'is-on' : ''}`}
          aria-expanded={sheet === 'templat'}
          aria-haspopup="true"
          title="Alat dan templat (a)"
          onClick={() => setSheet((current) => (current === 'templat' ? null : 'templat'))}
        >
          <Icon name="more" size={18} />
        </button>
      </div>

      {sheet === 'simpul' && (
        <div className="rail-sheet rail-sheet-narrow" role="group" aria-label="Tipe simpul baru">
          <p className="rail-sheet-head">Tambah di bawah {parentTitle}</p>
          <ul className="rail-kinds">
            {NODE_KINDS.filter((kind) => kind !== 'root').map((kind) => (
              <li key={kind}>
                <button type="button" className="rail-item" onClick={() => addNode(kind)}>
                  <Icon name="plus" size={14} />
                  {KIND_LABEL[kind]}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sheet === 'templat' && (
        <div className="rail-sheet" role="group" aria-label="Alat dan templat">
          <p className="rail-sheet-head">Alat &amp; templat · masuk di bawah {parentTitle}</p>
          <ul className="rail-grid">
            {TEMPLATES.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  className="rail-card"
                  onClick={() => {
                    insertTemplate(template.id, parentId)
                    setSheet(null)
                  }}
                >
                  <span className="rail-card-icon" aria-hidden="true">
                    <Icon name={template.icon} size={17} />
                  </span>
                  <span className="rail-card-label">{template.label}</span>
                  <span className="rail-card-hint">{template.hint}</span>
                </button>
              </li>
            ))}
          </ul>
          <p className="rail-note">
            Templat cuma sekumpulan simpul bertipe — bisa dibatalkan sekali tekan, dan terbaca di
            outline begitu mendarat.
          </p>
        </div>
      )}
    </div>
  )
}
