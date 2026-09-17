import { useState } from 'react'
import { Dialog } from '../shared/Dialog'
import { useDocument } from '../../state/room/DocumentProvider'
import type { NodeId } from '../../core/model/types'

export function CommentDialog({ nodeId, onClose }: { nodeId: NodeId; onClose: () => void }) {
  const { run, doc } = useDocument()
  const [body, setBody] = useState('')
  return (
    <Dialog
      title="Tulis komentar"
      description={`Menempel pada ${doc.nodes[nodeId]?.title}.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!body.trim()}
            onClick={() =>
              run({ type: 'addComment', targetType: 'node', targetId: nodeId, body }).ok && onClose()
            }
          >
            Kirim
          </button>
        </>
      }
    >
      <label className="field-label" htmlFor="dlg-comment">
        Komentar
      </label>
      <textarea
        id="dlg-comment"
        className="text-input"
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
    </Dialog>
  )
}
