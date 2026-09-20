import { useState } from 'react'
import { Dialog } from '../shared/Dialog'
import { SHAPE_HINT } from '../shared/labels'
import { SHAPE_LABEL } from '../../core/vocabulary'
import { useDocument } from '../../state/room/DocumentProvider'
import type { RoomShape } from '../../core/model/types'
import { tr } from '../../core/i18n'

export function ShapeDialog({ onClose }: { onClose: () => void }) {
  const { run, doc, suggestion } = useDocument()
  const [shape, setShape] = useState<RoomShape>(doc.room.shape)
  const shapes: RoomShape[] = ['mindmap', 'hierarchy', 'flow', 'timeline', 'columns']
  return (
    <Dialog
      title={tr('Bentuk kanvas', 'Canvas shape')}
      description={tr(
        'Bentuk adalah algoritma tata letak atas model yang sama. Menggantinya tidak mengubah isi, dan outline tidak ikut berubah.',
        'A shape is a layout algorithm over the same model. Changing it changes nothing in the content, and the outline stays as it was.',
      )}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>{tr('Batal', 'Cancel')}</button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => run({ type: 'setRoomShape', shape }).ok && onClose()}
          >{tr('Terapkan untuk semua', 'Apply for everyone')}</button>
        </>
      }
    >
      <p className="suggestion">
        <strong>{tr('Usulan sistem:', 'Suggested:')}</strong> {SHAPE_LABEL[suggestion.shape]}. {suggestion.reason} Sistem
        mengusulkan, orang yang menerapkan.
      </p>
      <fieldset className="chips chips-stack">
        <legend className="field-label">{tr('Pilih bentuk', 'Choose a shape')}</legend>
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
