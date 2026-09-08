/**
 * Every mutating operation has a dialog, and every dialog is reachable from a
 * shortcut. That is rule 6 in practice: the canvas cannot do anything the
 * outline cannot, because neither of them owns an operation -- this file does.
 */

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'
import { Dialog } from '../ui/Dialog'
import { Icon } from '../ui/icons'
import { NodePicker } from '../ui/NodePicker'
import { KIND_LABEL, RELATION_LABEL, SHAPE_LABEL, SHAPE_HINT, STATE_LABEL } from '../ui/labels'
import { NODE_KINDS, TITLE_MAX } from '../core/rules/invariants'
import { descendantsOf } from '../core/tree/project'
import type { NodeId, NodeKind, NodeState, RelationKind, RoomShape } from '../core/model/types'
import { useRoom } from './RoomContext'
import { findRoom } from '../features/rooms/rooms'
import { SCOPE_LABEL, SHORTCUTS_BY_SCOPE, type ShortcutScope } from '../a11y/keys'

export type DialogRequest =
  | { kind: 'create'; parentId: NodeId | null; afterId?: NodeId | null }
  | { kind: 'rename'; nodeId: NodeId }
  | { kind: 'setKind'; nodeId: NodeId }
  | { kind: 'setState'; nodeId: NodeId }
  | { kind: 'note'; nodeId: NodeId }
  | { kind: 'move'; nodeId: NodeId; presetParent?: NodeId }
  | { kind: 'relate'; nodeId: NodeId; presetTarget?: NodeId }
  | { kind: 'comment'; nodeId: NodeId }
  | { kind: 'delete'; nodeId: NodeId }
  | { kind: 'share' }
  | { kind: 'shape' }
  | { kind: 'help' }

interface DialogApi {
  open: (request: DialogRequest) => void
  close: () => void
  current: DialogRequest | null
}

const DialogContext = createContext<DialogApi | null>(null)

export function DialogProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<DialogRequest | null>(null)
  const api = useMemo<DialogApi>(
    () => ({ open: setCurrent, close: () => setCurrent(null), current }),
    [current],
  )
  return (
    <DialogContext.Provider value={api}>
      {children}
      {current && <DialogHost request={current} onClose={() => setCurrent(null)} />}
    </DialogContext.Provider>
  )
}

export function useDialogs(): DialogApi {
  const ctx = useContext(DialogContext)
  if (!ctx) throw new Error('useDialogs must be used inside DialogProvider')
  return ctx
}

function DialogHost({ request, onClose }: { request: DialogRequest; onClose: () => void }) {
  switch (request.kind) {
    case 'create':
      return <CreateDialog parentId={request.parentId} afterId={request.afterId} onClose={onClose} />
    case 'rename':
      return <RenameDialog nodeId={request.nodeId} onClose={onClose} />
    case 'setKind':
      return <KindDialog nodeId={request.nodeId} onClose={onClose} />
    case 'setState':
      return <StateDialog nodeId={request.nodeId} onClose={onClose} />
    case 'note':
      return <NoteDialog nodeId={request.nodeId} onClose={onClose} />
    case 'move':
      return (
        <MoveDialog nodeId={request.nodeId} presetParent={request.presetParent} onClose={onClose} />
      )
    case 'relate':
      return (
        <RelateDialog nodeId={request.nodeId} presetTarget={request.presetTarget} onClose={onClose} />
      )
    case 'comment':
      return <CommentDialog nodeId={request.nodeId} onClose={onClose} />
    case 'delete':
      return <DeleteDialog nodeId={request.nodeId} onClose={onClose} />
    case 'share':
      return <ShareDialog onClose={onClose} />
    case 'shape':
      return <ShapeDialog onClose={onClose} />
    case 'help':
      return <HelpDialog onClose={onClose} />
  }
}

