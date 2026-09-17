import { Dialog } from '../shared/Dialog'
import { SCOPE_LABEL, SHORTCUTS_BY_SCOPE, type ShortcutScope } from '../../a11y/keys'

export function HelpDialog({ onClose }: { onClose: () => void }) {
  const scopes: ShortcutScope[] = ['global', 'tree', 'draft']
  return (
    <Dialog
      title="Pintasan papan ketik"
      description="Seluruh produk bisa dijalankan tanpa tetikus. Daftar ini dan berkas dokumentasinya berasal dari tabel yang sama."
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Tutup
        </button>
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
                    <kbd key={k}>{k}</kbd>
                  ))}
                </dt>
                <dd>
                  {s.label}
                  {s.mutates && <span className="tag tag-mutates">mengubah data</span>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </Dialog>
  )
}
