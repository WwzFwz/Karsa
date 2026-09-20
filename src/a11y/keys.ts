/**
 * One source of truth for every shortcut.
 *
 * Rule 6: every feature must be reachable from the keyboard. That is only
 * checkable if the shortcuts live in one list rather than being scattered
 * across components. docs/keyboard-map.md is generated from this table, and the
 * in-app help sheet renders the same table -- so the documentation cannot drift
 * from the behaviour.
 *
 * Single-letter shortcuts only fire when focus is on a tree item, never while
 * typing in a field.
 */

import { bilingual, localise, tr } from '../core/i18n'

/*
  The English half of the table, keyed by id rather than written inline.

  Everywhere else the two languages sit on the same line (D69), and for the
  same reason: a sentence added in one language and forgotten in the other is
  invisible until somebody switches. Here that would mean a 40-line array with
  two labels per row, and the row is already long enough to wrap. Keeping the
  ids in one block above it buys the same check a different way: this table
  defines what an id *is*, so a shortcut added without an English label is a
  compile error rather than a row that quietly stays Indonesian.
*/
const EN = {
  help: 'Open the shortcut sheet',
  palette: 'Open the command list',
  'view-canvas': 'Go to the canvas',
  'view-outline': 'Go to the outline',
  'view-draft': 'Open the command panel',
  talk: 'Tap to lock the microphone, or hold while speaking',
  traverse: 'Start or stop the audio walk',
  mode: 'Switch between meeting and review mode',
  sound: 'Turn sound on or off',
  panel: 'Open or close the right panel',
  'palette-tools': 'Open tools and templates',
  'focus-mode': 'Full-screen canvas, leave with Escape',
  undo: 'Undo the last change',
  'zoom-in': 'Zoom in',
  'zoom-out': 'Zoom out',
  'zoom-reset': 'Back to 100 per cent',
  'nav-down': 'To the next row',
  'nav-up': 'To the previous row',
  'nav-right': 'Open the branch, then to the first child',
  'nav-left': 'Close the branch, then to the parent',
  'nav-home': 'To the first row',
  'nav-end': 'To the last row',
  point: 'Point at this node for everybody',
  'add-child': 'Add a child node',
  'add-sibling': 'Add a sibling node',
  rename: 'Rename',
  kind: 'Change the node type',
  state: 'Change the action status',
  note: 'Edit the note',
  move: 'Move to another parent',
  up: 'Move up among its siblings',
  down: 'Move down among its siblings',
  vote: 'Vote or take the vote back on the focused node',
  tool: 'Turn the focused node into a tool',
  relate: 'Relate to another node',
  comment: 'Write a comment',
  delete: 'Delete the node',
  'draft-apply': 'Apply the draft to the shared canvas',
  'draft-discard': 'Discard the draft',
}


/** Every shortcut there is, named by the table that gives it both languages. */
export type ShortcutId = keyof typeof EN

export type ShortcutScope = 'global' | 'tree' | 'draft'

export interface Shortcut {
  id: ShortcutId
  keys: string[]
  /** Imperative, one line, in the current output language (D69). */
  label: string
  scope: ShortcutScope
  /** True when the shortcut changes the shared document. */
  mutates: boolean
}

