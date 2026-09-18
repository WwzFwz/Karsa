/**
 * Icon set. Inline SVG on a 24 grid, 1.75 stroke, round caps -- the same
 * conventions Lucide, Feather and the Material rounded set share, so the shapes
 * read the way people already expect them to.
 *
 * Inline rather than an icon font or a CDN sprite for one reason: classroom
 * mode runs on a laptop with no internet at all, and an icon that fails to load
 * is a button with no label.
 *
 * Every icon here is decorative. Nothing in this product is conveyed by an icon
 * alone -- each one sits next to a word, or the control carries an aria-label.
 */

import type { SVGProps } from 'react'
import type { NodeKind, RelationKind } from '../../core/model/types'

export type IconName =
  | 'mic' | 'micOff' | 'headphones' | 'volume' | 'volumeOff'
  | 'users' | 'message' | 'layout' | 'keyboard' | 'help'
  | 'plus' | 'pencil' | 'move' | 'link' | 'trash' | 'check' | 'x'
  | 'chevronRight' | 'chevronDown' | 'arrowRight' | 'cornerDownRight'
  | 'sparkles' | 'shield' | 'target' | 'lightbulb' | 'list' | 'diamond'
  | 'fileText' | 'checkSquare' | 'folder' | 'pointer' | 'eye' | 'presentation'
  | 'play' | 'stop' | 'alert' | 'clock' | 'activity' | 'search' | 'send'
  | 'wifi' | 'wifiOff' | 'ear' | 'earOff' | 'copy' | 'zap' | 'more' | 'panelRight' | 'logIn' | 'dot'
  | 'sun' | 'moon' | 'maximize' | 'minimize' | 'panelRightOpen' | 'undo' | 'settings' | 'lock' | 'menu' | 'minus' | 'share' | 'home'

const PATHS: Record<IconName, JSX.Element> = {
  mic: (
    <>
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <path d="M12 19v3" />
    </>
  ),
  micOff: (
    <>
      <path d="m2 2 20 20" />
      <path d="M9 9v3a3 3 0 0 0 5.1 2.1" />
      <path d="M15 9.3V5a3 3 0 0 0-5.7-1.3" />
      <path d="M19 10v2a7 7 0 0 1-.7 3" />
      <path d="M5 10v2a7 7 0 0 0 12 5" />
      <path d="M12 19v3" />
    </>
  ),
  headphones: (
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
  ),
  volume: (
    <>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7" />
      <path d="M18.5 6a9 9 0 0 1 0 12" />
    </>
  ),
  volumeOff: (
    <>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <path d="m22 9-6 6" />
      <path d="m16 9 6 6" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>
  ),
  message: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />,
  layout: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M3 9h18" />
      <path d="M9 21V9" />
    </>
  ),
  keyboard: (
    <>
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M8 12h.01M12 12h.01M16 12h.01M7 16h10" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </>
  ),
  plus: <path d="M5 12h14M12 5v14" />,
  pencil: (
    <>
      <path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </>
  ),
  move: (
    <>
      <path d="M12 3v18M3 12h18" />
      <path d="m6 9-3 3 3 3M18 9l3 3-3 3M9 6l3-3 3 3M9 18l3 3 3-3" />
    </>
  ),
  link: (
    <>
      <path d="M10 13a5 5 0 0 0 7.5.5l3-3A5 5 0 0 0 13.5 3.5l-1.7 1.7" />
      <path d="M14 11a5 5 0 0 0-7.5-.5l-3 3A5 5 0 0 0 10.5 20.5l1.7-1.7" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  x: <path d="M18 6 6 18M6 6l12 12" />,
  chevronRight: <path d="m9 18 6-6-6-6" />,
  chevronDown: <path d="m6 9 6 6 6-6" />,
  arrowRight: <path d="M5 12h14m-7-7 7 7-7 7" />,
  cornerDownRight: (
    <>
      <path d="m15 10 5 5-5 5" />
      <path d="M4 4v7a4 4 0 0 0 4 4h12" />
    </>
  ),
  sparkles: (
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  ),
  shield: (
    <>
      <path d="M20 13c0 5-3.5 7.5-7.7 9a1 1 0 0 1-.6 0C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.2-2.7a1.2 1.2 0 0 1 1.6 0C14.5 3.8 17 5 19 5a1 1 0 0 1 1 1Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.5" />
    </>
  ),
  lightbulb: (
    <>
      <path d="M15 14c.2-1 .7-1.7 1.5-2.5A5.9 5.9 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.8.8 1.3 1.5 1.5 2.5" />
      <path d="M9 18h6M10 22h4" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>
  ),
  diamond: <path d="M12 2.6 21.4 12 12 21.4 2.6 12Z" />,
  fileText: (
    <>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v5h5" />
      <path d="M8 13h8M8 17h5" />
    </>
  ),
  checkSquare: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  folder: (
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.7-.9L9.6 3.9A2 2 0 0 0 7.9 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  ),
  pointer: (
    <>
      <path d="M10 9.5V4a2 2 0 1 1 4 0v6" />
      <path d="M14 10V8a2 2 0 1 1 4 0v3" />
      <path d="M18 11a2 2 0 1 1 4 0v3a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  presentation: (
    <>
      <path d="M2 3h20" />
      <path d="M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3" />
      <path d="m7 21 5-5 5 5" />
    </>
  ),
  play: <path d="M7 4.5v15l13-7.5Z" />,
  stop: <rect width="13" height="13" x="5.5" y="5.5" rx="2" />,
  alert: (
    <>
      <path d="m21.7 18-8-14a2 2 0 0 0-3.4 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3Z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  activity: <path d="M22 12h-4l-3 9L9 3l-3 9H2" />,
  search: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  send: (
    <>
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4Z" />
    </>
  ),
  wifi: (
    <>
      <path d="M8.5 16.4a5 5 0 0 1 7 0" />
      <path d="M5 12.9a10 10 0 0 1 14 0" />
      <path d="M2 8.8a15 15 0 0 1 20 0" />
      <path d="M12 20h.01" />
    </>
  ),
  /* Mode Menyimak: an ear, and an ear with the line through it for off. */
  ear: (
    <>
      <path d="M6 8.5a6 6 0 1 1 12 0c0 2.5-1.5 3.5-2.5 4.5S14 15 14 16.5a2.5 2.5 0 0 1-5 0" />
      <path d="M9.5 8.5a2.5 2.5 0 0 1 5 0" />
    </>
  ),
  earOff: (
    <>
      <path d="m2 2 20 20" />
      <path d="M6.2 6.2A6 6 0 0 1 18 8.5c0 2.5-1.5 3.5-2.5 4.5" />
      <path d="M6 12.5c0 1.6.8 2.6 1.6 3.4" />
      <path d="M9 16.5a2.5 2.5 0 0 0 5 0v-.6" />
    </>
  ),
  wifiOff: (
    <>
      <path d="m2 2 20 20" />
      <path d="M8.5 16.4a5 5 0 0 1 7 0" />
      <path d="M5 12.9a10 10 0 0 1 5.2-2.8" />
      <path d="M2 8.8a15 15 0 0 1 4.2-2.5" />
      <path d="M12 20h.01" />
    </>
  ),
  copy: (
    <>
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2" />
    </>
  ),
  zap: <path d="M13 2 4 14h7l-1 8 9-12h-7Z" />,
  more: (
    <>
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </>
  ),
  panelRight: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M15 3v18" />
    </>
  ),
  logIn: (
    <>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <path d="m10 17 5-5-5-5" />
      <path d="M15 12H3" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  minus: <path d="M5 12h14" />,
  share: (
    <>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </>
  ),
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.8V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.8" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-1.8-.3 1.6 1.6 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 9 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0 .3-1.8 1.6 1.6 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 4.6 9a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H9a1.6 1.6 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 1 1.5 1.6 1.6 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V9a1.6 1.6 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1Z" />
    </>
  ),
  lock: (
    <>
      <rect width="18" height="11" x="3" y="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </>
  ),
  undo: (
    <>
      <path d="M3 7v6h6" />
      <path d="M3.5 13a9 9 0 1 0 2.1-9.4L3 7" />
    </>
  ),
  maximize: <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3" />,
  minimize: <path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3M8 21v-3a2 2 0 0 0-2-2H3M16 21v-3a2 2 0 0 1 2-2h3" />,
  panelRightOpen: (
    <>
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M15 3v18" />
      <path d="m10 15-3-3 3-3" />
    </>
  ),
}

