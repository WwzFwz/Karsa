import { useState } from 'react'
import { Dialog } from '../shared/Dialog'
import { SHAPE_HINT } from '../shared/labels'
import { SHAPE_LABEL } from '../../core/vocabulary'
import { useDocument } from '../../state/room/DocumentProvider'
import type { RoomShape } from '../../core/model/types'

export function ShapeDialog({ onClose }: { onClose: () => void }) {
  const { run, doc, suggestion } = useDocument()
  const [shape, setShape] = useState<RoomShape>(doc.room.shape)
  const shapes: RoomShape[] = ['mindmap', 'hierarchy', 'flow', 'timeline', 'columns']
  return (
    <Dialog
      title="Bentuk kanvas"
      description="Bentuk adalah algoritma tata letak atas model yang sama. Menggantinya tidak mengubah isi, dan outline tidak ikut berubah."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => run({ type: 'setRoomShape', shape }).ok && onClose()}
          >
            Terapkan untuk semua
          </button>
        </>
      }
    >
      <p className="suggestion">
        <strong>Usulan sistem:</strong> {SHAPE_LABEL[suggestion.shape]}. {suggestion.reason} Sistem
        mengusulkan, orang yang menerapkan.
      </p>
      <fieldset className="chips chips-stack">
        <legend className="field-label">Pilih bentuk</legend>
        {shapes.map((s) => (
          <label key={s} className={`chip ${shape === s ? 'is-on' : ''}`}>
            <input type="radio" name="shape" checked={shape === s} onChange={() => setShape(s)} />
            <span>
              <strong>{SHAPE_LABEL[s]}</strong>
              <span className="chip-hint">{SHAPE_HINT[s]}</span>
            </span>
          </label>
        ))}
      </fieldset>
    </Dialog>
  )
}
