import { Dialog } from '../shared/Dialog'
import { keyLabel, SCOPE_LABEL, SHORTCUTS_BY_SCOPE, type ShortcutScope } from '../../a11y/keys'
import { tr } from '../../core/i18n'

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const scopes: ShortcutScope[] = ['global', 'tree', 'draft']
  return (
    <Dialog
      title={tr('Pintasan papan ketik', 'Keyboard shortcuts')}
      description={tr(
        'Seluruh produk bisa dijalankan tanpa tetikus. Daftar ini dan berkas dokumentasinya berasal dari tabel yang sama.',
        'The whole product works without a mouse. This list and the documentation file come from the same table.',
      )}
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>{tr('Tutup', 'Close')}</button>
      }
    >
      {scopes.map((scope) => (
        <section key={scope} className="help-section">
          <h3>{SCOPE_LABEL[scope]}</h3>
          <dl className="help-list">
            {SHORTCUTS_BY_SCOPE[scope].map((s) => (
              <div key={s.id} className="help-row">
                <dt>
                  {s.keys.map((k) => (
                    <kbd key={k}>{keyLabel(k)}</kbd>
                  ))}
                </dt>
                <dd>
                  {s.label}
                  {s.mutates && <span className="tag tag-mutates">{tr('mengubah data', 'changes data')}</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </Dialog>
  )
}
