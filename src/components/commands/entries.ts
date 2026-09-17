/**
 * Every command in one list.
 *
 * `Ctrl+K` was advertised in the shortcut sheet and in the keyboard map, and
 * did nothing. That is worse than a missing feature: a person who cannot use a
 * mouse reads that list as a contract, tries the one entry that promises "every
 * command", and finds out the hard way that this product's own documentation
 * lies. So the palette exists mainly to make the sheet true.
 *
 * Nothing here is a new capability. Every entry runs something that already had
 * a button, a key or both -- which is the point: rule 6 asks that every feature
 * be reachable from the keyboard, and a palette is how you reach the ones whose
 * key you have not memorised.
 *
 * Entries are built from the registries rather than typed out, so a template
 * added tomorrow appears here without anybody remembering to add it.
 */

import type { NavigateFunction } from 'react-router-dom'
import { NODE_KINDS } from '../../core/rules/invariants'
import { TEMPLATES } from '../../core/templates/registry'
import { KIND_LABEL, SHAPE_LABEL } from '../../core/vocabulary'
import { MODE_LABEL } from '../shared/labels'
import type { IconName } from '../shared/icons'
import type { RoomShape } from '../../core/model/types'
import type { SoundProfile } from '../../audio/earcons'

export interface CommandEntry {
  id: string
  label: string
  /** The group it appears under, and part of what a search matches. */
  group: string
  icon: IconName
  /** Extra words that should find this entry. Never shown. */
  keywords?: string
  /** The key that also does this, shown on the right. */
  keys?: string
  /** True when running it would change the shared document (rule 8). */
  mutates?: boolean
  /** Off when the command needs something that is not there, with a reason. */
  disabledReason?: string
  run: () => void
}

/** What the palette needs from the room, named so this file stays testable. */
export interface PaletteRoom {
  focusId: string | null
  focusTitle: string | null
  canUndo: boolean
  shape: RoomShape
  mode: 'meeting' | 'review'
  soundProfile: SoundProfile
  panelHidden: boolean
  sidebarHidden: boolean
  focusMode: boolean
  hasOverrides: boolean
  addNode: (kind: (typeof NODE_KINDS)[number]) => void
  insertTemplate: (id: string) => void
  openDialog: (kind: 'relate' | 'comment' | 'move' | 'tool' | 'delete' | 'shape' | 'share' | 'help') => void
  vote: () => void
  undo: () => void
  clearOverrides: () => void
  setShape: (shape: RoomShape) => void
  setMode: (mode: 'meeting' | 'review') => void
  setSoundProfile: (profile: SoundProfile) => void
  togglePanel: () => void
  toggleSidebar: () => void
  toggleFocusMode: () => void
  toggleTraversal: () => void
  startTalking: () => void
}

