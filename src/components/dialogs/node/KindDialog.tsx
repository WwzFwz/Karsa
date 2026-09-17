import { useState } from 'react'
import { Dialog } from '../../shared/Dialog'
import { useDocument } from '../../../state/room/DocumentProvider'
import { KindField } from '../fields'
import type { NodeId, NodeKind } from '../../../core/model/types'

export function KindDialog({ nodeId, onClose }: { nodeId: NodeId; onClose: () => void }) {
  const { run, doc } = useDocument()
  const [kind, setKind] = useState<NodeKind>(doc.nodes[nodeId]?.kind ?? 'idea')
  return (
    <Dialog
      title="Ubah tipe simpul"
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
            onClick={() => run({ type: 'setNodeKind', id: nodeId, kind }).ok && onClose()}
          >
            Simpan
          </button>
        </>
      }
    >
      <KindField value={kind} onChange={setKind} />
    </Dialog>
  )
}
