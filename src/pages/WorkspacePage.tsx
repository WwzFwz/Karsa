/**
 * One workspace, not a stack of tabs.
 *
 * The earlier version had five tabs, and the canvas tab carried an Outline
 * panel and a change log that were *also* tabs of their own. That is the same
 * content in two places, and it leaves a person guessing which copy is the real
 * one. Worse, it hid the actual proposition: the canvas and the outline are the
 * same model, and the fastest way to say so is to put them side by side.
 *
 * So there are three arrangements of one room -- canvas, split, outline -- and a
 * single inspector on the right whose contents you switch. Each thing appears
 * exactly once. The URL still names each arrangement, so every screen is its own
 * link.
 */

import { useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CanvasView } from '../views/canvas/CanvasView'
import { OutlineTree } from '../views/outline/OutlineTree'
import { EventLog } from '../features/summary/EventLog'
import { DraftPanel } from '../features/voice/DraftPanel'
import { PresencePanel } from '../features/presence/PresencePanel'
import { CommentsPanel } from '../features/comments/CommentsPanel'
import { useRoom } from '../app/RoomContext'
import { useDialogs } from '../app/DialogContext'
import { KIND_LABEL, SHAPE_LABEL } from '../ui/labels'
import { Icon, KIND_ICON, type IconName } from '../ui/icons'

type ViewId = 'canvas' | 'split' | 'outline'
type InspectorId = 'jejak' | 'perintah' | 'peserta' | 'komentar'

const VIEWS: { id: ViewId; slug: string; label: string; icon: IconName }[] = [
  { id: 'canvas', slug: '', label: 'Kanvas', icon: 'layout' },
  { id: 'split', slug: 'terbelah', label: 'Terbelah', icon: 'panelRight' },
  { id: 'outline', slug: 'outline', label: 'Outline', icon: 'list' },
]

const INSPECTORS: { id: InspectorId; label: string; icon: IconName }[] = [
  { id: 'jejak', label: 'Jejak', icon: 'clock' },
  { id: 'perintah', label: 'Perintah', icon: 'sparkles' },
  { id: 'peserta', label: 'Peserta', icon: 'users' },
  { id: 'komentar', label: 'Komentar', icon: 'message' },
]

function viewFromPath(pathname: string): ViewId {
  if (pathname.endsWith('/outline')) return 'outline'
  if (pathname.endsWith('/terbelah')) return 'split'
  return 'canvas'
}

function inspectorFromPath(pathname: string): InspectorId {
  if (pathname.endsWith('/perintah')) return 'perintah'
  if (pathname.endsWith('/peserta')) return 'peserta'
  if (pathname.endsWith('/komentar')) return 'komentar'
  return 'jejak'
}

