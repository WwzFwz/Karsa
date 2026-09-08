/**
 * Sample data. Everything here is fake, but it is shaped exactly like the real
 * document so the interface cannot be built on assumptions that only hold for
 * pretty data: there are questions without answers, an action already done, a
 * relation that crosses branches, and an unresolved comment.
 */

import type {
  Actor,
  Comment,
  Node,
  NodeKind,
  NodeState,
  Participant,
  Relation,
  RelationKind,
  RoomDoc,
} from '../../core/model/types'
import type { DocEvent, EventType } from '../../core/events/types'
import type { InputPath } from '../../core/model/types'

const ORDER_KEYS = 'abcdefghijklmnopqrstuvwxyz'
const MINUTE = 60_000

export const SELF_ID = 'a_anda'

export const ACTORS: Record<string, Actor> = {
  a_rina: { id: 'a_rina', displayName: 'Rina Halimah', hue: 268 },
  a_budi: { id: 'a_budi', displayName: 'Budi Santoso', hue: 24 },
  a_sari: { id: 'a_sari', displayName: 'Sari Wulandari', hue: 152 },
  a_teguh: { id: 'a_teguh', displayName: 'Teguh Prasetyo', hue: 202 },
  [SELF_ID]: { id: SELF_ID, displayName: 'Anda', hue: 340 },
}

interface SeedRow {
  id: string
  parent: string | null
  kind: NodeKind
  title: string
  by: string
  path: InputPath
  note?: string
  state?: NodeState
  minutesAgo: number
}

const ROWS: SeedRow[] = [
  { id: 'n_akar', parent: null, kind: 'root', title: 'Kurikulum Semester Genap', by: 'a_teguh', path: 'keyboard', minutesAgo: 42 },

  { id: 'n_riset', parent: 'n_akar', kind: 'group', title: 'Riset kebutuhan', by: 'a_teguh', path: 'keyboard', minutesAgo: 41 },
  { id: 'n_wawancara', parent: 'n_riset', kind: 'fact', title: 'Wawancara 12 mahasiswa', by: 'a_sari', path: 'voice', minutesAgo: 38, note: 'Delapan dari dua belas menyebut jadwal praktikum bertabrakan dengan mata kuliah wajib.' },
  { id: 'n_survei', parent: 'n_riset', kind: 'fact', title: 'Survei kelulusan 2025', by: 'a_sari', path: 'voice', minutesAgo: 37 },
  { id: 'n_putus', parent: 'n_riset', kind: 'fact', title: 'Tingkat putus mata kuliah 18 persen', by: 'a_rina', path: 'keyboard', minutesAgo: 35 },

  { id: 'n_rancang', parent: 'n_akar', kind: 'group', title: 'Rancangan mata kuliah', by: 'a_teguh', path: 'keyboard', minutesAgo: 34 },
  { id: 'n_gabung', parent: 'n_rancang', kind: 'decision', title: 'Gabungkan Basis Data dan Sistem Informasi', by: 'a_budi', path: 'voice', minutesAgo: 31 },
  { id: 'n_praktikum', parent: 'n_rancang', kind: 'idea', title: 'Tambah praktikum aksesibilitas', by: 'a_rina', path: 'voice', minutesAgo: 29, note: 'Satu SKS, wajib bagi peminatan rekayasa perangkat lunak.' },
  { id: 'n_bobot', parent: 'n_rancang', kind: 'idea', title: 'Kurangi bobot ujian akhir', by: 'a_budi', path: 'voice', minutesAgo: 27 },

  { id: 'n_rencana', parent: 'n_akar', kind: 'group', title: 'Rencana pelaksanaan', by: 'a_teguh', path: 'keyboard', minutesAgo: 24 },
  { id: 'n_silabus', parent: 'n_rencana', kind: 'step', title: 'Susun silabus', by: 'a_teguh', path: 'keyboard', minutesAgo: 23 },
  { id: 'n_latih', parent: 'n_rencana', kind: 'step', title: 'Latih asisten praktikum', by: 'a_teguh', path: 'keyboard', minutesAgo: 22 },
  { id: 'n_ujicoba', parent: 'n_rencana', kind: 'step', title: 'Uji coba satu kelas', by: 'a_sari', path: 'voice', minutesAgo: 20 },
  { id: 'n_evaluasi', parent: 'n_rencana', kind: 'step', title: 'Evaluasi tengah semester', by: 'a_sari', path: 'voice', minutesAgo: 19 },

  { id: 'n_belum', parent: 'n_akar', kind: 'group', title: 'Hal yang belum jelas', by: 'a_rina', path: 'keyboard', minutesAgo: 16 },
  { id: 'n_anggaran', parent: 'n_belum', kind: 'question', title: 'Anggaran laboratorium belum pasti', by: 'a_rina', path: 'keyboard', minutesAgo: 15 },
  { id: 'n_pengampu', parent: 'n_belum', kind: 'question', title: 'Siapa pengampu praktikum aksesibilitas', by: 'a_budi', path: 'voice', minutesAgo: 13 },

  { id: 'n_lanjut', parent: 'n_akar', kind: 'group', title: 'Tindak lanjut', by: 'a_teguh', path: 'keyboard', minutesAgo: 9 },
  { id: 'n_vendor', parent: 'n_lanjut', kind: 'action', title: 'Hubungi vendor perangkat braille', by: 'a_rina', path: 'voice', state: 'open', minutesAgo: 7 },
  { id: 'n_draf', parent: 'n_lanjut', kind: 'action', title: 'Kirim draf ke ketua program studi', by: 'a_teguh', path: 'keyboard', state: 'done', minutesAgo: 4 },
]