export function buildEntries(
  room: PaletteRoom,
  navigate: NavigateFunction,
  base: string,
): CommandEntry[] {
  const needsFocus = room.focusId ? undefined : 'Pilih simpul dulu.'
  const on = room.focusTitle ? ` pada "${room.focusTitle}"` : ''

  const entries: CommandEntry[] = [
    // --- making things ---
    ...NODE_KINDS.filter((kind) => kind !== 'root').map((kind) => ({
      id: `tambah-${kind}`,
      label: `Tambah ${KIND_LABEL[kind]}`,
      group: 'Buat',
      icon: 'plus' as IconName,
      keywords: `baru simpul node ${KIND_LABEL[kind]}`,
      keys: kind === 'idea' ? 'n' : undefined,
      mutates: true,
      run: () => room.addNode(kind),
    })),
    ...TEMPLATES.map((template) => ({
      id: `templat-${template.id}`,
      label: `Sisipkan ${template.label}`,
      group: 'Alat & templat',
      icon: template.icon,
      keywords: `templat alat ${template.hint}`,
      mutates: true,
      run: () => room.insertTemplate(template.id),
    })),

    // --- acting on the focused node ---
    {
      id: 'hubungkan',
      label: `Hubungkan simpul${on}`,
      group: 'Simpul terfokus',
      icon: 'link',
      keys: 'r',
      mutates: true,
      disabledReason: needsFocus,
      run: () => room.openDialog('relate'),
    },
    {
      id: 'pindah',
      label: `Pindahkan ke induk lain${on}`,
      group: 'Simpul terfokus',
      icon: 'move',
      keys: 'm',
      mutates: true,
      disabledReason: needsFocus,
      run: () => room.openDialog('move'),
    },
    {
      id: 'alat',
      label: `Jadikan alat${on}`,
      group: 'Simpul terfokus',
      icon: 'checkSquare',
      keywords: 'voting tool',
      keys: 'l',
      mutates: true,
      disabledReason: needsFocus,
      run: () => room.openDialog('tool'),
    },
    {
      id: 'pilih',
      label: `Pilih atau tarik pilihan${on}`,
      group: 'Simpul terfokus',
      icon: 'check',
      keywords: 'vote voting suara',
      keys: 'v',
      mutates: true,
      disabledReason: needsFocus,
      run: room.vote,
    },
    {
      id: 'komentar',
      label: `Tulis komentar${on}`,
      group: 'Simpul terfokus',
      icon: 'message',
      keys: 'c',
      mutates: true,
      disabledReason: needsFocus,
      run: () => room.openDialog('comment'),
    },
    {
      id: 'hapus',
      label: `Hapus simpul${on}`,
      group: 'Simpul terfokus',
      icon: 'trash',
      keys: 'Delete',
      mutates: true,
      disabledReason: needsFocus,
      run: () => room.openDialog('delete'),
    },

    // --- the room ---
    ...(['mindmap', 'hierarchy', 'flow', 'timeline', 'columns'] as RoomShape[]).map((shape) => ({
      id: `bentuk-${shape}`,
      label: `Bentuk: ${SHAPE_LABEL[shape]}`,
      group: 'Bentuk kanvas',
      icon: 'layout' as IconName,
      keywords: 'tata letak layout ganti bentuk',
      mutates: true,
      disabledReason: shape === room.shape ? 'Sudah memakai bentuk ini.' : undefined,
      run: () => room.setShape(shape),
    })),
    {
      id: 'bagikan',
      label: 'Bagikan ruang',
      group: 'Ruang',
      icon: 'share',
      keywords: 'kode tautan undang',
      run: () => room.openDialog('share'),
    },
    {
      id: 'urung',
      label: 'Batalkan perubahan terakhir',
      group: 'Ruang',
      icon: 'undo',
      keys: 'Ctrl Z',
      mutates: true,
      disabledReason: room.canUndo ? undefined : 'Belum ada yang bisa dibatalkan.',
      run: room.undo,
    },
    {
      id: 'tata-letak',
      label: 'Kembalikan ke tata letak otomatis',
      group: 'Ruang',
      icon: 'undo',
      keywords: 'reset posisi penempatan',
      disabledReason: room.hasOverrides ? undefined : 'Belum ada simpul yang digeser tangan.',
      run: room.clearOverrides,
    },

    // --- getting around ---
    { id: 'ke-kanvas', label: 'Buka kanvas', group: 'Pindah', icon: 'layout', keys: '1', run: () => navigate(base) },
    { id: 'ke-outline', label: 'Buka outline', group: 'Pindah', icon: 'list', keys: '2', run: () => navigate(`${base}/outline`) },
    { id: 'ke-perintah', label: 'Buka panel perintah', group: 'Pindah', icon: 'sparkles', keys: '3', run: () => navigate(`${base}/perintah`) },
    { id: 'ke-peserta', label: 'Buka panel peserta', group: 'Pindah', icon: 'users', run: () => navigate(`${base}/peserta`) },
    { id: 'ke-komentar', label: 'Buka panel komentar', group: 'Pindah', icon: 'message', run: () => navigate(`${base}/komentar`) },
    { id: 'ke-ringkasan', label: 'Buka ringkasan sesi', group: 'Pindah', icon: 'activity', keywords: 'kontribusi porsi', run: () => navigate(`${base}/ringkasan`) },
    { id: 'ke-pengaturan', label: 'Buka pengaturan', group: 'Pindah', icon: 'settings', keywords: 'model penyedia ollama bunyi tema', run: () => navigate(`${base}/pengaturan`) },
    { id: 'ke-dasbor', label: 'Buka daftar ruang', group: 'Pindah', icon: 'home', keywords: 'dasbor keluar', run: () => navigate('/ruang') },

    // --- voice and sound ---
    { id: 'bicara', label: 'Mulai bicara', group: 'Suara', icon: 'mic', keys: 'Spasi', keywords: 'rekam mikrofon perintah suara', run: room.startTalking },
    { id: 'telusur', label: 'Mulai atau hentikan telusur audio', group: 'Suara', icon: 'headphones', keys: '.', run: room.toggleTraversal },
    ...(['silent', 'sparse', 'full'] as SoundProfile[]).map((profile) => ({
      id: `bunyi-${profile}`,
      label: `Profil bunyi: ${profile === 'silent' ? 'Diam' : profile === 'sparse' ? 'Hemat' : 'Penuh'}`,
      group: 'Suara',
      icon: 'volume' as IconName,
      disabledReason: profile === room.soundProfile ? 'Sudah memakai profil ini.' : undefined,
      run: () => room.setSoundProfile(profile),
    })),
    ...(['meeting', 'review'] as const).map((mode) => ({
      id: `mode-${mode}`,
      label: `Mode: ${MODE_LABEL[mode]}`,
      group: 'Suara',
      icon: (mode === 'meeting' ? 'presentation' : 'eye') as IconName,
      keys: mode === 'review' ? 'Ctrl M' : undefined,
      disabledReason: mode === room.mode ? 'Sudah di mode ini.' : undefined,
      run: () => room.setMode(mode),
    })),

    // --- the view ---
    { id: 'panel', label: room.panelHidden ? 'Tampilkan panel kanan' : 'Sembunyikan panel kanan', group: 'Tampilan', icon: 'panelRight', keys: '\\', run: room.togglePanel },
    { id: 'sidebar', label: room.sidebarHidden ? 'Tampilkan navigasi kiri' : 'Sembunyikan navigasi kiri', group: 'Tampilan', icon: 'menu', keys: '[', run: room.toggleSidebar },
    { id: 'layar-penuh', label: room.focusMode ? 'Keluar dari layar penuh' : 'Kanvas layar penuh', group: 'Tampilan', icon: room.focusMode ? 'minimize' : 'maximize', keys: 'f', run: room.toggleFocusMode },
    { id: 'pintasan', label: 'Lihat semua pintasan papan ketik', group: 'Tampilan', icon: 'keyboard', keys: '?', run: () => room.openDialog('help') },
  ]

  return entries
}