function TitleField({
  value,
  onChange,
  label = 'Judul',
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

function KindField({ value, onChange }: { value: NodeKind; onChange: (k: NodeKind) => void }) {
  return (
    <fieldset className="chips">
      <legend className="field-label">Tipe</legend>
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

function CreateDialog({
  parentId,
  afterId,
  onClose,
}: {
  parentId: NodeId | null
  afterId?: NodeId | null
  onClose: () => void
}) {
  const { run, doc } = useRoom()
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<NodeKind>('idea')
  const parentTitle = parentId ? doc.nodes[parentId]?.title : 'akar ruang'

  const submit = () => {
    const result = run({ type: 'createNode', parentId, kind, title, afterId })
    if (result.ok) onClose()
  }

  return (
    <Dialog
      title="Tambah simpul"
      description={`Akan ditempatkan di bawah ${parentTitle}.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={!title.trim()}>
            Tambahkan
          </button>
        </>
      }
    >
      <TitleField value={title} onChange={setTitle} />
      <KindField value={kind} onChange={setKind} />
    </Dialog>
  )
}

function RenameDialog({ nodeId, onClose }: { nodeId: NodeId; onClose: () => void }) {
  const { run, doc } = useRoom()
  const [title, setTitle] = useState(doc.nodes[nodeId]?.title ?? '')
  const submit = () => {
    if (run({ type: 'renameNode', id: nodeId, title }).ok) onClose()
  }
  return (
    <Dialog
      title="Ubah judul"
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={submit}>
            Simpan
          </button>
        </>
      }
    >
      <TitleField value={title} onChange={setTitle} />
    </Dialog>
  )
}

function KindDialog({ nodeId, onClose }: { nodeId: NodeId; onClose: () => void }) {
  const { run, doc } = useRoom()
  const [kind, setKind] = useState<NodeKind>(doc.nodes[nodeId]?.kind ?? 'idea')
  return (
    <Dialog
      title="Ubah tipe simpul"
      description={doc.nodes[nodeId]?.title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => run({ type: 'setNodeKind', id: nodeId, kind }).ok && onClose()}
          >
            Simpan
          </button>
        </>
      }
    >
      <KindField value={kind} onChange={setKind} />
    </Dialog>
  )
}

function StateDialog({ nodeId, onClose }: { nodeId: NodeId; onClose: () => void }) {
  const { run, doc } = useRoom()
  const [state, setState] = useState<NodeState>(doc.nodes[nodeId]?.state ?? 'open')
  const states: NodeState[] = ['open', 'doing', 'done', 'blocked']
  return (
    <Dialog
      title="Ubah status"
      description={doc.nodes[nodeId]?.title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => run({ type: 'setNodeState', id: nodeId, state }).ok && onClose()}
          >
            Simpan
          </button>
        </>
      }
    >
      <fieldset className="chips">
        <legend className="field-label">Status</legend>
        {states.map((s) => (
          <label key={s} className={`chip ${state === s ? 'is-on' : ''}`}>
            <input type="radio" name="state" checked={state === s} onChange={() => setState(s)} />
            {STATE_LABEL[s]}
          </label>
        ))}
      </fieldset>
    </Dialog>
  )
}

function NoteDialog({ nodeId, onClose }: { nodeId: NodeId; onClose: () => void }) {
  const { run, doc } = useRoom()
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

function MoveDialog({
  nodeId,
  presetParent,
  onClose,
}: {
  nodeId: NodeId
  presetParent?: NodeId
  onClose: () => void
}) {
  const { run, doc, tree } = useRoom()
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

function RelateDialog({
  nodeId,
  presetTarget,
  onClose,
}: {
  nodeId: NodeId
  /** Filled in when the target was picked on the canvas first. */
  presetTarget?: NodeId
  onClose: () => void
}) {
  const { run, doc } = useRoom()
  const [target, setTarget] = useState<NodeId | null>(presetTarget ?? null)
  const [kind, setKind] = useState<RelationKind>('depends_on')
  const kinds: RelationKind[] = ['depends_on', 'causes', 'contradicts', 'refers_to', 'duplicates', 'sequence']
  return (
    <Dialog
      title="Hubungkan simpul"
      description={`Hubungan tambahan tidak memindahkan ${doc.nodes[nodeId]?.title} di dalam pohon. Outline tetap utuh.`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!target}
            onClick={() =>
              target && run({ type: 'addRelation', fromId: nodeId, toId: target, kind }).ok && onClose()
            }
          >
            Hubungkan
          </button>
        </>
      }
    >
      <fieldset className="chips">
        <legend className="field-label">Jenis hubungan</legend>
        {kinds.map((k) => (
          <label key={k} className={`chip ${kind === k ? 'is-on' : ''}`}>
            <input type="radio" name="relkind" checked={kind === k} onChange={() => setKind(k)} />
            {RELATION_LABEL[k]}
          </label>
        ))}
      </fieldset>
      <NodePicker label="Simpul tujuan" exclude={new Set([nodeId])} value={target} onChange={setTarget} />
    </Dialog>
  )
}

function CommentDialog({ nodeId, onClose }: { nodeId: NodeId; onClose: () => void }) {
  const { run, doc } = useRoom()
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

function DeleteDialog({ nodeId, onClose }: { nodeId: NodeId; onClose: () => void }) {
  const { run, doc, tree } = useRoom()
  const children = tree.byId.get(nodeId)?.childIds ?? []
  const all = descendantsOf(tree, nodeId)
  const [mode, setMode] = useState<'promote' | 'cascade'>('promote')
  return (
    <Dialog
      title="Hapus simpul"
      description={doc.nodes[nodeId]?.title}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Batal
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => run({ type: 'deleteNode', id: nodeId, mode }).ok && onClose()}
          >
            Hapus
          </button>
        </>
      }
    >
      {children.length === 0 ? (
        <p className="field-help">Simpul ini tidak punya anak.</p>
      ) : (
        <fieldset className="chips chips-stack">
          <legend className="field-label">Turunannya diapakan?</legend>
          <label className={`chip ${mode === 'promote' ? 'is-on' : ''}`}>
            <input type="radio" name="delmode" checked={mode === 'promote'} onChange={() => setMode('promote')} />
            Naikkan {children.length} anak ke induk di atasnya
          </label>
          <label className={`chip ${mode === 'cascade' ? 'is-on' : ''}`}>
            <input type="radio" name="delmode" checked={mode === 'cascade'} onChange={() => setMode('cascade')} />
            Hapus sekalian {all.length} turunannya
          </label>
        </fieldset>
      )}
    </Dialog>
  )
}

/**
 * Sharing is a code, not an invitation.
 *
 * There are no accounts to invite, so what gets handed over is the room code
 * itself -- readable aloud over a call, and typed on the join page by anyone.
 * The link is a convenience on top of it, never a replacement, because a link
 * cannot be spoken.
 */
function ShareDialog({ onClose }: { onClose: () => void }) {
  const { doc } = useRoom()
  const [copied, setCopied] = useState<'kode' | 'tautan' | null>(null)
  const link = `${window.location.origin}/ruang/${doc.room.id}`
  const locked = (findRoom(doc.room.id)?.access ?? 'terkunci') === 'terkunci'

  const copy = async (what: 'kode' | 'tautan') => {
    const text = what === 'kode' ? doc.room.id : link
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      window.setTimeout(() => setCopied(null), 2200)
    } catch {
      window.prompt('Salin:', text)
    }
  }

  return (
    <Dialog
      title="Bagikan ruang"
      description={
        locked
          ? 'Kode ini membawa orang ke depan pintu. Permintaan masuknya muncul di panel Peserta, dan kamu yang menerima.'
          : 'Siapa pun yang punya kodenya langsung bergabung. Tanpa akun, tanpa undangan.'
      }
      onClose={onClose}
      footer={
        <button type="button" className="btn btn-primary" onClick={onClose}>
          Selesai
        </button>
      }
    >
      <p className="field-label">Kode ruang</p>
      <div className="share-code">
        <span>{doc.room.id}</span>
        <button type="button" className="btn btn-small" onClick={() => copy('kode')}>
          <Icon name={copied === 'kode' ? 'check' : 'copy'} size={15} />
          {copied === 'kode' ? 'Tersalin' : 'Salin kode'}
        </button>
      </div>

      <p className="field-label" style={{ marginTop: 16 }}>
        Tautan
      </p>
      <div className="share-code is-quiet">
        <span>{link}</span>
        <button type="button" className="btn btn-small" onClick={() => copy('tautan')}>
          <Icon name={copied === 'tautan' ? 'check' : 'link'} size={15} />
          {copied === 'tautan' ? 'Tersalin' : 'Salin tautan'}
        </button>
      </div>

      <p className="panel-note" style={{ marginTop: 16, marginBottom: 0 }}>
        <Icon name={locked ? 'lock' : 'link'} size={14} />
        {locked
          ? 'Ruang terkunci. Kode lebih berguna daripada tautan saat rapat berjalan: ia bisa diucapkan, dan yang menunggu tetap kelihatan di panel Peserta.'
          : 'Ruang terbuka. Kode lebih berguna daripada tautan saat rapat sedang berjalan: ia bisa diucapkan.'}
      </p>
    </Dialog>
  )
}

function ShapeDialog({ onClose }: { onClose: () => void }) {
  const { run, doc, suggestion } = useRoom()
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

function HelpDialog({ onClose }: { onClose: () => void }) {
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
