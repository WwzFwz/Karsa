import { useState } from 'react'
import { Dialog } from '../../shared/Dialog'
import { useDocument } from '../../../state/room/DocumentProvider'
import { TitleField } from '../fields'
import type { NodeId } from '../../../core/model/types'

export function RenameDialog({ nodeId, onClose }: { nodeId: NodeId; onClose: () => void }) {
  const { run, doc } = useDocument()
  const [title, setTitle] = useState(doc.nodes[nodeId]?.title ?? '')
  const submit = () => {
    if (run({ type: 'renameNode', id: nodeId, title }).ok) onClose()
  }
  return (
    <Dialog
      title="Ubah judul"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            Simpan
          </button>
        </>
      }
    >
      <TitleField value={title} onChange={setTitle} />
    </Dialog>
  )
}
