import { useState } from 'react'
import { Dialog } from '../../shared/Dialog'
import { descendantsOf } from '../../../core/tree/project'
import { useDocument } from '../../../state/room/DocumentProvider'
import type { NodeId } from '../../../core/model/types'

export function DeleteDialog({ nodeId, onClose }: { nodeId: NodeId; onClose: () => void }) {
  const { run, doc, tree } = useDocument()
  const children = tree.byId.get(nodeId)?.childIds ?? []
  const all = descendantsOf(tree, nodeId)
  const [mode, setMode] = useState<'promote' | 'cascade'>('promote')
  return (
    <Dialog
      title="Hapus simpul"
      description={doc.nodes[nodeId]?.title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => run({ type: 'deleteNode', id: nodeId, mode }).ok && onClose()}
          >
            Hapus
          </button>
        </>
      }
    >
      {children.length === 0 ? (
        <p className="field-help">Simpul ini tidak punya anak.</p>
      ) : (
        <fieldset className="chips chips-stack">
          <legend className="field-label">Turunannya diapakan?</legend>
          <label className={`chip ${mode === 'promote' ? 'is-on' : ''}`}>
            <input type="radio" name="delmode" checked={mode === 'promote'} onChange={() => setMode('promote')} />
            Naikkan {children.length} anak ke induk di atasnya
          </label>
          <label className={`chip ${mode === 'cascade' ? 'is-on' : ''}`}>
            <input type="radio" name="delmode" checked={mode === 'cascade'} onChange={() => setMode('cascade')} />
            Hapus sekalian {all.length} turunannya
          </label>
        </fieldset>
      )}
    </Dialog>
  )
}
