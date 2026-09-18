/**
 * One card on the board.
 *
 * It was the middle 230 lines of CanvasView's JSX, ten levels of indentation
 * deep -- and buried in there is the `aria-label` that decides what a screen
 * reader actually hears about a node, which is not a thing that should be hard
 * to find. Rule 6 says every feature must be readable as text; that text lives
 * here, so this file is where to look when it is wrong.
 *
 * Kind is carried four ways at once (D14): the glyph, the word, the hue, and
 * the card's silhouette. Colour alone fails anyone who cannot separate these
 * hues, and the silhouette borrows the flowchart vocabulary people already
 * read.
 *
 * Everything it can do has a keyboard route somewhere else -- the anchors are a
 * pointer affordance for `r`, the plus is `n` (D6b). Nothing here is the only
 * way to reach an operation.
 */

import type { PointerEvent as ReactPointerEvent } from 'react'
import { ToolCard } from './ToolCard'
import { Icon, KindGlyph } from '../shared/icons'
import { InlineTitle } from '../shared/InlineTitle'
import { KIND_HUE } from '../shared/labels'
import { KIND_LABEL, STATE_LABEL } from '../../core/vocabulary'
import { sizeOf } from '../../core/shape/layout'
import type { ToolSpec } from '../../core/tools/registry'
import type { Comment, NodeId, Participant, RoomDoc } from '../../core/model/types'
import type { Point } from '../../core/shape/layout'
import type { ProjectedNode, TreeProjection } from '../../core/tree/project'

export type Side = 'top' | 'right' | 'bottom' | 'left'

/** Which of this card's several states are on. Flags, so the call site reads. */
export interface CardState {
  focused: boolean
  editing: boolean
  dragging: boolean
  dropTarget: boolean
  linkTarget: boolean
  linkSource: boolean
  /** Placed by hand, so it is drawn as one screen's opinion (D31). */
  placed: boolean
  /** A proposal is waiting that would change this node (D18). */
  proposed: boolean
  /** Anchors and handles are hidden while editing or drawing a link. */
  quiet: boolean
}

