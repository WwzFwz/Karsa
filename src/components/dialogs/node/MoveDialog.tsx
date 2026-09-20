import { useState, useMemo } from 'react'
import { Dialog } from '../../shared/Dialog'
import { NodePicker } from '../../shared/NodePicker'
import { descendantsOf } from '../../../core/tree/project'
import { useDocument } from '../../../state/room/DocumentProvider'
import type { NodeId } from '../../../core/model/types'
import { tr } from '../../../core/i18n'

export function MoveDialog({
  nodeId,
  presetParent,
  onClose,
}: {
  nodeId: NodeId
  presetParent?: NodeId
  onClose: () => void
}) {
  const { run, doc, tree } = useDocument()
  const [target, setTarget] = useState<NodeId | null>(
    presetParent ?? doc.nodes[nodeId]?.parentId ?? null,
  )
  // Rule 1: a node can never land inside its own subtree.
  const forbidden = useMemo(
    () => new Set<NodeId>([nodeId, ...descendantsOf(tree, nodeId)]),
    [tree, nodeId],
  )
  return (
    <Dialog
      title={tr('Pindahkan simpul', 'Move node')}
      description={
        presetParent
          ? tr(
              `${doc.nodes[nodeId]?.title} akan menjadi anak dari ${doc.nodes[presetParent]?.title}. Pindah mengubah pohon, jadi ia dikonfirmasi lebih dulu.`,
              `${doc.nodes[nodeId]?.title} will become a child of ${doc.nodes[presetParent]?.title}. A move changes the tree, so it is confirmed first.`,
            )
          : tr(
              `${doc.nodes[nodeId]?.title} akan menjadi anak dari induk yang dipilih.`,
              `${doc.nodes[nodeId]?.title} will become a child of the chosen parent.`,
            )
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>{tr('Batal', 'Cancel')}</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => run({ type: 'moveNode', id: nodeId, parentId: target }).ok && onClose()}
          >{tr('Pindahkan', 'Move')}</button>
        </>
      }
    >
      <NodePicker label={tr('Induk tujuan', 'New parent')} exclude={forbidden} allowRoot value={target} onChange={setTarget} />
    </Dialog>
  )
}