interface SeedRelation {
  id: string
  from: string
  to: string
  kind: RelationKind
  label?: string
  by: string
  minutesAgo: number
}

const RELATIONS: SeedRelation[] = [
  { id: 'r_s1', from: 'n_silabus', to: 'n_latih', kind: 'sequence', by: 'a_teguh', minutesAgo: 21 },
  { id: 'r_s2', from: 'n_latih', to: 'n_ujicoba', kind: 'sequence', by: 'a_teguh', minutesAgo: 21 },
  { id: 'r_s3', from: 'n_ujicoba', to: 'n_evaluasi', kind: 'sequence', by: 'a_sari', minutesAgo: 18 },
  { id: 'r_d1', from: 'n_praktikum', to: 'n_anggaran', kind: 'depends_on', label: 'menunggu rapat anggaran', by: 'a_rina', minutesAgo: 14 },
  { id: 'r_c1', from: 'n_putus', to: 'n_bobot', kind: 'causes', by: 'a_budi', minutesAgo: 26 },
  { id: 'r_r1', from: 'n_gabung', to: 'n_survei', kind: 'refers_to', by: 'a_budi', minutesAgo: 30 },
]

interface SeedComment {
  id: string
  target: string
  body: string
  by: string
  replyTo?: string
  minutesAgo: number
  resolvedBy?: string
}

const COMMENTS: SeedComment[] = [
  { id: 'c_1', target: 'n_anggaran', by: 'a_rina', minutesAgo: 14, body: 'Kalau anggarannya belum pasti, praktikumnya jangan dijanjikan ke mahasiswa dulu.' },
  { id: 'c_2', target: 'n_anggaran', by: 'a_teguh', replyTo: 'c_1', minutesAgo: 12, body: 'Setuju. Saya tanyakan ke bagian keuangan minggu ini.' },
  { id: 'c_3', target: 'n_gabung', by: 'a_sari', minutesAgo: 28, body: 'Perlu dicek beban SKS-nya sebelum diputuskan.' },
  { id: 'c_4', target: 'n_bobot', by: 'a_budi', minutesAgo: 25, body: 'Berapa persen yang wajar? 30 atau 40?' },
  { id: 'c_5', target: 'n_draf', by: 'a_teguh', minutesAgo: 3, body: 'Sudah dikirim tadi pagi.', resolvedBy: 'a_teguh' },
]