export const SHORTCUTS: Shortcut[] = [
  { id: 'help', keys: ['?'], label: 'Buka daftar pintasan', scope: 'global', mutates: false },
  { id: 'palette', keys: ['Ctrl', 'K'], label: 'Buka daftar perintah', scope: 'global', mutates: false },
  { id: 'view-canvas', keys: ['1'], label: 'Pindah ke kanvas', scope: 'global', mutates: false },
  { id: 'view-outline', keys: ['2'], label: 'Pindah ke outline', scope: 'global', mutates: false },
  { id: 'view-draft', keys: ['3'], label: 'Buka panel perintah', scope: 'global', mutates: false },
  { id: 'talk', keys: ['Spasi'], label: 'Ketuk untuk mengunci mikrofon, atau tahan selama bicara', scope: 'global', mutates: false },
  { id: 'traverse', keys: ['.'], label: 'Mulai atau hentikan telusur audio', scope: 'global', mutates: false },
  { id: 'mode', keys: ['Ctrl', 'M'], label: 'Ganti mode rapat dan mode telaah', scope: 'global', mutates: false },
  { id: 'sound', keys: ['Ctrl', 'B'], label: 'Nyalakan atau matikan bunyi', scope: 'global', mutates: false },
  { id: 'panel', keys: ['\\'], label: 'Buka atau tutup panel kanan', scope: 'global', mutates: false },
  { id: 'palette-tools', keys: ['a'], label: 'Buka alat dan templat', scope: 'global', mutates: false },
  { id: 'focus-mode', keys: ['f'], label: 'Kanvas layar penuh, keluar dengan Escape', scope: 'global', mutates: false },
  { id: 'undo', keys: ['Ctrl', 'Z'], label: 'Batalkan perubahan terakhir', scope: 'global', mutates: true },
  { id: 'zoom-in', keys: ['Ctrl', '+'], label: 'Perbesar kanvas', scope: 'global', mutates: false },
  { id: 'zoom-out', keys: ['Ctrl', '-'], label: 'Perkecil kanvas', scope: 'global', mutates: false },
  { id: 'zoom-reset', keys: ['Ctrl', '0'], label: 'Kembalikan perbesaran ke 100 persen', scope: 'global', mutates: false },

  { id: 'nav-down', keys: ['Panah bawah'], label: 'Ke baris berikutnya', scope: 'tree', mutates: false },
  { id: 'nav-up', keys: ['Panah atas'], label: 'Ke baris sebelumnya', scope: 'tree', mutates: false },
  { id: 'nav-right', keys: ['Panah kanan'], label: 'Buka cabang, lalu ke anak pertama', scope: 'tree', mutates: false },
  { id: 'nav-left', keys: ['Panah kiri'], label: 'Tutup cabang, lalu ke induk', scope: 'tree', mutates: false },
  { id: 'nav-home', keys: ['Home'], label: 'Ke baris pertama', scope: 'tree', mutates: false },
  { id: 'nav-end', keys: ['End'], label: 'Ke baris terakhir', scope: 'tree', mutates: false },
  { id: 'point', keys: ['p'], label: 'Tunjuk simpul ini untuk semua orang', scope: 'tree', mutates: false },

  { id: 'add-child', keys: ['n'], label: 'Tambah simpul anak', scope: 'tree', mutates: true },
  { id: 'add-sibling', keys: ['Shift', 'N'], label: 'Tambah simpul saudara', scope: 'tree', mutates: true },
  { id: 'rename', keys: ['Enter'], label: 'Ubah judul', scope: 'tree', mutates: true },
  { id: 'kind', keys: ['t'], label: 'Ubah tipe simpul', scope: 'tree', mutates: true },
  { id: 'state', keys: ['s'], label: 'Ubah status tindakan', scope: 'tree', mutates: true },
  { id: 'note', keys: ['e'], label: 'Sunting catatan', scope: 'tree', mutates: true },
  { id: 'move', keys: ['m'], label: 'Pindahkan ke induk lain', scope: 'tree', mutates: true },
  { id: 'up', keys: ['Alt', 'Panah atas'], label: 'Naikkan urutan', scope: 'tree', mutates: true },
  { id: 'down', keys: ['Alt', 'Panah bawah'], label: 'Turunkan urutan', scope: 'tree', mutates: true },
  { id: 'vote', keys: ['v'], label: 'Pilih atau tarik pilihan pada simpul terfokus', scope: 'tree', mutates: true },
  { id: 'tool', keys: ['l'], label: 'Jadikan simpul terfokus sebuah alat', scope: 'tree', mutates: true },
  { id: 'relate', keys: ['r'], label: 'Hubungkan ke simpul lain', scope: 'tree', mutates: true },
  { id: 'comment', keys: ['c'], label: 'Tulis komentar', scope: 'tree', mutates: true },
  { id: 'delete', keys: ['Delete'], label: 'Hapus simpul', scope: 'tree', mutates: true },

  { id: 'draft-apply', keys: ['Ctrl', 'Enter'], label: 'Terapkan draf ke kanvas bersama', scope: 'draft', mutates: true },
  { id: 'draft-discard', keys: ['Escape'], label: 'Batalkan draf', scope: 'draft', mutates: false },
]

for (const shortcut of SHORTCUTS) {
  localise(shortcut, 'label', EN[shortcut.id])
}

/**
 * A key as it is printed on the sheet.
 *
 * Only the named keys need this -- a letter is a letter in both languages, and
 * so is `Ctrl`. It is a function rather than a table because the same key name
 * appears inside `keys` arrays that are built once at module load, and a table
 * read then would freeze whichever language happened to be current.
 */
export function keyLabel(key: string): string {
  if (key === 'Spasi') return tr('Spasi', 'Space')
  if (key.startsWith('Panah ')) {
    const way = key.slice(6)
    const en = way === 'atas' ? 'up' : way === 'bawah' ? 'down' : way === 'kiri' ? 'left' : 'right'
    return tr(key, 'Arrow ' + en)
  }
  return key
}

export const SHORTCUTS_BY_SCOPE: Record<ShortcutScope, Shortcut[]> = {
  global: SHORTCUTS.filter((s) => s.scope === 'global'),
  tree: SHORTCUTS.filter((s) => s.scope === 'tree'),
  draft: SHORTCUTS.filter((s) => s.scope === 'draft'),
}

export const SCOPE_LABEL: Record<ShortcutScope, string> = bilingual(
  {
    global: 'Di mana saja',
    tree: 'Saat fokus di sebuah simpul',
    draft: 'Saat draf perintah terbuka',
  },
  {
    global: 'Anywhere',
    tree: 'While a node has focus',
    draft: 'While the command draft is open',
  },
)

/** True while the person is typing, so single-letter shortcuts stay quiet. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
}
