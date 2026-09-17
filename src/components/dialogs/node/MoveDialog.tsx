import { useState, useMemo } from 'react'
import { Dialog } from '../../shared/Dialog'
import { NodePicker } from '../../shared/NodePicker'
import { descendantsOf } from '../../../core/tree/project'
import { useDocument } from '../../../state/room/DocumentProvider'
import type { NodeId } from '../../../core/model/types'

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
      title="Pindahkan simpul"
      description={
        presetParent
          ? `${doc.nodes[nodeId]?.title} akan menjadi anak dari ${doc.nodes[presetParent]?.title}. Pindah mengubah pohon, jadi ia dikonfirmasi lebih dulu.`
          : `${doc.nodes[nodeId]?.title} akan menjadi anak dari induk yang dipilih.`
      }
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => run({ type: 'moveNode', id: nodeId, parentId: target }).ok && onClose()}
          >
            Pindahkan
          </button>
        </>
      }
    >
      <NodePicker label="Induk tujuan" exclude={forbidden} allowRoot value={target} onChange={setTarget} />
    </Dialog>
  )
}
