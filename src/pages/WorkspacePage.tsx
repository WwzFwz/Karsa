/**
 * One workspace, not a stack of tabs.
 *
 * The earlier version had five tabs, and the canvas tab carried an Outline
 * panel and a change log that were *also* tabs of their own. That is the same
 * content in two places, and it leaves a person guessing which copy is the real
 * one. Worse, it hid the actual proposition: the canvas and the outline are the
 * same model, and the fastest way to say so is to put them side by side.
 *
 * So there are two arrangements of one room -- canvas and outline -- and a
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
import { SHAPE_LABEL } from '../ui/labels'
import { Icon, type IconName } from '../ui/icons'

type ViewId = 'canvas' | 'outline'
type InspectorId = 'jejak' | 'perintah' | 'peserta' | 'komentar'

/*
  Two arrangements, not three. "Terbelah" was a third thing to choose between
  for a benefit the outline panel already gives, and every extra choice in a
  toolbar is paid for by everyone who has to read past it.
*/
const VIEWS: { id: ViewId; slug: string; label: string; icon: IconName }[] = [
  { id: 'canvas', slug: '', label: 'Kanvas', icon: 'layout' },
  { id: 'outline', slug: 'outline', label: 'Outline', icon: 'list' },
]

const INSPECTORS: { id: InspectorId; label: string; icon: IconName }[] = [
  { id: 'jejak', label: 'Jejak', icon: 'clock' },
  { id: 'perintah', label: 'Perintah', icon: 'sparkles' },
  { id: 'peserta', label: 'Peserta', icon: 'users' },
  { id: 'komentar', label: 'Komentar', icon: 'message' },
]

function viewFromPath(pathname: string): ViewId {
  return pathname.endsWith('/outline') ? 'outline' : 'canvas'
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
    panelHidden,
    togglePanel,
    focusMode,
    toggleFocusMode,
    draft,
    nodeOverrides,
    clearOverrides,
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

          {/*
            No selection label, and no Pindah or Hubung buttons. The node is
            already highlighted, so naming it again in a bar was a caption for
            something you are looking at, and both operations have their own
            afordans on the node: the edge anchors draw a relation, dropping one
            node on another proposes a move, and `m` and the command list still
            open the move picker.
          */}
          {focused && (
            <button
              type="button"
              className="icon-btn is-danger"
              aria-label={`Hapus ${focused.node.title}`}
              title="Hapus simpul (Delete)"
              onClick={() => dialogs.open({ kind: 'delete', nodeId: focused.node.id })}
            >
              <Icon name="trash" size={17} />
            </button>
          )}

          <span className="topbar-spacer" />

          {/*
            Only offered once something has been hand-placed. A permanent
            "reset layout" button on a canvas nobody has touched is noise.
          */}
          {Object.keys(nodeOverrides).length > 0 && (
            <button
              type="button"
              className="btn btn-small"
              onClick={clearOverrides}
              title="Buang penempatan manual, kembali ke tata letak otomatis"
            >
              <Icon name="undo" size={15} />
              <span className="hide-narrow">Tata letak otomatis</span>
            </button>
          )}

          {/* Panel visibility now lives on the panel's own tabs. */}
          {/* A known icon does not need a caption. */}
          <button
            type="button"
            className="icon-btn"
            aria-pressed={focusMode}
            aria-label={focusMode ? 'Keluar dari layar penuh' : 'Kanvas layar penuh'}
            onClick={() => toggleFocusMode()}
            title="Layar penuh (f), keluar dengan Escape"
          >
            <Icon name={focusMode ? 'minimize' : 'maximize'} size={17} />
          </button>
        </div>

        <div className={`stage-grid view-${view}`}>
          {view === 'canvas' ? (
            <CanvasView />
          ) : (
            <div className="outline-pane">
              <OutlineTree />
            </div>
          )}
        </div>

      </section>

      {/*
        The tab strip is always here; only its contents fold away. Clicking the
        tab that is already open closes the panel, and clicking any tab opens it
        again -- the same gesture as a sidebar icon in VS Code or Figma. That
        makes a separate "hide panel" button redundant, and one control that
        does both is easier to find than two that each do half.
      */}
      <aside className={`inspector ${panelHidden ? 'is-collapsed' : ''}`} aria-label="Panel pemeriksa">
        <div className="seg seg-wide" role="group" aria-label="Isi panel">
          {INSPECTORS.map((item) => {
            const badge = badgeFor(item.id)
            const open = !panelHidden && inspector === item.id
            return (
              <button
                key={item.id}
                type="button"
                className={`seg-btn ${open ? 'is-on' : ''}`}
                aria-pressed={open}
                aria-expanded={open}
                title={open ? `Tutup panel ${item.label}` : `Buka panel ${item.label}`}
                onClick={() => {
                  if (open) {
                    togglePanel()
                    return
                  }
                  setInspector(item.id)
                  if (panelHidden) togglePanel()
                }}
              >
                <Icon name={item.icon} size={15} />
                <span className="seg-label">{item.label}</span>
                {badge > 0 && <span className="seg-badge">{badge}</span>}
              </button>
            )
          })}
        </div>

        {!panelHidden && (
          <>

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
          </>
        )}
      </aside>
    </div>
  )
}
