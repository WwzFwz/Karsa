import { useState } from 'react'
import { Dialog } from '../../shared/Dialog'
import { NodePicker } from '../../shared/NodePicker'
import { RELATION_LABEL } from '../../../core/vocabulary'
import { useDocument } from '../../../state/room/DocumentProvider'
import type { NodeId, RelationKind } from '../../../core/model/types'
import { tr } from '../../../core/i18n'

export function RelateDialog({
  nodeId,
  presetTarget,
  onClose,
}: {
  nodeId: NodeId
  /** Filled in when the target was picked on the canvas first. */
  presetTarget?: NodeId
  onClose: () => void
}) {
  const { run, doc } = useDocument()
  const [target, setTarget] = useState<NodeId | null>(presetTarget ?? null)
  const [kind, setKind] = useState<RelationKind>('depends_on')
  const kinds: RelationKind[] = ['depends_on', 'causes', 'contradicts', 'refers_to', 'duplicates', 'sequence']
  return (
    <Dialog
      title={tr('Hubungkan simpul', 'Connect nodes')}
      description={tr(
        `Hubungan tambahan tidak memindahkan ${doc.nodes[nodeId]?.title} di dalam pohon. Outline tetap utuh.`,
        `An extra relation does not move ${doc.nodes[nodeId]?.title} within the tree. The outline stays as it is.`,
      )}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>{tr('Batal', 'Cancel')}</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!target}
            onClick={() =>
              target && run({ type: 'addRelation', fromId: nodeId, toId: target, kind }).ok && onClose()
            }
          >{tr('Hubungkan', 'Connect')}</button>
        </>
      }
    >
      <fieldset className="chips">
        <legend className="field-label">{tr('Jenis hubungan', 'Relation type')}</legend>
        {kinds.map((k) => (
          <label key={k} className={`chip ${kind === k ? 'is-on' : ''}`}>
            <input type="radio" name="relkind" checked={kind === k} onChange={() => setKind(k)} />
            {RELATION_LABEL[k]}
          </label>
        ))}
      </fieldset>
      <NodePicker label={tr('Simpul tujuan', 'Target node')} exclude={new Set([nodeId])} value={target} onChange={setTarget} />
    </Dialog>
  )
}