export function NodeCard({
  id,
  entry,
  doc,
  tree,
  at,
  state,
  pointing,
  watching,
  comments,
  collapsed,
  spec,
  votesOn,
  votedByMe,
  dropParent,
  register,
  on,
}: {
  id: NodeId
  entry: ProjectedNode
  doc: RoomDoc
  tree: TreeProjection
  /** Already in stage coordinates: the board's origin is the caller's business. */
  at: Point
  state: CardState
  pointing: Participant[]
  watching: Participant[]
  comments: Comment[]
  collapsed: boolean
  spec: ToolSpec | null
  votesOn: (id: NodeId) => number
  votedByMe: (id: NodeId) => boolean
  dropParent: NodeId | null
  /**
   * Hands the drawn element back to the board.
   *
   * Two things need it and neither can work without it: the layout measures
   * what it actually painted rather than guessing a card's height (D54), and a
   * click has to move real DOM focus, or the single-letter shortcuts work after
   * the arrow keys and not after the mouse.
   */
  register: (id: NodeId, el: HTMLLIElement | null) => void
  on: {
    pointerDown: (event: ReactPointerEvent<HTMLLIElement>) => void
    click: () => void
    commitTitle: (title: string) => void
    cancelEdit: () => void
    startEdit: () => void
    addChild: () => void
    startLink: (event: ReactPointerEvent<HTMLSpanElement>) => void
    vote: (target: NodeId) => void
    focusNode: (target: NodeId) => void
  }
}) {
  const node = entry.node
  const hasChildren = entry.childIds.length > 0
  const size = sizeOf(tree, id)
  const hue = KIND_HUE[node.kind]

  /*
    The whole card in one sentence, because that is all a screen reader gets.

    Order matters: what it is, what it is called, then the things that would
    change what you do about it -- its state, whether anybody has commented,
    who is pointing at it, and whether a proposal is waiting on it.
  */
  const label = [
    `${KIND_LABEL[node.kind]} ${node.title}`,
    node.state ? STATE_LABEL[node.state].toLowerCase() : '',
    comments.length ? `${comments.length} komentar` : '',
    pointing.length ? `ditunjuk ${pointing.map((p) => p.displayName).join(' dan ')}` : '',
    state.proposed ? 'ada usulan menunggu persetujuan' : '',
  ]
    .filter(Boolean)
    .join(', ')

  const classes = [
    'node',
    `node-${node.kind}`,
    state.focused && 'is-focus',
    pointing.length > 0 && 'is-pointed',
    state.proposed && 'is-proposed',
    state.linkTarget && 'is-linktarget',
    state.linkSource && 'is-linksource',
    state.dragging && 'is-dragging',
    state.dropTarget && 'is-droptarget',
    state.placed && 'is-placed',
    spec && `node-tool tool-${spec.id}`,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <li
      role="treeitem"
      aria-level={entry.depth + 1}
      aria-posinset={entry.posInSet}
      aria-setsize={entry.setSize}
      aria-expanded={hasChildren ? !collapsed : undefined}
      aria-selected={state.focused}
      aria-label={label}
      data-node-id={id}
      tabIndex={state.focused ? 0 : -1}
      className={classes}
      style={{
        transform: `translate(${at.x}px, ${at.y}px)`,
        // Width is fixed by kind; height belongs to the content, and the layout
        // finds out what it was by measuring afterwards (D54).
        width: size.w,
        minHeight: sizeOf(tree, id).h,
        ['--kh' as string]: String(hue),
      }}
      ref={(el) => register(id, el)}
      onPointerDown={on.pointerDown}
      onClick={on.click}
    >
      <span className="node-bar" style={{ background: `hsl(${hue} 58% 50%)` }} aria-hidden="true" />

      {/* The kind, said twice over: as a glyph and as the word. */}
      <span className="node-head" aria-hidden="true">
        {spec ? (
          <>
            <Icon name={spec.icon} size={12} />
            {spec.label}
          </>
        ) : (
          <>
            <KindGlyph kind={node.kind} />
            {KIND_LABEL[node.kind]}
          </>
        )}
      </span>

      {state.editing ? (
        <InlineTitle
          value={node.title}
          className="node-title"
          onCommit={on.commitTitle}
          onCancel={on.cancelEdit}
        />
      ) : (
        <span
          className="node-title"
          onDoubleClick={(event) => {
            event.stopPropagation()
            on.startEdit()
          }}
        >
          {node.title}
        </span>
      )}

      {/* A tool is a layout over its own children, not a window (D40). */}
      {spec && (
        <ToolCard
          spec={spec}
          id={id}
          doc={doc}
          tree={tree}
          votesOn={votesOn}
          votedByMe={votedByMe}
          dropParent={dropParent}
          onVote={on.vote}
          onFocus={on.focusNode}
        />
      )}

      {state.proposed && (
        <span className="node-proposed" aria-hidden="true">
          <Icon name="sparkles" size={11} />
          usulan menunggu
        </span>
      )}

      {/* All of this is already in the label above, so it is drawn only. */}
      {(node.state || comments.length > 0 || node.note) && (
        <span className="node-tags" aria-hidden="true">
          {node.state && <span className={`state-tag state-${node.state}`}>{STATE_LABEL[node.state]}</span>}
          {comments.length > 0 && (
            <span className="count-tag">
              <Icon name="message" size={11} />
              {comments.length}
            </span>
          )}
          {node.note && (
            <span className="count-tag" title="Punya catatan">
              <Icon name="fileText" size={11} />
            </span>
          )}
        </span>
      )}

      {pointing.length > 0 && (
        <span
          className="node-pointer"
          style={{ ['--hue' as string]: String(pointing[0].hue) }}
          aria-hidden="true"
          title={`${pointing.map((p) => p.displayName).join(' dan ')} menunjuk simpul ini`}
        >
          <Icon name="pointer" size={12} />
        </span>
      )}

      {!state.quiet && (
        <>
          {state.focused && (
            <span className="node-handles">
              <button
                type="button"
                className="node-handle"
                aria-label={`Tambah simpul anak di bawah ${node.title}`}
                title="Tambah anak (n)"
                onClick={(event) => {
                  event.stopPropagation()
                  on.addChild()
                }}
              >
                <Icon name="plus" size={13} />
              </button>
            </span>
          )}

          {/*
            Pointer affordance only, so it adds no tab stops. The accessible
            route to the same command is `r` and the Hubung button, which were
            there first.
          */}
          {(['top', 'right', 'bottom', 'left'] as Side[]).map((side) => (
            <span
              key={side}
              className={`node-anchor anchor-${side}`}
              aria-hidden="true"
              onPointerDown={on.startLink}
            />
          ))}
        </>
      )}

      {(pointing.length > 0 || watching.length > 0) && (
        <span className="node-people" aria-hidden="true">
          {[...pointing, ...watching].map((p) => (
            <span
              key={p.actorId}
              className={`avatar ${p.talking ? 'is-talking' : ''}`}
              style={{ ['--hue' as string]: String(p.hue) }}
              title={p.displayName}
            >
              {p.displayName.charAt(0)}
            </span>
          ))}
        </span>
      )}
    </li>
  )
}