/** Extra events that carry no structural change but belong in the log. */
const EXTRA_EVENTS: { type: EventType; by: string; path: InputPath; minutesAgo: number; payload: Record<string, unknown> }[] = [
  { type: 'setNodeState', by: 'a_teguh', path: 'keyboard', minutesAgo: 3, payload: { nodeId: 'n_draf', title: 'Kirim draf ke ketua program studi', state: 'done' } },
  { type: 'setRoomShape', by: 'a_sari', path: 'keyboard', minutesAgo: 17, payload: { shape: 'mindmap', previousShape: 'hierarchy' } },
  { type: 'renameNode', by: 'a_rina', path: 'voice', minutesAgo: 11, payload: { nodeId: 'n_anggaran', title: 'Anggaran laboratorium belum pasti', previousTitle: 'Anggaran lab' } },
]

export function buildSeedDoc(now = Date.now()): RoomDoc {
  const nodes: Record<string, Node> = {}
  const orderCounter = new Map<string, number>()

  for (const row of ROWS) {
    const parentKey = row.parent ?? '__root__'
    const index = orderCounter.get(parentKey) ?? 0
    orderCounter.set(parentKey, index + 1)
    const at = now - row.minutesAgo * MINUTE
    nodes[row.id] = {
      id: row.id,
      parentId: row.parent,
      order: ORDER_KEYS[index] ?? 'z',
      kind: row.kind,
      title: row.title,
      note: row.note,
      state: row.state,
      createdBy: row.by,
      createdAt: at,
      updatedBy: row.by,
      updatedAt: at,
      inputPath: row.path,
    }
  }

  const relations: Record<string, Relation> = {}
  for (const r of RELATIONS) {
    relations[r.id] = {
      id: r.id,
      fromId: r.from,
      toId: r.to,
      kind: r.kind,
      label: r.label,
      createdBy: r.by,
      createdAt: now - r.minutesAgo * MINUTE,
      inputPath: 'keyboard',
    }
  }

  const comments: Record<string, Comment> = {}
  for (const c of COMMENTS) {
    comments[c.id] = {
      id: c.id,
      targetType: 'node',
      targetId: c.target,
      replyToId: c.replyTo,
      body: c.body,
      authorId: c.by,
      createdAt: now - c.minutesAgo * MINUTE,
      resolvedAt: c.resolvedBy ? now - (c.minutesAgo - 1) * MINUTE : undefined,
      resolvedBy: c.resolvedBy,
    }
  }

  const raw: Omit<DocEvent, 'id' | 'seq'>[] = []

  for (const row of ROWS) {
    raw.push({
      at: now - row.minutesAgo * MINUTE,
      actorId: row.by,
      inputPath: row.path,
      type: 'createNode',
      origin: 'user',
      payload: {
        nodeId: row.id,
        title: row.title,
        kind: row.kind,
        parentTitle: row.parent ? ROWS.find((r) => r.id === row.parent)?.title : undefined,
      },
    })
  }
  for (const r of RELATIONS) {
    raw.push({
      at: now - r.minutesAgo * MINUTE,
      actorId: r.by,
      inputPath: 'keyboard',
      type: 'addRelation',
      origin: 'user',
      payload: {
        fromTitle: ROWS.find((x) => x.id === r.from)?.title,
        toTitle: ROWS.find((x) => x.id === r.to)?.title,
        relationKind: r.kind,
      },
    })
  }
  for (const c of COMMENTS) {
    raw.push({
      at: now - c.minutesAgo * MINUTE,
      actorId: c.by,
      inputPath: 'keyboard',
      type: 'addComment',
      origin: 'user',
      payload: { targetTitle: ROWS.find((x) => x.id === c.target)?.title },
    })
  }
  for (const e of EXTRA_EVENTS) {
    raw.push({
      at: now - e.minutesAgo * MINUTE,
      actorId: e.by,
      inputPath: e.path,
      type: e.type,
      origin: 'user',
      payload: e.payload,
    })
  }

  raw.sort((a, b) => a.at - b.at)
  const events: DocEvent[] = raw.map((e, i) => ({ ...e, id: `e_seed_${i + 1}`, seq: i + 1 }))

  return {
    room: {
      id: 'KUR-482',
      title: 'Rapat Kurikulum Semester Genap',
      shape: 'mindmap',
      createdAt: now - 45 * MINUTE,
    },
    nodes,
    relations,
    comments,
    events,
    actors: ACTORS,
  }
}

