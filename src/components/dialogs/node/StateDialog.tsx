import { useState } from 'react'
import { Dialog } from '../../shared/Dialog'
import { STATE_LABEL } from '../../../core/vocabulary'
import { useDocument } from '../../../state/room/DocumentProvider'
import type { NodeId, NodeState } from '../../../core/model/types'

export function StateDialog({ nodeId, onClose }: { nodeId: NodeId; onClose: () => void }) {
  const { run, doc } = useDocument()
  const [state, setState] = useState<NodeState>(doc.nodes[nodeId]?.state ?? 'open')
  const states: NodeState[] = ['open', 'doing', 'done', 'blocked']
  return (
    <Dialog
      title="Ubah status"
      description={doc.nodes[nodeId]?.title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => run({ type: 'setNodeState', id: nodeId, state }).ok && onClose()}
          >
            Simpan
          </button>
        </>
      }
    >
      <fieldset className="chips">
        <legend className="field-label">Status</legend>
        {states.map((s) => (
          <label key={s} className={`chip ${state === s ? 'is-on' : ''}`}>
            <input type="radio" name="state" checked={state === s} onChange={() => setState(s)} />
            {STATE_LABEL[s]}
          </label>
        ))}
      </fieldset>
    </Dialog>
  )
}