export function WorkspacePage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { roomId } = useParams()
  const room = useRoom()
  const dialogs = useDialogs()

  const {
    doc,
    suggestion,
    focusId,
    tree,
    pointAt,
    panelHidden,
    togglePanel,
    focusMode,
    toggleFocusMode,
    draft,
  } = room

  const view = viewFromPath(pathname)
  // Which panel is showing is device-local navigation, so it lives in state.
  // The view itself lives in the URL, because each arrangement deserves a link.
  const [inspector, setInspector] = useState<InspectorId>(() => inspectorFromPath(pathname))
  const focused = focusId ? tree.byId.get(focusId) : null
  const base = `/ruang/${roomId ?? doc.room.id}`

  const pendingOps = draft.status === 'ready' ? draft.operations.filter((o) => o.accepted).length : 0
  const openComments = Object.values(doc.comments).filter((c) => !c.resolvedAt).length
  const badgeFor = (id: InspectorId) =>
    id === 'perintah' ? pendingOps : id === 'komentar' ? openComments : 0

  return (
    <div className={`workspace ${panelHidden ? 'is-solo' : ''}`}>
      <section className="workspace-main" aria-label="Ruang kerja">
        <div className="canvas-toolbar">
          <div className="seg" role="group" aria-label="Susunan tampilan">
            {VIEWS.map((v) => (
              <button
                key={v.id}
                type="button"
                className={`seg-btn ${view === v.id ? 'is-on' : ''}`}
                aria-pressed={view === v.id}
                onClick={() => navigate(v.slug ? `${base}/${v.slug}` : base)}
              >
                <Icon name={v.icon} size={15} />
                {v.label}
              </button>
            ))}
          </div>

          <span className="toolbar-sep" aria-hidden="true" />

          {focused ? (
            <>
              <span className="sel-label">
                <Icon name={KIND_ICON[focused.node.kind]} size={16} />
                <span className="sel-name">{focused.node.title}</span>
                <span className="pill">{KIND_LABEL[focused.node.kind]}</span>
              </span>
              <button
                type="button"
                className="btn btn-small"
                onClick={() => dialogs.open({ kind: 'create', parentId: focused.node.id })}
                title="Tambah simpul anak (n)"
              >
                <Icon name="plus" size={15} />
                Anak
              </button>
              <button
                type="button"
                className="btn btn-small"
                onClick={() => dialogs.open({ kind: 'rename', nodeId: focused.node.id })}
                title="Ubah judul (Enter)"
              >
                <Icon name="pencil" size={15} />
                Judul
              </button>
              <button
                type="button"
                className="btn btn-small"
                onClick={() => dialogs.open({ kind: 'move', nodeId: focused.node.id })}
                title="Pindahkan ke induk lain (m)"
              >
                <Icon name="move" size={15} />
                Pindah
              </button>
              <button
                type="button"
                className="btn btn-small"
                onClick={() => dialogs.open({ kind: 'relate', nodeId: focused.node.id })}
                title="Hubungkan ke simpul lain (r)"
              >
                <Icon name="link" size={15} />
                Hubung
              </button>
              <button
                type="button"
                className="icon-btn"
                aria-label="Tunjuk simpul ini untuk semua orang"
                title="Tunjuk untuk semua orang (p)"
                onClick={() => pointAt(focused.node.id)}
              >
                <Icon name="pointer" size={17} />
              </button>
              <button
                type="button"
                className="icon-btn is-danger"
                aria-label="Hapus simpul"
                title="Hapus simpul (Delete)"
                onClick={() => dialogs.open({ kind: 'delete', nodeId: focused.node.id })}
              >
                <Icon name="trash" size={17} />
              </button>
            </>
          ) : (
            <span className="sel-label">Pilih sebuah simpul untuk melihat aksinya.</span>
          )}

          <span className="topbar-spacer" />

          {/* The two controls that decide how much of the room you can see. */}
          <button
            type="button"
            className="btn btn-small"
            aria-pressed={panelHidden}
            onClick={togglePanel}
            title="Sembunyikan atau tampilkan panel kanan (\)"
          >
            <Icon name={panelHidden ? 'panelRightOpen' : 'panelRight'} size={15} />
            <span className="hide-narrow">{panelHidden ? 'Tampilkan panel' : 'Sembunyikan panel'}</span>
          </button>
          <button
            type="button"
            className="btn btn-small"
            aria-pressed={focusMode}
            onClick={() => toggleFocusMode()}
            title="Kanvas penuh, keluar dengan Escape (f)"
          >
            <Icon name={focusMode ? 'minimize' : 'maximize'} size={15} />
            <span className="hide-narrow">{focusMode ? 'Keluar' : 'Layar penuh'}</span>
          </button>
        </div>

        <div className={`stage-grid view-${view}`}>
          {view !== 'outline' && <CanvasView />}
          {view !== 'canvas' && (
            <div className="outline-pane">
              <OutlineTree />
            </div>
          )}
        </div>

      </section>

      {!panelHidden && (
        <aside className="inspector" aria-label="Panel pemeriksa">
          <div className="seg seg-wide" role="group" aria-label="Isi panel">
            {INSPECTORS.map((item) => {
              const badge = badgeFor(item.id)
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`seg-btn ${inspector === item.id ? 'is-on' : ''}`}
                  aria-pressed={inspector === item.id}
                  onClick={() => setInspector(item.id)}
                >
                  <Icon name={item.icon} size={15} />
                  <span className="hide-narrow">{item.label}</span>
                  {badge > 0 && <span className="seg-badge">{badge}</span>}
                </button>
              )
            })}
          </div>

          {inspector === 'jejak' && (
            <>
              {suggestion.shape !== doc.room.shape && suggestion.confidence > 0.55 && (
                <p className="suggestion">
                  <Icon name="sparkles" size={16} />
                  <span>
                    Bentuk sekarang <strong>{SHAPE_LABEL[doc.room.shape]}</strong>. Sistem
                    mengusulkan <strong>{SHAPE_LABEL[suggestion.shape]}</strong>.{' '}
                    <button
                      type="button"
                      className="link"
                      onClick={() => dialogs.open({ kind: 'shape' })}
                    >
                      Tinjau
                    </button>
                  </span>
                </p>
              )}
              <EventLog limit={16} />
            </>
          )}
          {inspector === 'perintah' && <DraftPanel />}
          {inspector === 'peserta' && <PresencePanel />}
          {inspector === 'komentar' && <CommentsPanel />}
        </aside>
      )}
    </div>
  )
}