/**
 * A room that was made a minute ago, not the demo one.
 *
 * It carries exactly one node -- a root named after the room -- because a canvas
 * with nothing on it has nothing to focus, nothing to read out, and nothing to
 * hang the first spoken sentence on. One root is the smallest honest starting
 * point, and it is a real event in the log so the room's history begins where
 * the room did.
 */
export function buildEmptyDoc(id: string, title: string, now = Date.now()): RoomDoc {
  const root: Node = {
    id: 'n_akar',
    parentId: null,
    order: 'a',
    kind: 'root',
    title,
    createdBy: SELF_ID,
    createdAt: now,
    updatedBy: SELF_ID,
    updatedAt: now,
    inputPath: 'keyboard',
  }
  return {
    room: { id, title, shape: 'mindmap', createdAt: now },
    nodes: { [root.id]: root },
    relations: {},
    comments: {},
    events: [
      {
        id: 'e_root',
        seq: 1,
        type: 'createNode',
        at: now,
        actorId: SELF_ID,
        inputPath: 'keyboard',
        origin: 'user',
        payload: { nodeId: root.id, title },
      },
    ],
    actors: { [SELF_ID]: ACTORS[SELF_ID] },
  }
}

/** A new room has one person in it, and it is you. */
export function buildSoloParticipants(selfName: string, now = Date.now()): Participant[] {
  return [
    {
      actorId: SELF_ID,
      displayName: selfName,
      hue: ACTORS[SELF_ID].hue,
      talking: false,
      focusNodeId: 'n_akar',
      pointingNodeId: null,
      mode: 'meeting',
      online: true,
      lastSeen: now,
    },
  ]
}

export function buildSeedParticipants(selfName: string, now = Date.now()): Participant[] {
  return [
    {
      actorId: SELF_ID,
      displayName: selfName,
      hue: ACTORS[SELF_ID].hue,
      talking: false,
      focusNodeId: 'n_akar',
      pointingNodeId: null,
      mode: 'meeting',
      online: true,
      lastSeen: now,
    },
    {
      actorId: 'a_rina',
      displayName: ACTORS.a_rina.displayName,
      hue: ACTORS.a_rina.hue,
      talking: false,
      focusNodeId: 'n_anggaran',
      pointingNodeId: 'n_anggaran',
      mode: 'meeting',
      online: true,
      lastSeen: now,
    },
    {
      actorId: 'a_budi',
      displayName: ACTORS.a_budi.displayName,
      hue: ACTORS.a_budi.hue,
      talking: true,
      focusNodeId: 'n_bobot',
      pointingNodeId: 'n_bobot',
      mode: 'meeting',
      online: true,
      lastSeen: now,
    },
    {
      actorId: 'a_sari',
      displayName: ACTORS.a_sari.displayName,
      hue: ACTORS.a_sari.hue,
      talking: false,
      focusNodeId: 'n_ujicoba',
      pointingNodeId: null,
      mode: 'review',
      online: true,
      lastSeen: now,
    },
    {
      actorId: 'a_teguh',
      displayName: ACTORS.a_teguh.displayName,
      hue: ACTORS.a_teguh.hue,
      talking: false,
      focusNodeId: 'n_draf',
      pointingNodeId: null,
      mode: 'meeting',
      online: false,
      lastSeen: now - 6 * MINUTE,
    },
  ]
}
