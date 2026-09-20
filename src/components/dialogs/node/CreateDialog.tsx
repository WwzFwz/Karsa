import { useState } from 'react'
import { Dialog } from '../../shared/Dialog'
import { useDocument } from '../../../state/room/DocumentProvider'
import { TitleField, KindField } from '../fields'
import type { NodeId, NodeKind } from '../../../core/model/types'
import { tr } from '../../../core/i18n'

export function CreateDialog({
  parentId,
  afterId,
  onClose,
}: {
  parentId: NodeId | null
  afterId?: NodeId | null
  onClose: () => void
}) {
  const { run, doc } = useDocument()
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<NodeKind>('idea')
  const parentTitle = parentId ? doc.nodes[parentId]?.title : 'akar ruang'

  const submit = () => {
    const result = run({ type: 'createNode', parentId, kind, title, afterId })
    if (result.ok) onClose()
  }

  return (
    <Dialog
      title={tr('Tambah simpul', 'Add node')}
      description={tr(`Akan ditempatkan di bawah ${parentTitle}.`, `It will be placed under ${parentTitle}.`)}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>{tr('Batal', 'Cancel')}</button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!title.trim()}>{tr('Tambahkan', 'Add')}</button>
        </>
      }
    >
      <TitleField value={title} onChange={setTitle} />
      <KindField value={kind} onChange={setKind} />
    </Dialog>
  )
}
