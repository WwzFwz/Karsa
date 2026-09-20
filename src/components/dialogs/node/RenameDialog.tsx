import { useState } from 'react'
import { Dialog } from '../../shared/Dialog'
import { useDocument } from '../../../state/room/DocumentProvider'
import { TitleField } from '../fields'
import type { NodeId } from '../../../core/model/types'
import { tr } from '../../../core/i18n'

export function RenameDialog({ nodeId, onClose }: { nodeId: NodeId; onClose: () => void }) {
  const { run, doc } = useDocument()
  const [title, setTitle] = useState(doc.nodes[nodeId]?.title ?? '')
  const submit = () => {
    if (run({ type: 'renameNode', id: nodeId, title }).ok) onClose()
  }
  return (
    <Dialog
      title={tr('Ubah judul', 'Rename')}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>{tr('Batal', 'Cancel')}</button>
          <button type="button" className="btn btn-primary" onClick={submit}>{tr('Simpan', 'Save')}</button>
        </>
      }
    >
      <TitleField value={title} onChange={setTitle} />
    </Dialog>
  )
}
