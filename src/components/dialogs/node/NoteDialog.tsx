import { useState } from 'react'
import { Dialog } from '../../shared/Dialog'
import { useDocument } from '../../../state/room/DocumentProvider'
import type { NodeId } from '../../../core/model/types'

export function NoteDialog({ nodeId, onClose }: { nodeId: NodeId; onClose: () => void }) {
  const { run, doc } = useDocument()
  const [note, setNote] = useState(doc.nodes[nodeId]?.note ?? '')
  return (
    <Dialog
      title="Catatan"
      description={`Uraian panjang untuk ${doc.nodes[nodeId]?.title}. Dibaca di outline, tidak digambar di kanvas.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => run({ type: 'setNodeNote', id: nodeId, note }).ok && onClose()}
          >
            Simpan
          </button>
        </>
      }
    >
      <label className="field-label" htmlFor="dlg-note">
        Isi catatan
      </label>
      <textarea
        id="dlg-note"
        className="text-input"
        rows={5}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
    </Dialog>
  )
}