export function Icon({
  name,
  size = 18,
  ...rest
}: { name: IconName; size?: number } & Omit<SVGProps<SVGSVGElement>, 'name'>) {
  return (
    <svg
      className="icon"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}

/** Node kind -> icon. Paired with the kind word everywhere it appears. */
export const KIND_ICON: Record<NodeKind, IconName> = {
  root: 'target',
  idea: 'lightbulb',
  step: 'list',
  decision: 'diamond',
  question: 'help',
  fact: 'fileText',
  action: 'checkSquare',
  group: 'folder',
}

export const RELATION_ICON: Record<RelationKind, IconName> = {
  depends_on: 'link',
  causes: 'zap',
  contradicts: 'alert',
  refers_to: 'cornerDownRight',
  duplicates: 'copy',
  sequence: 'arrowRight',
}

/**
 * The flowchart silhouette for a kind, drawn small next to the label.
 *
 * Mermaid, Visio and every whiteboard since have used the same shapes: a
 * rectangle is a step, a diamond is a decision, a cylinder is stored fact. The
 * glyph borrows that memory without forcing the card itself into a diamond,
 * which would wreck the line length of a real title.
 */
export function KindGlyph({ kind }: { kind: NodeKind }) {
  const shapes: Record<NodeKind, JSX.Element> = {
    root: <circle cx="8" cy="8" r="6" />,
    idea: <rect x="1.5" y="3" width="13" height="10" rx="5" />,
    step: <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />,
    decision: <path d="M8 2.2 13.8 8 8 13.8 2.2 8Z" />,
    question: <path d="M8 2.2 13.8 8 8 13.8 2.2 8Z" strokeDasharray="2 2" />,
    fact: <path d="M4 3.5h11l-3 9H1Z" />,
    action: <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" strokeDasharray="0" />,
    group: <path d="M1.5 5.5h5l1.5 2h6.5v5h-13Z" />,
  }
  return (
    <svg
      className="kind-glyph"
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      aria-hidden="true"
      focusable="false"
    >
      {shapes[kind]}
    </svg>
  )
}
