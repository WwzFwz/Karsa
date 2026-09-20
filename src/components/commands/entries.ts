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
import { tr } from '../../core/i18n'
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
  const needsFocus = room.focusId ? undefined : tr('Pilih simpul dulu.', 'Select a node first.')
  /*
    The clause that names what a command would act on.

    It is built here rather than inside each label because the two languages
    put it in the same place but spell it differently, and a dozen labels each
    doing that by hand is a dozen chances to get one wrong.
  */
  const on = room.focusTitle ? tr(` pada "${room.focusTitle}"`, ` on "${room.focusTitle}"`) : ''

  // Group headings, named once: the palette groups by this exact string, so
  // a heading spelled twice would split one group into two.
  const FOCUSED = tr('Simpul terfokus', 'Focused node')
  const ROOM = tr('Ruang', 'Room')
  const GO = tr('Pindah', 'Go to')
  const VOICE = tr('Suara', 'Voice')
  const VIEW = tr('Tampilan', 'View')

  const entries: CommandEntry[] = [
    // --- making things ---
    ...NODE_KINDS.filter((kind) => kind !== 'root').map((kind) => ({
      id: `tambah-${kind}`,
      label: tr(`Tambah ${KIND_LABEL[kind]}`, `Add ${KIND_LABEL[kind].toLowerCase()}`),
      group: tr('Buat', 'Create'),
      icon: 'plus' as IconName,
      // Both languages, always: the words are never shown, and somebody
      // searching "node" should find this whether or not they switched.
      keywords: `baru simpul node new add ${KIND_LABEL[kind]}`,
      keys: kind === 'idea' ? 'n' : undefined,
      mutates: true,
      run: () => room.addNode(kind),
    })),
    ...TEMPLATES.map((template) => ({
      id: `templat-${template.id}`,
      label: tr(`Sisipkan ${template.label}`, `Insert ${template.label.toLowerCase()}`),
      group: tr('Alat & templat', 'Tools & templates'),
      icon: template.icon,
      keywords: `templat alat template tool ${template.hint}`,
      mutates: true,
      run: () => room.insertTemplate(template.id),
    })),

    // --- acting on the focused node ---
    {
      id: 'hubungkan',
      label: tr(`Hubungkan simpul${on}`, `Relate node${on}`),
      group: FOCUSED,
      icon: 'link',
      keys: 'r',
      mutates: true,
      disabledReason: needsFocus,
      run: () => room.openDialog('relate'),
    },
    {
      id: 'pindah',
      label: tr(`Pindahkan ke induk lain${on}`, `Move to another parent${on}`),
      group: FOCUSED,
      icon: 'move',
      keys: 'm',
      mutates: true,
      disabledReason: needsFocus,
      run: () => room.openDialog('move'),
    },
    {
      id: 'alat',
      label: tr(`Jadikan alat${on}`, `Turn into a tool${on}`),
      group: FOCUSED,
      icon: 'checkSquare',
      keywords: 'voting tool alat',
      keys: 'l',
      mutates: true,
      disabledReason: needsFocus,
      run: () => room.openDialog('tool'),
    },
    {
      id: 'pilih',
      label: tr(`Pilih atau tarik pilihan${on}`, `Vote or take the vote back${on}`),
      group: FOCUSED,
      icon: 'check',
      keywords: 'vote voting suara pilih',
      keys: 'v',
      mutates: true,
      disabledReason: needsFocus,
      run: room.vote,
    },
    {
      id: 'komentar',
      label: tr(`Tulis komentar${on}`, `Write a comment${on}`),
      group: FOCUSED,
      icon: 'message',
      keys: 'c',
      mutates: true,
      disabledReason: needsFocus,
      run: () => room.openDialog('comment'),
    },
    {
      id: 'hapus',
      label: tr(`Hapus simpul${on}`, `Delete node${on}`),
      group: FOCUSED,
      icon: 'trash',
      keys: 'Delete',
      mutates: true,
      disabledReason: needsFocus,
      run: () => room.openDialog('delete'),
    },

    // --- the room ---
    ...(['mindmap', 'hierarchy', 'flow', 'timeline', 'columns'] as RoomShape[]).map((shape) => ({
      id: `bentuk-${shape}`,
      label: tr(`Bentuk: ${SHAPE_LABEL[shape]}`, `Shape: ${SHAPE_LABEL[shape]}`),
      group: tr('Bentuk kanvas', 'Canvas shape'),
      icon: 'layout' as IconName,
      keywords: 'tata letak layout ganti bentuk shape',
      mutates: true,
      disabledReason:
        shape === room.shape ? tr('Sudah memakai bentuk ini.', 'Already using this shape.') : undefined,
      run: () => room.setShape(shape),
    })),
    {
      id: 'bagikan',
      label: tr('Bagikan ruang', 'Share room'),
      group: ROOM,
      icon: 'share',
      keywords: 'kode tautan undang code link invite share',
      run: () => room.openDialog('share'),
    },
    {
      id: 'urung',
      label: tr('Batalkan perubahan terakhir', 'Undo the last change'),
      group: ROOM,
      icon: 'undo',
      keys: 'Ctrl Z',
      mutates: true,
      disabledReason: room.canUndo
        ? undefined
        : tr('Belum ada yang bisa dibatalkan.', 'There is nothing to undo yet.'),
      run: room.undo,
    },
    {
      id: 'tata-letak',
      label: tr('Kembalikan ke tata letak otomatis', 'Back to the automatic layout'),
      group: ROOM,
      icon: 'undo',
      keywords: 'reset posisi penempatan layout placement',
      disabledReason: room.hasOverrides
        ? undefined
        : tr('Belum ada simpul yang digeser tangan.', 'No node has been moved by hand yet.'),
      run: room.clearOverrides,
    },

    // --- getting around ---
    { id: 'ke-kanvas', label: tr('Buka kanvas', 'Open the canvas'), group: GO, icon: 'layout', keys: '1', run: () => navigate(base) },
    { id: 'ke-outline', label: tr('Buka outline', 'Open the outline'), group: GO, icon: 'list', keys: '2', run: () => navigate(`${base}/outline`) },
    { id: 'ke-perintah', label: tr('Buka panel perintah', 'Open the command panel'), group: GO, icon: 'sparkles', keys: '3', run: () => navigate(`${base}/perintah`) },
    { id: 'ke-peserta', label: tr('Buka panel peserta', 'Open the people panel'), group: GO, icon: 'users', run: () => navigate(`${base}/peserta`) },
    { id: 'ke-komentar', label: tr('Buka panel komentar', 'Open the comments panel'), group: GO, icon: 'message', run: () => navigate(`${base}/komentar`) },
    { id: 'ke-ringkasan', label: tr('Buka ringkasan sesi', 'Open the session summary'), group: GO, icon: 'activity', keywords: 'kontribusi porsi contribution share summary', run: () => navigate(`${base}/ringkasan`) },
    { id: 'ke-pengaturan', label: tr('Buka pengaturan', 'Open settings'), group: GO, icon: 'settings', keywords: 'model penyedia ollama bunyi tema provider sound theme language bahasa', run: () => navigate(`${base}/pengaturan`) },
    { id: 'ke-dasbor', label: tr('Buka daftar ruang', 'Open the room list'), group: GO, icon: 'home', keywords: 'dasbor keluar dashboard leave', run: () => navigate('/ruang') },

    // --- voice and sound ---
    { id: 'bicara', label: tr('Mulai bicara', 'Start talking'), group: VOICE, icon: 'mic', keys: 'Spasi', keywords: 'rekam mikrofon perintah suara record microphone talk', run: room.startTalking },
    { id: 'telusur', label: tr('Mulai atau hentikan telusur audio', 'Start or stop the audio walk'), group: VOICE, icon: 'headphones', keys: '.', run: room.toggleTraversal },
    ...(['silent', 'sparse', 'full'] as SoundProfile[]).map((profile) => ({
      id: `bunyi-${profile}`,
      label: tr(
        `Profil bunyi: ${profile === 'silent' ? 'Diam' : profile === 'sparse' ? 'Hemat' : 'Penuh'}`,
        `Sound profile: ${profile === 'silent' ? 'Silent' : profile === 'sparse' ? 'Sparing' : 'Full'}`,
      ),
      group: VOICE,
      icon: 'volume' as IconName,
      disabledReason:
        profile === room.soundProfile ? tr('Sudah memakai profil ini.', 'Already using this profile.') : undefined,
      run: () => room.setSoundProfile(profile),
    })),
    ...(['meeting', 'review'] as const).map((mode) => ({
      id: `mode-${mode}`,
      label: `${tr('Mode', 'Mode')}: ${MODE_LABEL[mode]}`,
      group: VOICE,
      icon: (mode === 'meeting' ? 'presentation' : 'eye') as IconName,
      keys: mode === 'review' ? 'Ctrl M' : undefined,
      disabledReason: mode === room.mode ? tr('Sudah di mode ini.', 'Already in this mode.') : undefined,
      run: () => room.setMode(mode),
    })),

    // --- the view ---
    { id: 'panel', label: room.panelHidden ? tr('Tampilkan panel kanan', 'Show the right panel') : tr('Sembunyikan panel kanan', 'Hide the right panel'), group: VIEW, icon: 'panelRight', keys: '\\', run: room.togglePanel },
    { id: 'sidebar', label: room.sidebarHidden ? tr('Tampilkan navigasi kiri', 'Show the left navigation') : tr('Sembunyikan navigasi kiri', 'Hide the left navigation'), group: VIEW, icon: 'menu', keys: '[', run: room.toggleSidebar },
    { id: 'layar-penuh', label: room.focusMode ? tr('Keluar dari layar penuh', 'Leave full screen') : tr('Kanvas layar penuh', 'Full-screen canvas'), group: VIEW, icon: room.focusMode ? 'minimize' : 'maximize', keys: 'f', run: room.toggleFocusMode },
    { id: 'pintasan', label: tr('Lihat semua pintasan papan ketik', 'See every keyboard shortcut'), group: VIEW, icon: 'keyboard', keys: '?', run: () => room.openDialog('help') },
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