/**
 * Two tiers, never a score.
 *
 * Substring matches come first, then subsequence-only ones, and within each
 * tier the registry order is untouched. Plain subsequence matching alone put
 * "Tambah langkah" above "Buka kanvas" for the query "buka", because the
 * letters happen to be scattered through it -- technically a match, useless as
 * a first result.
 *
 * What is deliberately absent is a relevance score. A palette that reorders
 * itself cleverly is one whose second entry moves while you are reaching for
 * it, and muscle memory is most of what makes a palette worth having. Two
 * stable tiers give the obvious answer first without ever shuffling.
 */
export type MatchTier = 0 | 1 | null

export function tierOf(entry: CommandEntry, query: string): MatchTier {
  const q = query.trim().toLowerCase()
  if (!q) return 0
  const hay = `${entry.label} ${entry.group} ${entry.keywords ?? ''}`.toLowerCase()
  if (hay.includes(q)) return 0
  let at = 0
  for (const char of q) {
    if (char === ' ') continue
    at = hay.indexOf(char, at)
    if (at < 0) return null
    at += 1
  }
  return 1
}

export function filterEntries(entries: CommandEntry[], query: string): CommandEntry[] {
  const near: CommandEntry[] = []
  const far: CommandEntry[] = []
  for (const entry of entries) {
    const tier = tierOf(entry, query)
    if (tier === 0) near.push(entry)
    else if (tier === 1) far.push(entry)
  }
  return [...near, ...far]
}
