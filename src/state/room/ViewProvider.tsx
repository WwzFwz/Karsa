/**
 * Navigation on this device: where the focus is, what is folded, what is being
 * edited or linked, where nodes were placed by hand, and which chrome is open.
 *
 * None of it changes what anyone else reads. The dividing line with the
 * document: if an action changes what someone else's screen reader would read
 * out, it belongs in DocumentProvider.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useAnnouncer } from '../../a11y/Announcer'
import { audioBus } from '../../audio/bus'
import type { NodeId, RoomShape } from '../../core/model/types'
import type { Point } from '../../core/shape/layout'
import { visibleOrder } from '../../core/tree/project'
import { useDocument } from './DocumentProvider'
import { usePresence } from './PresenceProvider'
import { tr } from '../../core/i18n'

export type ViewMode = 'canvas' | 'outline'

export interface ViewApi {
  focusId: NodeId | null
  setFocus: (id: NodeId | null, options?: { announce?: boolean }) => void
  /** The node whose title is being typed over, in place. */
  editingId: NodeId | null
  setEditingId: (id: NodeId | null) => void

  collapsed: ReadonlySet<NodeId>
  toggleCollapse: (id: NodeId, next?: boolean) => void
  visibleIds: NodeId[]
  /**
   * What the canvas draws. A tool's children are folded into its card, so the
   * canvas hides them while the outline keeps showing them -- the outline is
   * where the detail lives, and a tool must never make content unreachable.
   */
  canvasIds: NodeId[]

  /**
   * Hand-placed positions for the current shape. Device-local, never in the
   * document and never on the wire, so rule 2 holds as written (D31). Kept per
   * shape, because a mind map and a flow chart disagree about where things go.
   */
  nodeOverrides: Readonly<Record<string, Point>>
  /** `null` forgets the placement, returning the node to auto layout. */
  setNodeOverride: (id: NodeId, at: Point | null) => void
  clearOverrides: () => void

  /** Set while a relation is being drawn: the next node picked is the target. */
  linkingFrom: NodeId | null
  startLinking: (id: NodeId) => void
  cancelLinking: () => void

  view: ViewMode
  setView: (view: ViewMode) => void
  panelHidden: boolean
  togglePanel: () => void
  sidebarHidden: boolean
  toggleSidebar: () => void
  /** Canvas at full height, chrome out of the way. */
  focusMode: boolean
  toggleFocusMode: (next?: boolean) => void
  /** True while a canvas is on screen, so the dock does not repeat its bubble. */
  canvasMounted: boolean
  setCanvasMounted: (mounted: boolean) => void
}

const EMPTY_OVERRIDES: Readonly<Record<string, Point>> = Object.freeze({})

const ViewContext = createContext<ViewApi | null>(null)

