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

export type ShortcutScope = 'global' | 'tree' | 'draft'

export interface Shortcut {
  id: string
  keys: string[]
  /** Indonesian, imperative, one line. */
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
  { id: 'view-split', keys: ['3'], label: 'Tampilkan kanvas dan outline berdampingan', scope: 'global', mutates: false },
  { id: 'talk', keys: ['Spasi'], label: 'Ketuk untuk mengunci mikrofon, atau tahan selama bicara', scope: 'global', mutates: false },
  { id: 'traverse', keys: ['.'], label: 'Mulai atau hentikan telusur audio', scope: 'global', mutates: false },
  { id: 'mode', keys: ['Ctrl', 'M'], label: 'Ganti mode rapat dan mode telaah', scope: 'global', mutates: false },
  { id: 'sound', keys: ['Ctrl', 'B'], label: 'Nyalakan atau matikan bunyi', scope: 'global', mutates: false },
  { id: 'panel', keys: ['\\'], label: 'Sembunyikan atau tampilkan panel kanan', scope: 'global', mutates: false },
  { id: 'focus-mode', keys: ['f'], label: 'Kanvas layar penuh, keluar dengan Escape', scope: 'global', mutates: false },
  { id: 'undo', keys: ['Ctrl', 'Z'], label: 'Batalkan perubahan terakhir', scope: 'global', mutates: true },

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
  { id: 'relate', keys: ['r'], label: 'Hubungkan ke simpul lain', scope: 'tree', mutates: true },
  { id: 'comment', keys: ['c'], label: 'Tulis komentar', scope: 'tree', mutates: true },
  { id: 'delete', keys: ['Delete'], label: 'Hapus simpul', scope: 'tree', mutates: true },

  { id: 'draft-apply', keys: ['Ctrl', 'Enter'], label: 'Terapkan draf ke kanvas bersama', scope: 'draft', mutates: true },
  { id: 'draft-discard', keys: ['Escape'], label: 'Batalkan draf', scope: 'draft', mutates: false },
]

export const SHORTCUTS_BY_SCOPE: Record<ShortcutScope, Shortcut[]> = {
  global: SHORTCUTS.filter((s) => s.scope === 'global'),
  tree: SHORTCUTS.filter((s) => s.scope === 'tree'),
  draft: SHORTCUTS.filter((s) => s.scope === 'draft'),
}

export const SCOPE_LABEL: Record<ShortcutScope, string> = {
  global: 'Di mana saja',
  tree: 'Saat fokus di sebuah simpul',
  draft: 'Saat draf perintah terbuka',
}

/** True while the person is typing, so single-letter shortcuts stay quiet. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName.toLowerCase()
  return tag === 'input' || tag === 'textarea' || tag === 'select' || target.isContentEditable
}
