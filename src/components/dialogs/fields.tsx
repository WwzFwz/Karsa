/** Fields shared by the node dialogs. */

import { KIND_LABEL } from '../../core/vocabulary'
import { NODE_KINDS, TITLE_MAX } from '../../core/rules/invariants'
import type { NodeKind } from '../../core/model/types'
import { tr } from '../../core/i18n'

export function TitleField({
  value,
  onChange,
  label = tr('Judul', 'Title'),
}: {
  value: string
  onChange: (v: string) => void
  label?: string
}) {
  const over = value.trim().length > TITLE_MAX
  return (
    <>
      <label className="field-label" htmlFor="dlg-title">
        {label}
      </label>
      <input
        id="dlg-title"
        className="text-input"
        value={value}
        maxLength={TITLE_MAX + 20}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby="dlg-title-help"
        aria-invalid={over}
      />
      <p id="dlg-title-help" className={`field-help ${over ? 'is-error' : ''}`}>
        {value.trim().length} dari {TITLE_MAX} karakter. Judul harus bisa disebut dalam satu tarikan
        napas; uraian panjang masuk ke catatan.
      </p>
    </>
  )
}

export function KindField({ value, onChange }: { value: NodeKind; onChange: (k: NodeKind) => void }) {
  return (
    <fieldset className="chips">
      <legend className="field-label">{tr('Tipe', 'Type')}</legend>
      {NODE_KINDS.filter((k) => k !== 'root').map((k) => (
        <label key={k} className={`chip ${value === k ? 'is-on' : ''}`}>
          <input
            type="radio"
            name="kind"
            value={k}
            checked={value === k}
            onChange={() => onChange(k)}
          />
          {KIND_LABEL[k]}
        </label>
      ))}
    </fieldset>
  )
}