export function ViewProvider({ children }: { children: ReactNode }) {
  const { doc, tree, subscribeApplied } = useDocument()
  const { updateSelf } = usePresence()
  const announcer = useAnnouncer()

  const [focusId, setFocusId] = useState<NodeId | null>('n_akar')
  const [editingId, setEditingId] = useState<NodeId | null>(null)
  const [collapsed, setCollapsed] = useState<Set<NodeId>>(() => new Set())
  const [linkingFrom, setLinkingFrom] = useState<NodeId | null>(null)
  const [overridesByShape, setOverridesByShape] = useState<
    Partial<Record<RoomShape, Record<string, Point>>>
  >({})
  const [view, setView] = useState<ViewMode>('canvas')
  const [panelHidden, setPanelHidden] = useState(false)
  const [sidebarHidden, setSidebarHidden] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [canvasMounted, setCanvasMounted] = useState(false)

  const shape = doc.room.shape

  const setFocus = useCallback(
    (id: NodeId | null, options: { announce?: boolean } = {}) => {
      setFocusId(id)
      updateSelf({ focusNodeId: id })
      if (id && options.announce !== false) {
        audioBus.emit({ earcon: 'focus', depth: tree.byId.get(id)?.depth ?? 0 })
      }
    },
    [updateSelf, tree],
  )

  /*
    Following this device's own changes:
    - a node just created takes the focus, so the next keystroke acts on it;
    - a hand placement is an opinion about where a node sits under the layout it
      was placed in, so giving the node a new parent drops it (D35).
  */
  useEffect(
    () =>
      subscribeApplied((events) => {
        const created = events.find((e) => e.type === 'createNode' && e.payload.nodeId)
        if (created) setFocusId(created.payload.nodeId as NodeId)

        const moved = events
          .filter((e) => e.type === 'moveNode' && e.payload.nodeId)
          .map((e) => e.payload.nodeId as NodeId)
        if (moved.length === 0) return
        setOverridesByShape((prev) => {
          const sheet = prev[shape]
          if (!sheet || !moved.some((id) => id in sheet)) return prev
          const next = { ...sheet }
          for (const id of moved) delete next[id]
          return { ...prev, [shape]: next }
        })
      }),
    [subscribeApplied, shape],
  )

  /*
    Undo can take away the node the focus was sitting on, and a focus pointing
    at something gone is worse than no focus: `n` would try to create under a
    ghost parent.
  */
  useEffect(() => {
    if (focusId && !doc.nodes[focusId]) setFocusId(tree.rootIds[0] ?? null)
  }, [doc.nodes, focusId, tree.rootIds])

  const toggleCollapse = useCallback((id: NodeId, next?: boolean) => {
    setCollapsed((prev) => {
      const copy = new Set(prev)
      if (next ?? !copy.has(id)) copy.add(id)
      else copy.delete(id)
      return copy
    })
  }, [])

  const visibleIds = useMemo(() => visibleOrder(tree, collapsed), [tree, collapsed])
  const canvasIds = useMemo(() => {
    const folded = new Set(collapsed)
    for (const node of Object.values(doc.nodes)) if (node.tool) folded.add(node.id)
    return visibleOrder(tree, folded)
  }, [tree, collapsed, doc.nodes])

  /*
    Drawing a relation as two picks instead of a drag. It needs no sustained
    pressure and no precise path, so it works for someone who cannot drag.
  */
  const startLinking = useCallback(
    (id: NodeId) => {
      setLinkingFrom(id)
      announcer.announce(
        tr(
          'Pilih simpul tujuan untuk dihubungkan. Escape untuk membatalkan.',
          'Choose the node to relate to. Escape to cancel.',
        ),
        'assertive',
      )
    },
    [announcer],
  )
  const cancelLinking = useCallback(() => {
    setLinkingFrom((current) => {
      if (current) announcer.announce(tr('Penghubungan dibatalkan.', 'The link was cancelled.'))
      return null
    })
  }, [announcer])

  const api: ViewApi = {
    focusId,
    setFocus,
    editingId,
    setEditingId,
    collapsed,
    toggleCollapse,
    visibleIds,
    canvasIds,
    nodeOverrides: overridesByShape[shape] ?? EMPTY_OVERRIDES,
    setNodeOverride: (id, at) =>
      setOverridesByShape((prev) => {
        const sheet = { ...(prev[shape] ?? {}) }
        if (at) sheet[id] = at
        else delete sheet[id]
        return { ...prev, [shape]: sheet }
      }),
    clearOverrides: () =>
      setOverridesByShape((prev) => {
        const next = { ...prev }
        delete next[shape]
        return next
      }),
    linkingFrom,
    startLinking,
    cancelLinking,
    view,
    setView,
    panelHidden,
    togglePanel: () => setPanelHidden((v) => !v),
    sidebarHidden,
    toggleSidebar: () => setSidebarHidden((v) => !v),
    focusMode,
    toggleFocusMode: (next) => setFocusMode((v) => next ?? !v),
    canvasMounted,
    setCanvasMounted,
  }

  return <ViewContext.Provider value={api}>{children}</ViewContext.Provider>
}

export function useView(): ViewApi {
  const ctx = useContext(ViewContext)
  if (!ctx) throw new Error('useView must be used inside RoomProvider')
  return ctx
}
