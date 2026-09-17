/**
 * Making things without speaking.
 *
 * Trido has a vertical rail of pen, shape and text. We cannot copy that list --
 * rule 3 forbids free drawing, so a pen tool would be a button that produces
 * content the outline cannot read. What we copy is the *shape* of the thing:
 * the common act first, and a "..." that opens the rest.
 *
 * It lives inside the canvas toolbar rather than in a bar of its own. Two
 * floating cards stacked on the same corner were two things to look past before
 * reaching the board, and the board is what people came for (D25). The sheet is
 * portalled to the body because the toolbar scrolls sideways on a narrow window
 * and would otherwise clip its own menu.
 *
 * Every button here has a keyboard equivalent already, so this adds a route
 * rather than owning one (rule 6, D6b). The one real gap it closes is
 * templates: until now a person could only get a tool by converting a node they
 * had already made, which is a strange way to start a retro.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useDocument } from '../../state/room/DocumentProvider'
import { useView } from '../../state/room/ViewProvider'
import { useDialogs } from '../../state/dialogs/DialogProvider'
import { Icon } from '../shared/icons'
import { KIND_LABEL } from '../../core/vocabulary'
import { NODE_KINDS } from '../../core/rules/invariants'
import { TEMPLATES } from '../../core/templates/registry'
import type { NodeKind } from '../../core/model/types'

type Sheet = 'simpul' | 'templat' | null

export function ToolRail() {
  const { doc, run, insertTemplate } = useDocument()
  const { focusId } = useView()
  const dialogs = useDialogs()
  const [sheet, setSheet] = useState<Sheet>(null)
  const [at, setAt] = useState({ left: 0, top: 0 })
  const group = useRef<HTMLSpanElement>(null)
  const anchor = useRef<HTMLButtonElement>(null)

  // Placed against the button that opened it, measured once it exists.
  useLayoutEffect(() => {
    if (!sheet) return
    const box = anchor.current?.getBoundingClientRect()
    if (box) setAt({ left: box.left, top: box.bottom + 8 })
  }, [sheet])

  // A sheet that will not close is a sheet that covers the canvas forever.
  useEffect(() => {
    if (!sheet) return
    const onDown = (event: PointerEvent) => {
      const target = event.target as globalThis.Node
      if (group.current?.contains(target)) return
      if ((target as HTMLElement).closest?.('.rail-sheet')) return
      setSheet(null)
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
    business, and asking a person to aim would make this useless to anyone who
    cannot aim.
  */
  const focused = focusId ? doc.nodes[focusId] : null
  const parentId = focused?.id ?? null
  const parentTitle = focused?.title ?? doc.room.title

  const addNode = (kind: NodeKind) => {
    run({ type: 'createNode', parentId, kind, title: `${KIND_LABEL[kind]} baru` }, 'pointer')
    setSheet(null)
  }

  const toggle = (which: Exclude<Sheet, null>) =>
    setSheet((current) => (current === which ? null : which))

  return (
    <>
      <span className="rail-group" ref={group}>
        <button
          type="button"
          className={`icon-btn ${sheet === 'simpul' ? 'is-on' : ''}`}
          aria-expanded={sheet === 'simpul'}
          aria-haspopup="true"
          aria-label="Tambah simpul"
          title="Tambah simpul (n)"
          ref={sheet === 'simpul' ? anchor : undefined}
          onClick={() => toggle('simpul')}
        >
          <Icon name="plus" size={18} />
        </button>

        <button
          type="button"
          className="icon-btn"
          aria-label="Hubungkan simpul terfokus"
          title="Hubungkan simpul terfokus (r)"
          disabled={!focusId}
          onClick={() => focusId && dialogs.open({ kind: 'relate', nodeId: focusId })}
        >
          <Icon name="link" size={17} />
        </button>

        <button
          type="button"
          className="icon-btn"
          aria-label="Tulis komentar pada simpul terfokus"
          title="Tulis komentar (c)"
          disabled={!focusId}
          onClick={() => focusId && dialogs.open({ kind: 'comment', nodeId: focusId })}
        >
          <Icon name="message" size={17} />
        </button>

        <button
          type="button"
          className={`icon-btn ${sheet === 'templat' ? 'is-on' : ''}`}
          aria-expanded={sheet === 'templat'}
          aria-haspopup="true"
          aria-label="Alat dan templat"
          title="Alat dan templat (a)"
          ref={sheet === 'templat' ? anchor : undefined}
          onClick={() => toggle('templat')}
        >
          <Icon name="more" size={18} />
        </button>
      </span>

      {sheet &&
        createPortal(
          <div
            className={`rail-sheet ${sheet === 'simpul' ? 'rail-sheet-narrow' : ''}`}
            style={{ left: at.left, top: at.top }}
            role="group"
            aria-label={sheet === 'simpul' ? 'Tipe simpul baru' : 'Alat dan templat'}
          >
            {sheet === 'simpul' ? (
              <>
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
              </>
            ) : (
              <>
                <p className="rail-sheet-head">Alat &amp; templat</p>
                <ul className="rail-grid">
                  {TEMPLATES.map((template) => (
                    <li key={template.id}>
                      <button
                        type="button"
                        className="rail-card"
                        onClick={() => {
                          // Free-standing, always. A vote or a retro board is
                          // its own errand, and burying it under whatever
                          // happened to be selected makes the outline read out
                          // a relationship nobody meant. Wanting it attached is
                          // rarer than not, and there is already a gesture for
                          // it: drag the card onto the node it belongs to.
                          insertTemplate(template.id, null)
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
                  Berdiri sendiri di ruang. Seret kartunya ke sebuah simpul kalau memang mau
                  menempel di situ. Bisa dibatalkan sekali tekan.
                </p>
              </>
            )}
          </div>,
          document.body,
        )}
    </>
  )
}
