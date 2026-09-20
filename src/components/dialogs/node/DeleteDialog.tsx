import { useState } from 'react'
import { Dialog } from '../../shared/Dialog'
import { descendantsOf } from '../../../core/tree/project'
import { useDocument } from '../../../state/room/DocumentProvider'
import type { NodeId } from '../../../core/model/types'
import { tr } from '../../../core/i18n'

export function DeleteDialog({ nodeId, onClose }: { nodeId: NodeId; onClose: () => void }) {
  const { run, doc, tree } = useDocument()
  const children = tree.byId.get(nodeId)?.childIds ?? []
  const all = descendantsOf(tree, nodeId)
  const [mode, setMode] = useState<'promote' | 'cascade'>('promote')
  return (
    <Dialog
      title={tr('Hapus simpul', 'Delete node')}
      description={doc.nodes[nodeId]?.title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>{tr('Batal', 'Cancel')}</button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => run({ type: 'deleteNode', id: nodeId, mode }).ok && onClose()}
          >{tr('Hapus', 'Delete')}</button>
        </>
      }
    >
      {children.length === 0 ? (
        <p className="field-help">{tr('Simpul ini tidak punya anak.', 'This node has no children.')}</p>
      ) : (
        <fieldset className="chips chips-stack">
          <legend className="field-label">{tr('Turunannya diapakan?', 'What happens to its descendants?')}</legend>
          <label className={`chip ${mode === 'promote' ? 'is-on' : ''}`}>
            <input type="radio" name="delmode" checked={mode === 'promote'} onChange={() => setMode('promote')} />
            {tr(
              `Naikkan ${children.length} anak ke induk di atasnya`,
              `Lift its ${children.length} children to the parent above`,
            )}
          </label>
          <label className={`chip ${mode === 'cascade' ? 'is-on' : ''}`}>
            <input type="radio" name="delmode" checked={mode === 'cascade'} onChange={() => setMode('cascade')} />
            {tr(`Hapus sekalian ${all.length} turunannya`, `Delete all ${all.length} descendants too`)}
          </label>
        </fieldset>
      )}
    </Dialog>
  )
}
